import { NextRequest, NextResponse } from 'next/server';
import { MediaState, Participant, ChatMessage, KosmiAppId } from '@/types';

interface ServerParticipant extends Participant {
  lastHeartbeat: number;
}

interface ServerRoomSession {
  roomId: string;
  mediaState: MediaState;
  currentApp: KosmiAppId;
  participants: Map<string, ServerParticipant>;
  messages: ChatMessage[];
  reactions?: Array<{
    id: string;
    emoji: string;
    senderName: string;
    senderId: string;
    timestamp: number;
  }>;
  sounds?: Array<{
    id: string;
    soundId: string;
    soundName: string;
    senderName: string;
    senderId: string;
    timestamp: number;
  }>;
  lastUpdated: number;
}

// Global in-memory room store (preserved across requests & Next.js hot-reloads)
const globalRooms = (globalThis as any)._cinemeshRooms || ((globalThis as any)._cinemeshRooms = new Map<string, ServerRoomSession>());

function getOrCreateRoom(roomId: string, initialMedia?: Partial<MediaState>, initialApp?: KosmiAppId): ServerRoomSession {
  let room = globalRooms.get(roomId);
  if (!room) {
    const isFb = Boolean(initialMedia?.url?.includes('facebook.com') || initialMedia?.url?.includes('share.google'));
    const hasInitial = Boolean(initialMedia?.url && !isFb);
    room = {
      roomId,
      mediaState: {
        url: hasInitial ? initialMedia!.url! : '/movies/dance-amigo.mp4',
        title: hasInitial ? (initialMedia!.title || 'Hindi Movie') : 'Shinchan: Dance Amigo (Hindi Dubbed)',
        embedUrl: '',
        playing: initialMedia?.playing ?? true,
        currentTime: initialMedia?.currentTime ?? 0,
        duration: initialMedia?.duration ?? 5505,
        playbackRate: 1,
        hostId: initialMedia?.hostId || '',
        lastUpdated: 0,
        isFacebook: false,
      },
      currentApp: (initialApp === 'facebook' || isFb) ? 'youtube' : (initialApp || 'youtube'),
      participants: new Map<string, ServerParticipant>(),
      messages: [],
      reactions: [],
      sounds: [],
      lastUpdated: 0,
    };
    globalRooms.set(roomId, room);
  } else if (room.mediaState && (room.mediaState.isFacebook || room.mediaState.url.includes('facebook.com') || room.mediaState.url.includes('share.google'))) {
    room.mediaState.url = '/movies/dance-amigo.mp4';
    room.mediaState.title = 'Shinchan: Dance Amigo (Hindi Dubbed)';
    room.mediaState.isFacebook = false;
    room.mediaState.embedUrl = '';
    room.mediaState.duration = 5505;
    room.currentApp = 'youtube';
  }
  return room;
}

function pruneInactive(room: ServerRoomSession) {
  const now = Date.now();
  const toDelete: string[] = [];
  room.participants.forEach((p, id) => {
    // 25-second grace period for heartbeats to prevent premature pruning during network jitter or background tab throttling
    if (now - p.lastHeartbeat > 25000) {
      toDelete.push(id);
    }
  });
  toDelete.forEach((id) => room.participants.delete(id));

  // If host was removed or timed out, promote the earliest active participant to host
  const hasHost = Array.from(room.participants.values()).some((p) => p.isHost);
  if (!hasHost && room.participants.size > 0) {
    const firstParticipant = room.participants.values().next().value;
    if (firstParticipant) {
      firstParticipant.isHost = true;
      if (room.mediaState) {
        room.mediaState.hostId = firstParticipant.id;
      }
      room.lastUpdated = Date.now();
    }
  }
}

// Timeout helper: guarantees Blobs operations never hang the Lambda runtime
function withTimeout<T>(promise: Promise<T>, ms = 500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Blobs timeout')), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function syncFromBlob(roomId: string, room: ServerRoomSession) {
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore({
      name: 'cinemesh_rooms',
      siteID: process.env.NETLIFY_SITE_ID || 'a42d2836-3351-4023-8946-77d80be6dfdf',
      token: process.env.NETLIFY_AUTH_TOKEN,
    });
    const data: any = await withTimeout(store.get(roomId, { type: 'json' }), 500);
    if (data && data.participants) {
      Object.entries(data.participants).forEach(([id, p]: [string, any]) => {
        const local = room.participants.get(id);
        if (!local || p.lastHeartbeat > local.lastHeartbeat) {
          room.participants.set(id, p);
        }
      });
      if (data.mediaState && data.mediaState.url) {
        if (!room.mediaState.lastUpdated || data.mediaState.lastUpdated >= room.mediaState.lastUpdated || room.participants.size === 0) {
          room.mediaState = data.mediaState;
        }
      }
      if (data.currentApp) {
        room.currentApp = data.currentApp;
      }
      if (Array.isArray(data.messages) && data.messages.length > room.messages.length) {
        room.messages = data.messages;
      }
      if (Array.isArray(data.reactions) && data.reactions.length > 0) {
        const existingRxIds = new Set((room.reactions || []).map((r) => r.id));
        const newReactions = data.reactions.filter((r: any) => !existingRxIds.has(r.id) && Date.now() - r.timestamp < 10000);
        if (newReactions.length > 0) {
          room.reactions = [...(room.reactions || []), ...newReactions].slice(-50);
        }
      }
      if (Array.isArray(data.sounds) && data.sounds.length > 0) {
        const existingSndIds = new Set((room.sounds || []).map((s) => s.id));
        const newSounds = data.sounds.filter((s: any) => !existingSndIds.has(s.id) && Date.now() - s.timestamp < 10000);
        if (newSounds.length > 0) {
          room.sounds = [...(room.sounds || []), ...newSounds].slice(-50);
        }
      }
    }
  } catch (e) {
    // Non-blocking fallback to in-memory store
  }
}

async function syncToBlob(room: ServerRoomSession) {
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore({
      name: 'cinemesh_rooms',
      siteID: process.env.NETLIFY_SITE_ID || 'a42d2836-3351-4023-8946-77d80be6dfdf',
      token: process.env.NETLIFY_AUTH_TOKEN,
    });
    const serializableParticipants: Record<string, ServerParticipant> = {};
    room.participants.forEach((p, id) => {
      serializableParticipants[id] = p;
    });
    await withTimeout(
      store.setJSON(room.roomId, {
        roomId: room.roomId,
        mediaState: room.mediaState,
        currentApp: room.currentApp,
        participants: serializableParticipants,
        messages: room.messages.slice(-50),
        reactions: (room.reactions || []).filter((r) => Date.now() - r.timestamp < 10000),
        sounds: (room.sounds || []).filter((s) => Date.now() - s.timestamp < 10000),
        lastUpdated: room.lastUpdated,
      }),
      500
    );
  } catch (e) {
    // Non-blocking fallback
  }
}

function getParticipantList(room: ServerRoomSession): Participant[] {
  const list: Participant[] = [];
  room.participants.forEach((p) => {
    const { lastHeartbeat, ...rest } = p;
    list.push({
      ...rest,
      peerId: rest.peerId || `cm_${room.roomId}_${rest.id}`,
    });
  });
  return list;
}

function getLiveMediaState(mediaState: MediaState): MediaState {
  if (!mediaState.playing || !mediaState.lastUpdated) return mediaState;
  const elapsed = (Date.now() - mediaState.lastUpdated) / 1000;
  const adjustedTime = mediaState.duration > 0
    ? Math.min(mediaState.duration, mediaState.currentTime + elapsed)
    : mediaState.currentTime + elapsed;
  return {
    ...mediaState,
    currentTime: Math.max(0, adjustedTime),
    lastUpdated: mediaState.lastUpdated,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rawId = resolvedParams.id || '';
    const roomId = decodeURIComponent(rawId).toLowerCase().trim().replace(/[^a-z0-9-]/g, '') || 'default-room';

    const room = getOrCreateRoom(roomId);
    await syncFromBlob(roomId, room);
    pruneInactive(room);

    // If room has participants but no host is active, ensure the first one is host
    const hasHost = Array.from(room.participants.values()).some((p) => p.isHost);
    if (!hasHost && room.participants.size > 0) {
      const first = room.participants.values().next().value;
      if (first) {
        first.isHost = true;
        if (room.mediaState) room.mediaState.hostId = first.id;
      }
    }

    const participantList = getParticipantList(room);

    return NextResponse.json({
      roomId,
      mediaState: getLiveMediaState(room.mediaState),
      currentApp: room.currentApp,
      participants: participantList,
      messages: room.messages.slice(-50),
      reactions: (room.reactions || []).filter((r) => Date.now() - r.timestamp < 6000),
      sounds: (room.sounds || []).filter((s) => Date.now() - s.timestamp < 6000),
      lastUpdated: room.lastUpdated,
    });
  } catch (err) {
    console.warn('GET room handler error:', err);
    return NextResponse.json({
      roomId: 'default-room',
      mediaState: {
        url: '/movies/dance-amigo.mp4',
        title: 'Shinchan: Dance Amigo (Hindi Dubbed)',
        embedUrl: '',
        playing: true,
        currentTime: 0,
        duration: 5505,
        playbackRate: 1,
        hostId: '',
        lastUpdated: 0,
        isFacebook: false,
      },
      currentApp: 'youtube',
      participants: [],
      messages: [],
      lastUpdated: 0,
    });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rawId = resolvedParams.id || '';
    const roomId = decodeURIComponent(rawId).toLowerCase().trim().replace(/[^a-z0-9-]/g, '') || 'default-room';

    const body = await req.json().catch(() => ({}));
    const { action, participant, mediaState, currentApp, message, reaction, sound, senderId, currentTime, playing, duration } = body;

    const room = getOrCreateRoom(
      roomId,
      // Only use initialMedia if room is completely new and empty
      globalRooms.has(roomId) ? undefined : mediaState,
      globalRooms.has(roomId) ? undefined : currentApp
    );

    await syncFromBlob(roomId, room);

    // 1. Prune inactive/disconnected participants first
    pruneInactive(room);

    // 2. Explicit Leave (fast failover when host or guest leaves/closes tab)
    if (action === 'leave' && senderId) {
      room.participants.delete(senderId);
      pruneInactive(room);
      room.lastUpdated = Date.now();
    }

    let senderIsHost = false;

    // 3. Participant registration & heartbeat
    if (action !== 'leave' && participant && participant.id) {
      const existing = room.participants.get(participant.id);
      const otherActiveHost = Array.from(room.participants.values()).some(
        (p) => p.id !== participant.id && p.isHost
      );
      // Only the room creator or sole active participant is host; newcomers entering an existing room are guests
      senderIsHost = existing
        ? Boolean(existing.isHost && (!otherActiveHost || existing.id === room.mediaState.hostId))
        : !otherActiveHost;

      room.participants.set(participant.id, {
        ...existing,
        ...participant,
        peerId: participant.peerId || existing?.peerId || `cm_${roomId}_${participant.id}`,
        isHost: senderIsHost,
        lastHeartbeat: Date.now(),
      });

      if (senderIsHost && room.mediaState) {
        if (!room.mediaState.hostId) {
          room.mediaState.hostId = participant.id;
        }
        if (mediaState && mediaState.url && (!room.mediaState.lastUpdated || room.mediaState.lastUpdated === 0)) {
          room.mediaState = {
            ...room.mediaState,
            ...mediaState,
            hostId: participant.id,
            lastUpdated: Date.now(),
          };
          if (currentApp) room.currentApp = currentApp;
          room.lastUpdated = Date.now();
        }
      }
    } else if (senderId) {
      const sender = room.participants.get(senderId);
      if (sender) {
        senderIsHost = sender.isHost;
      }
    }

    // 3. Media State Update (Only Host can pause/seek/change movie)
    if (action === 'media_update' && mediaState) {
      if (senderIsHost) {
        room.mediaState = {
          ...room.mediaState,
          ...mediaState,
          lastUpdated: Date.now(),
        };
        room.lastUpdated = Date.now();
      }
    }

    // 4. Live Continuous Playback Time Synchronization from Host
    if (typeof currentTime === 'number' && !isNaN(currentTime)) {
      // Only verified room host can update playback time or seek
      if (senderIsHost) {
        room.mediaState.currentTime = currentTime;
        if (typeof playing === 'boolean') {
          room.mediaState.playing = playing;
        }
        if (typeof duration === 'number' && duration > 0 && (!room.mediaState.duration || room.mediaState.duration === 0)) {
          room.mediaState.duration = duration;
        }
        room.mediaState.lastUpdated = Date.now();
        room.lastUpdated = Date.now();
      }
    }

    // 5. App / Mode Change
    if (action === 'app_change' && currentApp) {
      room.currentApp = currentApp;
      room.lastUpdated = Date.now();
    }

    // 6. Chat message
    if (action === 'chat' && message) {
      room.messages.push(message);
      if (room.messages.length > 100) {
        room.messages = room.messages.slice(-100);
      }
    }

    // 7. Flying Reaction
    if (action === 'reaction' && reaction) {
      if (!room.reactions) room.reactions = [];
      room.reactions.push(reaction);
      const cutoff = Date.now() - 10000;
      room.reactions = room.reactions.filter((r) => r.timestamp > cutoff).slice(-50);
    }

    // 8. Sound Effect Trigger
    if (action === 'sound' && sound) {
      if (!room.sounds) room.sounds = [];
      room.sounds.push(sound);
      const cutoff = Date.now() - 10000;
      room.sounds = room.sounds.filter((s) => s.timestamp > cutoff).slice(-50);
    }

    pruneInactive(room);

    // Only persist to Netlify Blobs on state mutations to conserve Netlify Blobs free-tier quota
    const shouldPersist =
      action === 'media_update' ||
      action === 'app_change' ||
      action === 'join' ||
      action === 'leave' ||
      action === 'chat' ||
      (action === 'reaction' && reaction) ||
      (action === 'sound' && sound);

    if (shouldPersist) {
      await syncToBlob(room);
    }

    const participantList = getParticipantList(room);

    return NextResponse.json({
      success: true,
      roomId,
      mediaState: getLiveMediaState(room.mediaState),
      currentApp: room.currentApp,
      participants: participantList,
      messages: room.messages.slice(-50),
      reactions: (room.reactions || []).filter((r) => Date.now() - r.timestamp < 6000),
      sounds: (room.sounds || []).filter((s) => Date.now() - s.timestamp < 6000),
      lastUpdated: room.lastUpdated,
    });
  } catch (err) {
    console.warn('POST room handler error:', err);
    return NextResponse.json({
      success: true,
      roomId: 'default-room',
      mediaState: {
        url: '/movies/dance-amigo.mp4',
        title: 'Shinchan: Dance Amigo (Hindi Dubbed)',
        embedUrl: '',
        playing: true,
        currentTime: 0,
        duration: 5505,
        playbackRate: 1,
        hostId: '',
        lastUpdated: 0,
        isFacebook: false,
      },
      currentApp: 'youtube',
      participants: [],
      messages: [],
      reactions: [],
      sounds: [],
      lastUpdated: 0,
    });
  }
}
