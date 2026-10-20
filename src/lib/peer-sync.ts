import { PeerSyncMessage, Participant, MediaState, StageMode, KosmiAppId, ChatMessage } from '@/types';

type MessageCallback = (message: PeerSyncMessage) => void;
type RemoteStreamCallback = (peerId: string, stream: MediaStream) => void;

export interface RoomSyncData {
  roomId: string;
  mediaState: MediaState;
  currentApp: KosmiAppId;
  participants: Participant[];
  messages: ChatMessage[];
  reactions?: Array<{
    id: string;
    emoji: string;
    senderName: string;
    senderId?: string;
    timestamp: number;
  }>;
  sounds?: Array<{
    id: string;
    soundId: string;
    soundName: string;
    senderName: string;
    senderId?: string;
    timestamp: number;
  }>;
  lastUpdated: number;
}

export class MeshRoomSignaling {
  private roomId: string;
  private myId: string;
  private currentUser: Participant | null = null;
  private peer: any = null;
  private connections: Map<string, any> = new Map();
  private mediaCalls: Map<string, any> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private localStream: MediaStream | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private pollInterval: any = null;
  private keepaliveInterval: any = null;
  private isDestroyed = false;
  private hasLeft = false;
  private currentPlayTime = 0;
  private isCurrentlyPlaying = false;
  private currentDuration = 0;

  private onMessageCallbacks: Set<MessageCallback> = new Set();
  private onPeerJoinCallbacks: Set<(peerId: string) => void> = new Set();
  private onPeerLeaveCallbacks: Set<(peerId: string) => void> = new Set();
  private onRemoteStreamCallbacks: Set<RemoteStreamCallback> = new Set();
  private onRemoteStreamEndCallbacks: Set<(peerId: string) => void> = new Set();
  private onSyncCallbacks: Set<(data: RoomSyncData) => void> = new Set();

  private handleBeforeUnload = () => {
    this.handleLeave();
  };

  constructor(roomId: string, myId: string) {
    this.roomId = roomId.toLowerCase().trim().replace(/[^a-z0-9-]/g, '') || 'default-room';
    this.myId = myId;

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      window.addEventListener('pagehide', this.handleBeforeUnload);
    }

    // 1. Instant local BroadcastChannel for same-origin tabs
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`cinemesh_${this.roomId}`);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.senderId !== this.myId) {
            this.notifyMessage(event.data);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }
  }

  // Update current live media playback progress so periodic heartbeats continuously keep room in sync
  public setLocalMediaTime(time: number, playing: boolean, duration?: number) {
    this.currentPlayTime = time;
    this.isCurrentlyPlaying = playing;
    if (typeof duration === 'number' && duration > 0) {
      this.currentDuration = duration;
    }
  }

  // Set the current user and start server-side room synchronization
  public initSync(user: Participant, initialMedia?: Partial<MediaState>, initialApp?: KosmiAppId) {
    this.currentUser = user;

    // 1. Immediate registration on the room server
    const register = async () => {
      try {
        const res = await fetch(`/api/room/${encodeURIComponent(this.roomId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'join',
            participant: user,
            mediaState: initialMedia,
            currentApp: initialApp,
          }),
        });
        if (res.ok) {
          const data: RoomSyncData = await res.json();
          this.notifySync(data);
        }
      } catch (e) {
        console.warn('Initial room registration error:', e);
      }
    };

    register();

    // 2. Announce presence to local BroadcastChannel
    this.broadcast({
      type: 'PARTICIPANT_UPDATE',
      payload: {
        action: 'join',
        name: user.name,
        avatar: user.avatar,
        color: user.color,
        isAudioMuted: user.isAudioMuted,
        isVideoMuted: user.isVideoMuted,
      },
      senderId: this.myId,
      timestamp: Date.now(),
    });

    // 3. Periodic heartbeat & sync polling (5 seconds to drastically reduce Netlify function invocations)
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(async () => {
      await this.triggerSync();
    }, 5000);

    // 4. WebRTC NAT Keepalive Ping (prevents 30s-60s firewall UDP pinhole expiration)
    if (this.keepaliveInterval) clearInterval(this.keepaliveInterval);
    this.keepaliveInterval = setInterval(() => {
      if (!this.isDestroyed) {
        this.broadcast({
          type: 'PING' as any,
          payload: {},
          senderId: this.myId,
          timestamp: Date.now(),
        });
      }
    }, 10000);
  }

  // Manually trigger an immediate room sync (e.g. when a peer/host leaves)
  public async triggerSync(): Promise<RoomSyncData | null> {
    if (this.isDestroyed || !this.currentUser) return null;
    try {
      const res = await fetch(`/api/room/${encodeURIComponent(this.roomId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'heartbeat',
          participant: this.currentUser,
          currentTime: this.currentUser?.isHost ? this.currentPlayTime : undefined,
          playing: this.currentUser?.isHost ? this.isCurrentlyPlaying : undefined,
          duration: this.currentUser?.isHost ? this.currentDuration : undefined,
        }),
      });
      if (res.ok) {
        const data: RoomSyncData = await res.json();
        this.notifySync(data);
        return data;
      }
    } catch (e) {
      // Fallback gracefully
    }
    return null;
  }

  // Notify server of media state change (play, pause, seek, movie switch)
  public async notifyMediaUpdate(mediaState: Partial<MediaState>, currentApp?: KosmiAppId) {
    if (typeof mediaState.currentTime === 'number') {
      this.currentPlayTime = mediaState.currentTime;
    }
    if (typeof mediaState.playing === 'boolean') {
      this.isCurrentlyPlaying = mediaState.playing;
    }
    if (typeof mediaState.duration === 'number') {
      this.currentDuration = mediaState.duration;
    }

    try {
      await fetch(`/api/room/${encodeURIComponent(this.roomId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'media_update',
          mediaState,
          currentApp,
          currentTime: this.currentPlayTime,
          playing: this.isCurrentlyPlaying,
          duration: this.currentDuration,
          senderId: this.myId,
        }),
      });
    } catch (e) {
      console.warn('Could not update server media state:', e);
    }
  }

  // Notify server of app change
  public async notifyAppChange(currentApp: KosmiAppId, mediaState?: Partial<MediaState>) {
    try {
      await fetch(`/api/room/${encodeURIComponent(this.roomId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'app_change',
          currentApp,
          mediaState,
          senderId: this.myId,
        }),
      });
    } catch (e) {
      console.warn('Could not update server app change:', e);
    }
  }

  // Post chat message to room server
  public async notifyChatMessage(message: ChatMessage) {
    try {
      await fetch(`/api/room/${encodeURIComponent(this.roomId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message,
          senderId: this.myId,
        }),
      });
    } catch (e) {
      console.warn('Could not save chat message on server:', e);
    }
  }

  // Post flying emote reaction to room server for guaranteed cross-device delivery
  public async notifyReaction(reaction: { id: string; emoji: string; senderName: string; senderId: string; timestamp: number }) {
    try {
      await fetch(`/api/room/${encodeURIComponent(this.roomId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reaction',
          reaction,
          senderId: this.myId,
        }),
      });
    } catch (e) {
      console.warn('Could not save reaction on server:', e);
    }
  }

  // Post sound trigger to room server for guaranteed cross-device delivery
  public async notifySound(sound: { id: string; soundId: string; soundName: string; senderName: string; senderId: string; timestamp: number }) {
    try {
      await fetch(`/api/room/${encodeURIComponent(this.roomId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sound',
          sound,
          senderId: this.myId,
        }),
      });
    } catch (e) {
      console.warn('Could not save sound trigger on server:', e);
    }
  }

  private myPeerId: string = '';

  // Update current user profile flags (mic, video, host, etc.)
  public updateCurrentUser(partial: Partial<Participant>) {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, ...partial };
    }
  }

  // Update local stream and call any connected peers
  public setLocalStream(stream: MediaStream | null, participants?: Participant[]) {
    this.localStream = stream;
    if (stream && this.currentUser) {
      const hasAudio = stream.getAudioTracks().some((t) => t.enabled);
      const hasVideo = stream.getVideoTracks().some((t) => t.enabled);
      this.currentUser.isAudioMuted = !hasAudio;
      this.currentUser.isVideoMuted = !hasVideo;
    }
    if (stream && this.peer && !this.peer.destroyed) {
      const called = new Set<string>();

      // 1. Call room participants known from server sync
      if (participants && participants.length > 0) {
        participants.forEach((p) => {
          if (p.id !== this.myId && p.id !== this.myPeerId && !called.has(p.id)) {
            called.add(p.id);
            this.callPeer(p.peerId || `cm_${this.roomId}_${p.id}`, stream, p.id);
          }
        });
      }

      // 2. Call connected data channel peers that haven't been called yet
      this.connections.forEach((conn) => {
        const rawPeerKey = conn.peer.replace(`cm_${this.roomId}_`, '').replace(`${this.roomId}-`, '');
        const userId = conn.metadata?.userId || rawPeerKey;
        if (userId && userId !== this.myId && !called.has(userId)) {
          called.add(userId);
          this.callPeer(conn.peer, stream, userId);
        }
      });
    }
  }

  // Initialize WebRTC Peer connection
  public async initPeer(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const { default: Peer } = await import('peerjs');
      // Deterministic peer ID ensures peers can always discover and call each other directly
      const generatedPeerId = `cm_${this.roomId}_${this.myId}`;

      const peerInstance = new Peer(generatedPeerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            { urls: 'stun:stun.services.mozilla.com' },
            {
              urls: [
                'turn:openrelay.metered.ca:80',
                'turn:openrelay.metered.ca:443',
                'turn:openrelay.metered.ca:443?transport=tcp',
              ],
              username: 'openrelayproject',
              credential: 'openrelayproject',
            },
          ],
        },
      });

      this.peer = peerInstance;

      peerInstance.on('open', (id) => {
        console.log('[Mesh] Connected to Peer server with ID:', id);
        this.myPeerId = id;
        if (this.currentUser) {
          this.currentUser.peerId = id;
        }

        // Announce peer ID via broadcast and trigger room heartbeat
        this.broadcast({
          type: 'PARTICIPANT_UPDATE',
          payload: { action: 'peer_ready', peerId: id },
          senderId: this.myId,
          timestamp: Date.now(),
        });
        this.triggerSync();
      });

      peerInstance.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      peerInstance.on('call', (call: any) => {
        this.handleIncomingCall(call);
      });

      peerInstance.on('error', (err: any) => {
        console.warn('[Mesh] PeerJS event:', err?.type || err?.message);
        if (err?.type === 'unavailable-id') {
          // Fallback with a short session suffix if ID was briefly lingering
          const fallbackPeerId = `cm_${this.roomId}_${this.myId}_${Math.random().toString(36).substring(2, 6)}`;
          setTimeout(() => {
            if (!this.isDestroyed) {
              const fallbackPeer = new Peer(fallbackPeerId, {
                debug: 0,
                config: {
                  iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    { urls: 'stun:stun.services.mozilla.com' },
                    {
                      urls: [
                        'turn:openrelay.metered.ca:80',
                        'turn:openrelay.metered.ca:443',
                        'turn:openrelay.metered.ca:443?transport=tcp',
                      ],
                      username: 'openrelayproject',
                      credential: 'openrelayproject',
                    },
                  ],
                },
              });
              this.peer = fallbackPeer;
              fallbackPeer.on('open', (id) => {
                this.myPeerId = id;
                if (this.currentUser) this.currentUser.peerId = id;
                this.triggerSync();
              });
              fallbackPeer.on('connection', (conn) => {
                this.setupConnection(conn);
              });
              fallbackPeer.on('call', (call: any) => {
                this.handleIncomingCall(call);
              });
            }
          }, 800);
        }
      });
    } catch (err) {
      console.warn('[Mesh] Could not initialize WebRTC PeerJS:', err);
    }
  }

  private handleIncomingCall(call: any) {
    const callerUserId = call.metadata?.userId || call.peer.replace(`cm_${this.roomId}_`, '').replace(`${this.roomId}-`, '');
    const oldCall = this.mediaCalls.get(callerUserId) || this.mediaCalls.get(call.peer);
    if (oldCall && oldCall !== call) {
      const oldPc = oldCall.peerConnection as RTCPeerConnection | undefined;
      const isOldAlive = oldPc && (oldPc.connectionState === 'connected' || oldPc.iceConnectionState === 'connected');

      const currentRemoteStream = this.remoteStreams.get(callerUserId);
      const currentHasLiveVideo = Boolean(
        currentRemoteStream &&
          currentRemoteStream.getVideoTracks().length > 0 &&
          currentRemoteStream.getVideoTracks().some((t) => t.readyState === 'live')
      );

      const isUpgrade = Boolean(
        call.metadata?.isUpgrade ||
        (call.metadata?.hasVideo && !currentHasLiveVideo)
      );

      // Only reject if old call is healthy, already has live video, and incoming call is not an upgrade
      if (isOldAlive && currentHasLiveVideo && !isUpgrade) {
        return;
      }

      if (!isOldAlive) {
        try { oldCall.close(); } catch (e) {}
      }
    }

    call.answer(this.localStream || undefined);
    const prevCallToClose = oldCall && oldCall !== call ? oldCall : null;
    this.mediaCalls.set(callerUserId, call);
    this.mediaCalls.set(call.peer, call);

    call.on('stream', (remoteStream: MediaStream) => {
      if (typeof window !== 'undefined') {
        const active = (window as any).__cinemesh_streams || ((window as any).__cinemesh_streams = new Set());
        active.add(remoteStream);
      }
      this.remoteStreams.set(callerUserId, remoteStream);
      this.onRemoteStreamCallbacks.forEach((cb) => cb(callerUserId, remoteStream));

      // Cleanly close previous call once new stream is active
      if (prevCallToClose) {
        try { prevCallToClose.close(); } catch (e) {}
      }
    });

    call.on('close', () => {
      if (this.mediaCalls.get(callerUserId) === call || this.mediaCalls.get(call.peer) === call) {
        this.mediaCalls.delete(callerUserId);
        this.mediaCalls.delete(call.peer);
        const remaining = this.remoteStreams.get(callerUserId);
        const hasLive = remaining && remaining.getTracks().some((t) => t.readyState === 'live');
        if (!hasLive) {
          this.remoteStreams.delete(callerUserId);
          this.onRemoteStreamEndCallbacks.forEach((cb) => cb(callerUserId));
        }
      }
    });

    call.on('error', (err: any) => {
      console.warn('[Mesh] Call error with peer:', callerUserId, err);
      if (this.mediaCalls.get(callerUserId) === call) {
        this.mediaCalls.delete(callerUserId);
        this.mediaCalls.delete(call.peer);
      }
    });
  }

  private setupConnection(conn: any) {
    const rawPeerKey = conn.peer.replace(`cm_${this.roomId}_`, '').replace(`${this.roomId}-`, '');
    const userId = conn.metadata?.userId || rawPeerKey;
    this.connections.set(conn.peer, conn);
    this.connections.set(rawPeerKey, conn);
    if (userId) this.connections.set(userId, conn);

    conn.on('open', () => {
      this.onPeerJoinCallbacks.forEach((cb) => cb(userId));
      if (this.currentUser) {
        try {
          conn.send({
            type: 'PARTICIPANT_UPDATE',
            payload: {
              action: 'presence',
              name: this.currentUser.name,
              avatar: this.currentUser.avatar,
              color: this.currentUser.color,
              isAudioMuted: this.currentUser.isAudioMuted,
              isVideoMuted: this.currentUser.isVideoMuted,
              peerId: this.myPeerId,
            },
            senderId: this.myId,
            timestamp: Date.now(),
          });
        } catch (e) {}
      }
      if (this.currentUser?.isHost) {
        try {
          conn.send({
            type: 'STATE_SYNC',
            payload: {
              currentTime: this.currentPlayTime,
              playing: this.isCurrentlyPlaying,
              duration: this.currentDuration,
            },
            senderId: this.myId,
            timestamp: Date.now(),
          });
        } catch (e) {}
      }
      if (this.localStream) {
        this.callPeer(conn.peer, this.localStream, userId);
      }
    });

    conn.on('data', (data: any) => {
      this.notifyMessage(data);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.connections.delete(rawPeerKey);
      if (userId) this.connections.delete(userId);
      this.onPeerLeaveCallbacks.forEach((cb) => cb(userId));
    });

    conn.on('error', (err: any) => {
      console.warn('[Mesh] Data connection error with peer:', userId, err);
      this.connections.delete(conn.peer);
      this.connections.delete(rawPeerKey);
      if (userId) this.connections.delete(userId);
    });
  }

  public callPeer(targetPeerId: string, stream?: MediaStream, targetUserId?: string) {
    if (!this.peer || !targetPeerId || targetPeerId === this.myId || targetPeerId === this.myPeerId) return;
    const streamToSend = stream || this.localStream;
    if (!streamToSend) return;

    try {
      const fullPeerId = targetPeerId.startsWith('cm_')
        ? targetPeerId
        : targetPeerId.startsWith(`${this.roomId}-`)
        ? targetPeerId
        : `cm_${this.roomId}_${targetPeerId}`;
      const rawPeerId = targetPeerId.replace(`cm_${this.roomId}_`, '').replace(`${this.roomId}-`, '');
      const userKey = targetUserId || rawPeerId;

      const existingCall = this.mediaCalls.get(userKey) || this.mediaCalls.get(fullPeerId);
      if (existingCall) {
        const pc = existingCall.peerConnection as RTCPeerConnection | undefined;
        const isAlive = pc && (pc.connectionState === 'connected' || pc.iceConnectionState === 'connected');

        if (isAlive && pc) {
          const senders = pc.getSenders();
          const tracks = streamToSend.getTracks();
          // Check if every track in streamToSend already has a corresponding sender on this peer connection
          const canReplaceAll =
            tracks.length > 0 &&
            senders.length > 0 &&
            tracks.every((track) =>
              senders.some(
                (s) =>
                  (s.track && s.track.kind === track.kind) ||
                  (!s.track && (s as any).kind === track.kind)
              )
            );

          if (canReplaceAll) {
            try {
              tracks.forEach((track) => {
                const sender = senders.find(
                  (s) =>
                    (s.track && s.track.kind === track.kind) ||
                    (!s.track && (s as any).kind === track.kind)
                );
                if (sender) {
                  sender.replaceTrack(track);
                }
              });
              return; // Successfully updated all tracks in-place without renegotiation!
            } catch (e) {
              console.warn('[Mesh] Track replacement on existing call:', e);
            }
          }
        }

        const isDead =
          !pc ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed' ||
          pc.iceConnectionState === 'failed' ||
          pc.iceConnectionState === 'closed';

        if (isDead) {
          try { existingCall.close(); } catch (e) {}
          this.mediaCalls.delete(userKey);
          this.mediaCalls.delete(fullPeerId);
        }
      }

      const hasVideoTrack = streamToSend.getVideoTracks().length > 0;
      const call = this.peer.call(fullPeerId, streamToSend, {
        metadata: {
          userId: this.myId,
          peerId: this.myPeerId,
          hasVideo: hasVideoTrack,
          isUpgrade: true,
        },
      });
      if (call) {
        (call as any)._initiatedAt = Date.now();
        const oldCall = existingCall;
        this.mediaCalls.set(userKey, call);
        this.mediaCalls.set(fullPeerId, call);

        call.on('stream', (remoteStream: MediaStream) => {
          if (typeof window !== 'undefined') {
            const active = (window as any).__cinemesh_streams || ((window as any).__cinemesh_streams = new Set());
            active.add(remoteStream);
          }
          this.remoteStreams.set(userKey, remoteStream);
          this.onRemoteStreamCallbacks.forEach((cb) => cb(userKey, remoteStream));
          // If this upgraded call successfully replaced an old call, close the old one
          if (oldCall && oldCall !== call) {
            try { oldCall.close(); } catch (e) {}
          }
        });

        call.on('close', () => {
          if (this.mediaCalls.get(userKey) === call || this.mediaCalls.get(fullPeerId) === call) {
            this.mediaCalls.delete(userKey);
            this.mediaCalls.delete(fullPeerId);
            const remaining = this.remoteStreams.get(userKey);
            const hasLive = remaining && remaining.getTracks().some((t) => t.readyState === 'live');
            if (!hasLive) {
              this.remoteStreams.delete(userKey);
              this.onRemoteStreamEndCallbacks.forEach((cb) => cb(userKey));
            }
          }
        });

        call.on('error', (err: any) => {
          console.warn('[Mesh] Outgoing call error to:', userKey, err);
          if (this.mediaCalls.get(userKey) === call) {
            this.mediaCalls.delete(userKey);
            this.mediaCalls.delete(fullPeerId);
          }
        });
      }
    } catch (e) {
      console.warn('[Mesh] Error making WebRTC call to peer:', targetPeerId, e);
    }
  }

  public connectToPeer(targetPeerId: string, targetUserId?: string) {
    if (!this.peer || targetPeerId === this.myId || targetPeerId === this.myPeerId) return;
    const rawPeerKey = targetPeerId.replace(`cm_${this.roomId}_`, '').replace(`${this.roomId}-`, '');
    const existing = this.connections.get(targetPeerId) || this.connections.get(rawPeerKey);
    if (existing && existing.open) return;

    try {
      const fullPeerId = targetPeerId.startsWith('cm_')
        ? targetPeerId
        : targetPeerId.startsWith(`${this.roomId}-`)
        ? targetPeerId
        : `cm_${this.roomId}_${targetPeerId}`;
      const conn = this.peer.connect(fullPeerId, {
        metadata: { userId: this.myId, peerId: this.myPeerId },
      });
      if (conn) {
        this.setupConnection(conn);
      }
    } catch (e) {
      console.warn('[Mesh] Error connecting to peer:', targetPeerId, e);
    }
  }

  // Broadcast message across BroadcastChannel and WebRTC data channels
  public broadcast(message: PeerSyncMessage) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (err) {
        console.error('BroadcastChannel send error:', err);
      }
    }

    const sentConns = new Set<any>();
    this.connections.forEach((conn) => {
      if (conn.open && !sentConns.has(conn)) {
        sentConns.add(conn);
        try {
          conn.send(message);
        } catch (e) {
          console.warn('[Mesh] Peer send error:', e);
        }
      }
    });
  }

  public onMessage(callback: MessageCallback) {
    this.onMessageCallbacks.add(callback);
    return () => this.onMessageCallbacks.delete(callback);
  }

  public onSync(callback: (data: RoomSyncData) => void) {
    this.onSyncCallbacks.add(callback);
    return () => this.onSyncCallbacks.delete(callback);
  }

  public onPeerJoin(callback: (peerId: string) => void) {
    this.onPeerJoinCallbacks.add(callback);
    return () => this.onPeerJoinCallbacks.delete(callback);
  }

  public onPeerLeave(callback: (peerId: string) => void) {
    this.onPeerLeaveCallbacks.add(callback);
    return () => this.onPeerLeaveCallbacks.delete(callback);
  }

  public onRemoteStream(callback: RemoteStreamCallback) {
    this.onRemoteStreamCallbacks.add(callback);
    return () => this.onRemoteStreamCallbacks.delete(callback);
  }

  public onRemoteStreamEnd(callback: (peerId: string) => void) {
    this.onRemoteStreamEndCallbacks.add(callback);
    return () => this.onRemoteStreamEndCallbacks.delete(callback);
  }

  public getRemoteStream(peerId: string): MediaStream | null {
    const rawId = peerId.replace(`cm_${this.roomId}_`, '').replace(`${this.roomId}-`, '');
    return this.remoteStreams.get(peerId) || this.remoteStreams.get(rawId) || null;
  }

  private notifyMessage(msg: PeerSyncMessage) {
    this.onMessageCallbacks.forEach((cb) => cb(msg));
  }

  private notifySync(data: RoomSyncData) {
    if (this.currentUser && data.participants) {
      const myRecord = data.participants.find((p) => p.id === this.myId);
      if (myRecord && myRecord.isHost !== undefined) {
        this.currentUser.isHost = Boolean(myRecord.isHost);
      }
    }
    this.onSyncCallbacks.forEach((cb) => cb(data));
  }

  // Handle explicit or page-exit leaving cleanly
  public handleLeave() {
    if (this.hasLeft) return;
    this.hasLeft = true;

    // 1. Broadcast leave message locally and to WebRTC peers
    try {
      this.broadcast({
        type: 'PARTICIPANT_UPDATE',
        payload: { action: 'leave' },
        senderId: this.myId,
        timestamp: Date.now(),
      });
    } catch (e) {}

    // 2. Inform room server immediately
    try {
      const payload = JSON.stringify({ action: 'leave', senderId: this.myId });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(`/api/room/${encodeURIComponent(this.roomId)}`, blob);
      } else if (typeof fetch !== 'undefined') {
        fetch(`/api/room/${encodeURIComponent(this.roomId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch (e) {}
  }

  public destroy() {
    this.isDestroyed = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      window.removeEventListener('pagehide', this.handleBeforeUnload);
    }

    this.handleLeave();

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    this.mediaCalls.forEach((call) => {
      try {
        call.close();
      } catch (e) {}
    });
    this.mediaCalls.clear();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
    }
    this.connections.clear();
    this.onMessageCallbacks.clear();
    this.onSyncCallbacks.clear();
    this.onRemoteStreamCallbacks.clear();
    this.onRemoteStreamEndCallbacks.clear();
  }
}
