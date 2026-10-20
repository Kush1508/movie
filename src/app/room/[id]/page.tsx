'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Participant, MediaState, ChatMessage, FlyingReaction, KosmiAppId } from '@/types';
import { generateRandomUser } from '@/lib/user-generator';
import { soundboard, SOUND_EFFECTS } from '@/lib/soundboard';
import { MeshRoomSignaling } from '@/lib/peer-sync';
import { KosmiTopBar } from '@/components/KosmiTopBar';
import { KosmiStage } from '@/components/KosmiStage';
import { KosmiDock } from '@/components/KosmiDock';
import { KosmiSidebar } from '@/components/KosmiSidebar';
import { KosmiAppSelector } from '@/components/KosmiAppSelector';
import { ScreenReactions } from '@/components/ScreenReactions';
import { SHINCHAN_MOVIES } from '@/lib/shinchan-catalog';

const RemoteAudio: React.FC<{ stream: MediaStream }> = ({ stream }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;

    // Anchor stream on window to guarantee Chrome V8 GC never reclaims active tracks
    if (typeof window !== 'undefined') {
      const active = (window as any).__cinemesh_remote_streams || ((window as any).__cinemesh_remote_streams = new Set());
      active.add(stream);
    }

    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.muted = false; // Always unmuted so remote participants can be heard!
    el.volume = 1.0;

    const playStream = () => {
      el.play().catch(() => {});
    };

    stream.onaddtrack = playStream;
    stream.onremovetrack = playStream;
    playStream();

    const unlock = () => {
      if (el) {
        el.muted = false;
        el.volume = 1.0;
        el.play().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('touchstart', unlock, { capture: true });
    window.addEventListener('click', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });

    return () => {
      stream.onaddtrack = null;
      stream.onremovetrack = null;
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('touchstart', unlock, { capture: true });
      window.removeEventListener('click', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, [stream]);

  return (
    <audio
      ref={(el) => {
        audioRef.current = el;
        if (el && stream) {
          if (el.srcObject !== stream) el.srcObject = stream;
          el.muted = false;
          el.volume = 1.0;
          el.play().catch(() => {});
        }
      }}
      autoPlay
      playsInline
      className="fixed -top-96 -left-96 w-1 h-1 opacity-0 pointer-events-none"
    />
  );
};

export default function RoomPage() {
  const params = useParams();
  const rawRoomId = (params?.id as string) || 'default-room';
  const roomId = decodeURIComponent(rawRoomId).toLowerCase().trim().replace(/[^a-z0-9-]/g, '') || 'default-room';

  // Local User State
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Active Kosmi Application
  const [currentApp, setCurrentApp] = useState<KosmiAppId>('youtube');
  const [previousApp, setPreviousApp] = useState<KosmiAppId>('youtube');

  // Media Playback State (Preloaded Hindi Shinchan Movie)
  const [mediaState, setMediaState] = useState<MediaState>({
    url: '/movies/dance-amigo.mp4',
    title: 'Shinchan: Dance Amigo (Hindi Dubbed)',
    embedUrl: '',
    isFacebook: false,
    playing: false,
    currentTime: 0,
    duration: 5505,
    playbackRate: 1,
    hostId: '',
    lastUpdated: 0,
  });

  // Track initial sync from room server
  const hasReceivedInitialSyncRef = useRef<boolean>(false);

  // Communication & Room State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<FlyingReaction[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Modals & Panels State
  const [isAppSelectorOpen, setIsAppSelectorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'users' | 'soundboard' | 'invite'>('chat');

  // Open sidebar by default only on larger screens (desktop) to ensure mobile and tablet users get full-stage video
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  // Engine Refs
  const signalingRef = useRef<MeshRoomSignaling | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentUserRef = useRef<Participant | null>(null);
  const mediaStateRef = useRef<MediaState>(mediaState);
  const lastLocalActionRef = useRef<number>(0);
  const participantsRef = useRef<Participant[]>(participants);
  const seenReactionsRef = useRef<Set<string>>(new Set());
  const seenSoundsRef = useRef<Set<string>>(new Set());
  const triggerFlyingReactionRef = useRef<(emoji: string, senderName: string, reactionId?: string) => void>(() => {});
  const triggerLocalSoundRef = useRef<(soundId: string) => void>(() => {});

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    mediaStateRef.current = mediaState;
  }, [mediaState]);

  // 1. Initialize user & Mesh Room Signaling (Server Sync + WebRTC media + BroadcastChannel)
  useEffect(() => {
    let savedProfile = null;
    try {
      const stored = localStorage.getItem('cinemesh_profile') || localStorage.getItem('cinemesh_user');
      if (stored) savedProfile = JSON.parse(stored);
    } catch (e) {}

    // Unique per-tab identifier so opening multiple tabs or windows in same browser correctly shows distinct participants
    let tabId = '';
    try {
      tabId = sessionStorage.getItem('cinemesh_tab_id') || '';
      if (!tabId) {
        tabId = `guest_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('cinemesh_tab_id', tabId);
      }
    } catch (e) {
      tabId = `guest_${Math.random().toString(36).substring(2, 9)}`;
    }

    const generated = generateRandomUser(tabId);
    const me: Participant = {
      id: tabId,
      name: savedProfile?.name || generated.name,
      avatar: savedProfile?.avatar || generated.avatar,
      color: savedProfile?.color || generated.color,
      isHost: false,
      isAudioMuted: true,
      isVideoMuted: true,
      isSpeaking: false,
      joinedAt: Date.now(),
    };

    setCurrentUser(me);
    currentUserRef.current = me;
    setParticipants([me]);

    // Check if a specific Shinchan movie was requested via URL query (?movie=...)
    let requestedInitialMedia: Partial<MediaState> | undefined = undefined;
    let requestedInitialApp: KosmiAppId | undefined = undefined;

    if (typeof window !== 'undefined') {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const rawRequested = queryParams.get('movie');
        if (rawRequested) {
          const cleanKey = decodeURIComponent(rawRequested).toLowerCase().trim();
          const cleanHyphen = cleanKey.replace(/[_ ]+/g, '-');
          const matchedMovie = SHINCHAN_MOVIES.find((m) => {
            const mId = m.id.toLowerCase();
            return (
              mId === cleanKey ||
              mId === cleanHyphen ||
              cleanKey.includes(mId) ||
              cleanHyphen.includes(mId) ||
              mId.includes(cleanHyphen) ||
              (cleanKey.includes('robot') && mId.includes('robot')) ||
              ((cleanKey.includes('amigo') || cleanKey.includes('19ukycpqyr') || cleanKey.includes('4455301321369812') || cleanKey.includes('dance')) && mId.includes('amigo')) ||
              (cleanKey.includes('jungle') && mId.includes('jungle')) ||
              (cleanKey.includes('spicy') && mId.includes('spicy')) ||
              (cleanKey.includes('gourmet') && mId.includes('gourmet')) ||
              (cleanKey.includes('buri') && mId.includes('buri')) ||
              (cleanKey.includes('dulhan') && mId.includes('bride')) ||
              (cleanKey.includes('bride') && mId.includes('bride')) ||
              (cleanKey.includes('empire') && mId.includes('empire')) ||
              (cleanKey.includes('tama') && mId.includes('tama'))
            );
          });
          if (matchedMovie) {
            requestedInitialApp = matchedMovie.isFacebook ? 'facebook' : 'youtube';
            requestedInitialMedia = {
              url: matchedMovie.streamUrl,
              title: matchedMovie.hindiTitle || matchedMovie.title,
              embedUrl: matchedMovie.isFacebook
                ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
                    matchedMovie.streamUrl
                  )}&show_text=0&autoplay=1`
                : undefined,
              isFacebook: matchedMovie.isFacebook,
              playing: true,
              currentTime: 0,
              lastUpdated: Date.now(),
            };
            setCurrentApp(requestedInitialApp);
            setMediaState((prev) => ({
              ...prev,
              ...requestedInitialMedia,
            }));
            // Clean query param from address bar so invite links are always clean
            window.history.replaceState(null, '', `/room/${roomId}`);
          }
        }
      } catch (e) {}
    }

    const signaling = new MeshRoomSignaling(roomId, me.id);
    signalingRef.current = signaling;

    // Handle full server sync (updates participants, media state, app mode, and chat)
    signaling.onSync((syncData) => {
      // 1. Participant count & presence sync
      if (syncData.participants && syncData.participants.length > 0) {
        const myServerRecord = syncData.participants.find((p) => p.id === me.id);
        if (myServerRecord && myServerRecord.isHost !== undefined) {
          setCurrentUser((prev) => (prev ? { ...prev, isHost: Boolean(myServerRecord.isHost) } : prev));
        }

        setParticipants((prev) => {
          return syncData.participants.map((serverP) => {
            if (serverP.id === me.id) {
              return {
                ...serverP,
                name: currentUserRef.current?.name || serverP.name,
                stream: localStreamRef.current,
                isAudioMuted: currentUserRef.current?.isAudioMuted ?? false,
                isVideoMuted: currentUserRef.current?.isVideoMuted ?? true,
              };
            }
            const existing = prev.find((p) => p.id === serverP.id);
            const hasExistingVideo = Boolean(
              existing?.stream && existing.stream.getVideoTracks().some((t) => t.enabled)
            );
            const hasExistingAudio = Boolean(
              existing?.stream && existing.stream.getAudioTracks().some((t) => t.enabled)
            );
            return {
              ...serverP,
              stream: existing?.stream || null,
              isVideoMuted: hasExistingVideo ? false : serverP.isVideoMuted,
              isAudioMuted: hasExistingAudio ? false : serverP.isAudioMuted,
            };
          });
        });

        // Connect WebRTC DataChannel to newly discovered peers
        syncData.participants.forEach((p) => {
          if (p.id !== me.id) {
            const peerIdToUse = p.peerId || `cm_${roomId}_${p.id}`;
            signaling.connectToPeer(peerIdToUse, p.id);
          }
        });
      }

      // 2. Synchronize Media State from room
      if (syncData.mediaState) {
        setMediaState((prev) => {
          const isFirstSync = !hasReceivedInitialSyncRef.current;
          const urlChanged = syncData.mediaState.url !== prev.url;
          const playChanged = syncData.mediaState.playing !== prev.playing;

          // If the user recently performed a seek/skip or play/pause locally (within 6s), protect local playback position
          const recentlyActedLocally = Date.now() - lastLocalActionRef.current < 6000;
          if (recentlyActedLocally && !urlChanged) {
            return prev;
          }

          // If our local state has a newer or equal timestamp, do NOT let stale server response overwrite our action
          if (!isFirstSync && prev.lastUpdated && syncData.mediaState.lastUpdated <= prev.lastUpdated) {
            return prev;
          }

          const isHost = currentUserRef.current?.isHost ?? false;
          const timeDrifted =
            !isHost &&
            typeof syncData.mediaState.currentTime === 'number' &&
            Math.abs(syncData.mediaState.currentTime - prev.currentTime) > 3.0;
          const timestampNewer = syncData.mediaState.lastUpdated > prev.lastUpdated;

          if (isFirstSync || urlChanged || playChanged || timeDrifted || timestampNewer) {
            hasReceivedInitialSyncRef.current = true;
            const updated = {
              ...prev,
              ...syncData.mediaState,
            };
            mediaStateRef.current = updated;
            return updated;
          }
          return prev;
        });
      }

      // 3. Synchronize App mode
      if (syncData.currentApp) {
        setCurrentApp((prev) => (prev !== syncData.currentApp ? syncData.currentApp : prev));
      }

      // 4. Merge chat messages
      if (syncData.messages && syncData.messages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMsgs = syncData.messages.filter((m) => !existingIds.has(m.id));
          if (newMsgs.length > 0) {
            return [...prev, ...newMsgs];
          }
          return prev;
        });
      }

      // 5. Merge flying reactions from server sync
      if (syncData.reactions && syncData.reactions.length > 0) {
        syncData.reactions.forEach((r) => {
          if (!seenReactionsRef.current.has(r.id)) {
            seenReactionsRef.current.add(r.id);
            if (Date.now() - r.timestamp < 6000) {
              triggerFlyingReactionRef.current(r.emoji, r.senderName, r.id);
            }
          }
        });
      }

      // 6. Merge soundboard triggers from server sync
      if (syncData.sounds && syncData.sounds.length > 0) {
        syncData.sounds.forEach((s) => {
          if (!seenSoundsRef.current.has(s.id)) {
            seenSoundsRef.current.add(s.id);
            if (Date.now() - s.timestamp < 6000) {
              triggerLocalSoundRef.current(s.soundId);
              setMessages((prev) => [
                ...prev,
                {
                  id: s.id,
                  senderId: s.senderId || 'peer',
                  senderName: s.senderName,
                  senderColor: '#ffffff',
                  senderAvatar: '',
                  text: s.soundName,
                  timestamp: s.timestamp,
                  type: 'sound',
                },
              ]);
            }
          }
        });
      }
    });

    // Start sync with server & local broadcast
    signaling.initSync(me, requestedInitialMedia, requestedInitialApp);

    // Listen to real-time broadcast signaling messages
    signaling.onMessage((msg) => {
      switch (msg.type) {
        case 'STATE_SYNC':
        case 'URL_CHANGE':
          if (msg.payload.appId) {
            setCurrentApp(msg.payload.appId);
          }
          hasReceivedInitialSyncRef.current = true;
          setMediaState((prev) => ({
            ...prev,
            ...msg.payload,
          }));
          break;

        case 'APP_CHANGE':
          if (msg.payload.appId) {
            setCurrentApp(msg.payload.appId);
          }
          if (msg.payload.mediaState) {
            setMediaState((prev) => ({
              ...prev,
              ...msg.payload.mediaState,
            }));
          }
          break;

        case 'PLAY_STATE':
          setMediaState((prev) => {
            const updated = {
              ...prev,
              playing: msg.payload.playing,
              currentTime: msg.payload.currentTime ?? prev.currentTime,
            };
            mediaStateRef.current = updated;
            return updated;
          });
          break;

        case 'SEEK':
          setMediaState((prev) => {
            const updated = {
              ...prev,
              currentTime: msg.payload.currentTime,
            };
            mediaStateRef.current = updated;
            return updated;
          });
          break;

        case 'CHAT_MESSAGE':
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.payload.id)) return prev;
            return [...prev, msg.payload];
          });
          setUnreadCount((c) => c + 1);
          soundboard.playClick(800);
          break;

        case 'SOUND_TRIGGER': {
          const sndId = msg.payload.id || `snd-p2p-${msg.senderId}-${msg.timestamp}`;
          if (!seenSoundsRef.current.has(sndId)) {
            seenSoundsRef.current.add(sndId);
            triggerLocalSoundRef.current(msg.payload.soundId);
            setMessages((prev) => [
              ...prev,
              {
                id: sndId,
                senderId: msg.senderId,
                senderName: msg.payload.senderName,
                senderColor: '#ffffff',
                senderAvatar: '',
                text: msg.payload.soundName,
                timestamp: msg.timestamp || Date.now(),
                type: 'sound',
              },
            ]);
          }
          break;
        }

        case 'FLYING_REACTION': {
          const rxId = msg.payload.id || `rx-p2p-${msg.senderId}-${msg.timestamp}`;
          if (!seenReactionsRef.current.has(rxId)) {
            seenReactionsRef.current.add(rxId);
            triggerFlyingReactionRef.current(msg.payload.emoji, msg.payload.senderName, rxId);
          }
          break;
        }

        case 'PARTICIPANT_UPDATE':
          if (msg.payload.action === 'peer_ready') {
            const peerId = msg.payload.peerId || `cm_${roomId}_${msg.senderId}`;
            setParticipants((prev) =>
              prev.map((p) => (p.id === msg.senderId ? { ...p, peerId } : p))
            );
            if (msg.senderId !== me.id) {
              signaling.connectToPeer(peerId, msg.senderId);
              if (localStreamRef.current) {
                signaling.callPeer(peerId, localStreamRef.current, msg.senderId);
              }
            }
            break;
          }

          if (msg.payload.action === 'join' || msg.payload.action === 'presence') {
            const guest: Participant = {
              id: msg.senderId,
              peerId: msg.payload.peerId,
              name: msg.payload.name || `Guest-${msg.senderId.slice(0, 4)}`,
              avatar: msg.payload.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.senderId}`,
              color: msg.payload.color || '#FFFFFF',
              isHost: false,
              isAudioMuted: msg.payload.isAudioMuted ?? false,
              isVideoMuted: msg.payload.isVideoMuted ?? true,
              isSpeaking: false,
              joinedAt: Date.now(),
            };

            setParticipants((prev) => {
              if (prev.some((p) => p.id === guest.id)) {
                return prev.map((p) => (p.id === guest.id ? { ...p, ...guest } : p));
              }
              return [...prev, guest];
            });

            if (msg.payload.action === 'join') {
              // Answer with our presence and current media state
              signaling.broadcast({
                type: 'PARTICIPANT_UPDATE',
                payload: {
                  action: 'presence',
                  peerId: currentUserRef.current?.peerId,
                  name: currentUserRef.current?.name || me.name,
                  avatar: currentUserRef.current?.avatar || me.avatar,
                  color: currentUserRef.current?.color || me.color,
                  isAudioMuted: currentUserRef.current?.isAudioMuted ?? true,
                  isVideoMuted: currentUserRef.current?.isVideoMuted ?? true,
                },
                senderId: me.id,
                timestamp: Date.now(),
              });

              if (currentUserRef.current?.isHost && mediaStateRef.current) {
                signaling.broadcast({
                  type: 'STATE_SYNC',
                  payload: {
                    ...mediaStateRef.current,
                    appId: currentApp,
                  },
                  senderId: me.id,
                  timestamp: Date.now(),
                });
              }

              if (localStreamRef.current) {
                const targetPeer = msg.payload.peerId || `cm_${roomId}_${msg.senderId}`;
                signaling.callPeer(targetPeer, localStreamRef.current, msg.senderId);
              }
            }
          } else if (msg.payload.action === 'update_profile') {
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === msg.senderId
                  ? {
                      ...p,
                      name: msg.payload.name ?? p.name,
                      isAudioMuted: msg.payload.isAudioMuted ?? p.isAudioMuted,
                      isVideoMuted: msg.payload.isVideoMuted ?? p.isVideoMuted,
                    }
                  : p
              )
            );
          } else if (msg.payload.action === 'leave') {
            // Immediate local cleanup and host promotion sync
            setParticipants((prev) => prev.filter((p) => p.id !== msg.senderId));
            signaling.triggerSync();
          }
          break;
      }
    });

    // Handle peer disconnect via WebRTC
    signaling.onPeerLeave((peerId) => {
      const rawPeerId = peerId.replace(`${roomId}-`, '');
      setParticipants((prev) =>
        prev.filter((p) => {
          const isMatch =
            p.id === rawPeerId ||
            p.id === peerId ||
            p.peerId === peerId ||
            (p.peerId && p.peerId.includes(peerId));
          return !isMatch;
        })
      );
      signaling.triggerSync();
    });

    // Handle remote media streams from WebRTC calls
    signaling.onRemoteStream((peerId, remoteStream) => {
      const updateStreamState = () => {
        const hasVideo = remoteStream.getVideoTracks().some((t) => t.enabled);
        const hasAudio = remoteStream.getAudioTracks().some((t) => t.enabled);
        setParticipants((prev) =>
          prev.map((p) => {
            const isMatch =
              p.id === peerId ||
              p.peerId === peerId ||
              (p.id && peerId.includes(p.id)) ||
              (p.peerId && peerId.includes(p.peerId)) ||
              (p.peerId && p.peerId.includes(peerId));
            return isMatch
              ? {
                  ...p,
                  stream: remoteStream,
                  isVideoMuted: hasVideo ? false : p.isVideoMuted,
                  isAudioMuted: hasAudio ? false : p.isAudioMuted,
                }
              : p;
          })
        );
      };

      remoteStream.onaddtrack = updateStreamState;
      remoteStream.onremovetrack = updateStreamState;
      updateStreamState();
    });

    signaling.onRemoteStreamEnd((peerId) => {
      const activeStream = signalingRef.current?.getRemoteStream(peerId);
      if (activeStream && activeStream.getTracks().some((t) => t.readyState === 'live')) {
        return;
      }
      setParticipants((prev) =>
        prev.map((p) => {
          const isMatch =
            p.id === peerId ||
            p.peerId === peerId ||
            (p.id && peerId.includes(p.id)) ||
            (p.peerId && peerId.includes(p.peerId)) ||
            (p.peerId && p.peerId.includes(peerId));
          return isMatch ? { ...p, stream: null } : p;
        })
      );
    });

    signaling.initPeer();

    return () => {
      signaling.destroy();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [roomId]);

  // 2. Audio Level Activity Detection (Speaking Halo Indicator)
  useEffect(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    // Anchor stream on window to guarantee Chrome V8 GC never reclaims microphone tracks
    if (typeof window !== 'undefined') {
      (window as any).__cinemesh_local_stream = localStream;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(localStream);
      audioSourceNodeRef.current = source;
      if (typeof window !== 'undefined') {
        (window as any).__cinemesh_audio_source = source;
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let animId: number;

      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const isMuted = currentUserRef.current?.isAudioMuted ?? true;
        const isSpeakingNow = avg > 25 && !isMuted;

        setCurrentUser((prev) => {
          if (!prev || prev.isSpeaking === isSpeakingNow) return prev;
          return { ...prev, isSpeaking: isSpeakingNow };
        });

        animId = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();

      return () => {
        cancelAnimationFrame(animId);
        try {
          source.disconnect();
        } catch (e) {}
      };
    } catch (err) {
      console.warn('Audio analyser error:', err);
    }
  }, [localStream]);

  // 3. WebRTC Camera Toggle with graceful fallback
  const toggleVideo = async () => {
    if (!currentUser) return;

    if (currentUser.isVideoMuted) {
      try {
        let stream = localStream || localStreamRef.current;
        if (!stream) {
          try {
            // First attempt video + audio
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
              audio: true,
            });
          } catch {
            // Fallback video only
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
            });
          }

          // If local mic is currently muted, ensure newly requested audio tracks stay muted
          if (currentUser.isAudioMuted) {
            stream.getAudioTracks().forEach((t) => (t.enabled = false));
          }

          localStreamRef.current = stream;
          setLocalStream(new MediaStream(stream.getTracks()));
          signalingRef.current?.setLocalStream(stream, participantsRef.current);
        } else {
          let videoTrack = stream.getVideoTracks()[0];
          if (!videoTrack) {
            const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoTrack = vStream.getVideoTracks()[0];
            stream.addTrack(videoTrack);
          }
          videoTrack.enabled = true;
          localStreamRef.current = stream;
          setLocalStream(new MediaStream(stream.getTracks()));
          signalingRef.current?.setLocalStream(stream, participantsRef.current);
        }

        setCurrentUser((prev) => prev && { ...prev, isVideoMuted: false });
        setParticipants((prev) =>
          prev.map((p) => (p.id === currentUser.id ? { ...p, isVideoMuted: false, stream } : p))
        );

        signalingRef.current?.updateCurrentUser({ isVideoMuted: false });
        signalingRef.current?.triggerSync();

        signalingRef.current?.broadcast({
          type: 'PARTICIPANT_UPDATE',
          payload: { action: 'update_profile', isVideoMuted: false },
          senderId: currentUser.id,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.warn('Could not access camera:', err);
        alert('Could not access camera. Please verify camera permissions in your browser.');
      }
    } else {
      const stream = localStream || localStreamRef.current;
      if (stream) {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setCurrentUser((prev) => prev && { ...prev, isVideoMuted: true });
      setParticipants((prev) =>
        prev.map((p) => (p.id === currentUser.id ? { ...p, isVideoMuted: true } : p))
      );

      signalingRef.current?.updateCurrentUser({ isVideoMuted: true });
      signalingRef.current?.triggerSync();

      signalingRef.current?.broadcast({
        type: 'PARTICIPANT_UPDATE',
        payload: { action: 'update_profile', isVideoMuted: true },
        senderId: currentUser.id,
        timestamp: Date.now(),
      });
    }
  };

  // 4. Microphone Toggle
  const toggleAudio = async () => {
    if (!currentUser) return;

    if (currentUser.isAudioMuted) {
      let stream = localStream || localStreamRef.current;
      if (stream && stream.getAudioTracks().length > 0) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
        localStreamRef.current = stream;
        setLocalStream(new MediaStream(stream.getTracks()));
        signalingRef.current?.setLocalStream(stream, participantsRef.current);
      } else {
        try {
          const aStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          const aTrack = aStream.getAudioTracks()[0];
          if (stream) {
            stream.addTrack(aTrack);
            localStreamRef.current = stream;
            setLocalStream(new MediaStream(stream.getTracks()));
            signalingRef.current?.setLocalStream(stream, participantsRef.current);
          } else {
            localStreamRef.current = aStream;
            setLocalStream(aStream);
            signalingRef.current?.setLocalStream(aStream, participantsRef.current);
          }
        } catch (err) {
          console.warn('Mic access error:', err);
          alert('Could not access microphone. Please check your browser permissions.');
          return;
        }
      }

      setCurrentUser((prev) => prev && { ...prev, isAudioMuted: false });
      setParticipants((prev) =>
        prev.map((p) => (p.id === currentUser.id ? { ...p, isAudioMuted: false } : p))
      );

      signalingRef.current?.updateCurrentUser({ isAudioMuted: false });
      signalingRef.current?.triggerSync();

      signalingRef.current?.broadcast({
        type: 'PARTICIPANT_UPDATE',
        payload: { action: 'update_profile', isAudioMuted: false },
        senderId: currentUser.id,
        timestamp: Date.now(),
      });
    } else {
      const stream = localStream || localStreamRef.current;
      if (stream) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setCurrentUser((prev) => prev && { ...prev, isAudioMuted: true, isSpeaking: false });
      setParticipants((prev) =>
        prev.map((p) => (p.id === currentUser.id ? { ...p, isAudioMuted: true, isSpeaking: false } : p))
      );

      signalingRef.current?.updateCurrentUser({ isAudioMuted: true });
      signalingRef.current?.triggerSync();

      signalingRef.current?.broadcast({
        type: 'PARTICIPANT_UPDATE',
        payload: { action: 'update_profile', isAudioMuted: true },
        senderId: currentUser.id,
        timestamp: Date.now(),
      });
    }
  };

  // 5. Screen Share Toggle
  const handleToggleScreenShare = () => {
    if (currentApp === 'screenshare') {
      setCurrentApp(previousApp || 'youtube');
    } else {
      setPreviousApp(currentApp);
      setCurrentApp('screenshare');
    }
  };

  // 6. Soundboard Trigger & Flying Reactions
  const triggerLocalSound = (soundId: string) => {
    switch (soundId) {
      case 'applause':
        soundboard.playApplause();
        break;
      case 'airhorn':
        soundboard.playAirhorn();
        break;
      case 'rimshot':
        soundboard.playRimshot();
        break;
      case 'popcorn':
        soundboard.playPopcorn();
        break;
      case 'bassdrop':
        soundboard.playBassDrop();
        break;
      case 'chime':
        soundboard.playChime();
        break;
      case 'boo':
        soundboard.playBoo();
        break;
      default:
        soundboard.playClick();
    }
  };
  triggerLocalSoundRef.current = triggerLocalSound;

  const triggerFlyingReaction = (emoji: string, senderName: string, reactionId?: string) => {
    const rxId = reactionId || `reaction-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newReaction: FlyingReaction = {
      id: rxId,
      emoji,
      x: 20 + Math.random() * 60,
      senderName,
    };
    setReactions((prev) => [...prev, newReaction]);

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== rxId));
    }, 3200);
  };
  triggerFlyingReactionRef.current = triggerFlyingReaction;

  // 7. Synchronized Playback Controls (Host Only)
  const handlePlayPause = (playing: boolean) => {
    // Only the host can pause or play the movie
    if (!currentUser?.isHost) return;

    lastLocalActionRef.current = Date.now();
    const updated = { ...mediaState, playing, currentTime: mediaState.currentTime, lastUpdated: Date.now() };
    setMediaState(updated);
    signalingRef.current?.broadcast({
      type: 'PLAY_STATE',
      payload: { playing, currentTime: mediaState.currentTime },
      senderId: currentUser?.id || 'me',
      timestamp: Date.now(),
    });
    signalingRef.current?.notifyMediaUpdate(updated);
  };

  const handleTimeProgress = (seconds: number, duration: number) => {
    if (!currentUser?.isHost) return;
    mediaStateRef.current.currentTime = seconds;
    if (duration > 0) {
      mediaStateRef.current.duration = duration;
    }
    signalingRef.current?.setLocalMediaTime(seconds, mediaState.playing, duration);
  };

  const handleSeek = (seconds: number) => {
    // Only the host can skip or seek the movie
    if (!currentUser?.isHost) return;

    lastLocalActionRef.current = Date.now();
    const updated = { ...mediaState, currentTime: seconds, lastUpdated: Date.now() };
    mediaStateRef.current = updated;
    setMediaState(updated);
    signalingRef.current?.setLocalMediaTime(seconds, mediaState.playing, mediaState.duration);
    signalingRef.current?.broadcast({
      type: 'SEEK',
      payload: { currentTime: seconds },
      senderId: currentUser?.id || 'me',
      timestamp: Date.now(),
    });
    signalingRef.current?.notifyMediaUpdate(updated);
  };

  // 8. Select Application / Media via Kosmi App Selector
  const handleSelectApp = (appId: KosmiAppId, streamData?: { url: string; title?: string }) => {
    lastLocalActionRef.current = Date.now();
    setCurrentApp(appId);

    // Clean any old ?movie= parameter from browser URL so room invite links are clean
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState(null, '', `/room/${roomId}`);
      } catch (e) {}
    }

    let updatedMediaState = { ...mediaState };

    if (streamData?.url) {
      const isFb =
        appId === 'facebook' ||
        streamData.url.includes('facebook.com') ||
        streamData.url.includes('fb.watch') ||
        streamData.url.includes('share.google');

      updatedMediaState = {
        ...mediaState,
        url: streamData.url,
        title: streamData.title || (appId === 'facebook' ? 'Facebook Video Stream' : 'YouTube Watch Party'),
        isFacebook: isFb,
        embedUrl: isFb
          ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
              streamData.url
            )}&show_text=0&autoplay=1`
          : undefined,
        playing: true,
        currentTime: 0,
        lastUpdated: Date.now(),
      };
      mediaStateRef.current = updatedMediaState;
      setMediaState(updatedMediaState);
      signalingRef.current?.setLocalMediaTime(0, true, 0);
    }

    // Broadcast app change across room
    signalingRef.current?.broadcast({
      type: 'APP_CHANGE',
      payload: {
        appId,
        mediaState: streamData?.url ? updatedMediaState : undefined,
      },
      senderId: currentUser?.id || 'me',
      timestamp: Date.now(),
    });

    signalingRef.current?.notifyAppChange(appId, streamData?.url ? updatedMediaState : undefined);
    if (streamData?.url) {
      signalingRef.current?.notifyMediaUpdate(updatedMediaState, appId);
    }
  };

  // 9. Update Guest Nickname
  const handleUpdateNickname = (newName: string) => {
    if (!currentUser || !newName.trim()) return;
    const trimmed = newName.trim();
    const updated = { ...currentUser, name: trimmed };
    currentUserRef.current = updated;
    setCurrentUser(updated);
    setParticipants((prev) => prev.map((p) => (p.id === currentUser.id ? { ...p, name: trimmed } : p)));

    try {
      localStorage.setItem('cinemesh_user', JSON.stringify(updated));
      localStorage.setItem('cinemesh_profile', JSON.stringify(updated));
    } catch (e) {}

    signalingRef.current?.updateCurrentUser({ name: trimmed });
    signalingRef.current?.triggerSync();

    signalingRef.current?.broadcast({
      type: 'PARTICIPANT_UPDATE',
      payload: { action: 'update_profile', name: trimmed },
      senderId: currentUser.id,
      timestamp: Date.now(),
    });
  };

  // 10. Chat & Reaction dispatch
  const handleSendMessage = (text: string) => {
    if (!currentUser) return;
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderColor: currentUser.color,
      senderAvatar: currentUser.avatar,
      text,
      timestamp: Date.now(),
      type: 'chat',
    };

    setMessages((prev) => [...prev, msg]);
    signalingRef.current?.broadcast({
      type: 'CHAT_MESSAGE',
      payload: msg,
      senderId: currentUser.id,
      timestamp: Date.now(),
    });
    signalingRef.current?.notifyChatMessage(msg);
  };

  const handleTriggerSound = (soundId: string) => {
    if (!currentUser) return;
    const soundIdUnique = `snd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    seenSoundsRef.current.add(soundIdUnique);
    triggerLocalSound(soundId);
    const soundItem = SOUND_EFFECTS.find((s) => s.id === soundId);
    const soundName = soundItem ? `${soundItem.emoji} ${soundItem.name}` : soundId;

    // 1. Instant local/P2P broadcast
    signalingRef.current?.broadcast({
      type: 'SOUND_TRIGGER',
      payload: {
        id: soundIdUnique,
        soundId,
        soundName,
        senderName: currentUser.name,
      },
      senderId: currentUser.id,
      timestamp: Date.now(),
    });

    // 2. Guaranteed server sync for cross-device/firewalled peers
    signalingRef.current?.notifySound({
      id: soundIdUnique,
      soundId,
      soundName,
      senderName: currentUser.name,
      senderId: currentUser.id,
      timestamp: Date.now(),
    });
  };

  const handleSendReaction = (emoji: string) => {
    if (!currentUser) return;
    const rxId = `rx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    seenReactionsRef.current.add(rxId);
    triggerFlyingReaction(emoji, currentUser.name, rxId);

    // 1. Instant local/P2P broadcast
    signalingRef.current?.broadcast({
      type: 'FLYING_REACTION',
      payload: {
        id: rxId,
        emoji,
        senderName: currentUser.name,
      },
      senderId: currentUser.id,
      timestamp: Date.now(),
    });

    // 2. Guaranteed server sync for cross-device/firewalled peers
    signalingRef.current?.notifyReaction({
      id: rxId,
      emoji,
      senderName: currentUser.name,
      senderId: currentUser.id,
      timestamp: Date.now(),
    });
  };

  // Compute Active App Title for Kosmi Top Bar
  const activeAppTitle = (() => {
    switch (currentApp) {
      case 'youtube':
        return mediaState.title || 'YouTube Watch Party';
      case 'facebook':
        return mediaState.title || 'Facebook Video Stream';
      case 'browser':
        return 'Shared Virtual Browser';
      case 'screenshare':
        return 'Live Screen Sharing';
      case 'lounge':
        return 'Voice & Webcam Lounge';
      default:
        return 'Kosmi Cinema Room';
    }
  })();

  return (
    <div className="relative w-screen h-screen h-[100dvh] bg-[#070709] canvas-grid overflow-hidden flex flex-col font-sans select-none text-white">
      {/* 1. Kosmi Top Navigation Bar */}
      <KosmiTopBar
        roomId={roomId}
        currentUser={currentUser}
        activeAppTitle={activeAppTitle}
        onOpenAppSelector={() => setIsAppSelectorOpen(true)}
        onUpdateNickname={handleUpdateNickname}
        participantCount={participants.length}
        hostName={participants.find((p) => p.isHost)?.name}
      />

      {/* 2. Main Stage & Dedicated Right Panel (Prime / Hotstar experience) */}
      <main className="relative flex-1 w-full h-[calc(100dvh-2.75rem)] sm:h-[calc(100vh-3.25rem)] overflow-hidden flex flex-col landscape:flex-row lg:flex-row">
        {/* Left / Top: Cinema Video Player Stage */}
        <div
          className={`relative min-w-0 overflow-hidden flex flex-col bg-black transition-all ${
            isSidebarOpen
              ? 'w-full shrink-0 h-[48dvh] sm:h-[50dvh] landscape:h-full landscape:flex-1 landscape:w-auto lg:h-full lg:flex-1 lg:w-auto'
              : 'flex-1 h-full w-full'
          }`}
        >
          <KosmiStage
            currentApp={currentApp}
            mediaState={mediaState}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onTimeProgress={handleTimeProgress}
            onOpenAppSelector={() => setIsAppSelectorOpen(true)}
            onSelectApp={handleSelectApp}
            isHost={Boolean(currentUser?.isHost)}
            participants={participants}
            currentUser={currentUser}
            localStream={localStream}
            isSidebarOpen={isSidebarOpen}
          />

          {/* Flying Live Reactions Canvas */}
          <ScreenReactions reactions={reactions} />
        </div>

        {/* Right / Bottom: Dedicated Panel for Video, Audio, and Text Chat */}
        {currentUser && isSidebarOpen && (
          <div className="w-full flex-1 min-h-0 landscape:w-72 sm:landscape:w-80 lg:relative lg:inset-auto lg:w-80 xl:w-96 lg:h-full lg:shrink-0 lg:flex-none border-t landscape:border-t-0 landscape:border-l lg:border-t-0 lg:border-l border-[#202534] bg-[#0c0e14] flex flex-col shadow-2xl animate-in slide-in-from-bottom landscape:slide-in-from-right lg:slide-in-from-right duration-200">
            <KosmiSidebar
              isInline={true}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              activeTab={sidebarTab}
              onChangeTab={(tab) => {
                setSidebarTab(tab);
                if (tab === 'chat') setUnreadCount(0);
              }}
              messages={messages}
              onSendMessage={handleSendMessage}
              onTriggerSound={handleTriggerSound}
              onSendReaction={handleSendReaction}
              participants={participants}
              roomId={roomId}
              currentUserId={currentUser.id}
              localStream={localStream}
              onToggleAudio={toggleAudio}
              onToggleVideo={toggleVideo}
              isAudioMuted={currentUser.isAudioMuted ?? false}
              isVideoMuted={currentUser.isVideoMuted ?? true}
            />
          </div>
        )}
      </main>

      {/* 3. Floating Tactile Dock (Apps Launcher, Mic, Camera, Screen Share, Chat/Panel triggers) */}
      <div className={isSidebarOpen ? "hidden lg:block" : "block"}>
        <KosmiDock
          onOpenAppSelector={() => setIsAppSelectorOpen(true)}
          isAudioMuted={currentUser?.isAudioMuted ?? false}
          isVideoMuted={currentUser?.isVideoMuted ?? true}
          isScreenSharing={currentApp === 'screenshare'}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          isSidebarOpen={isSidebarOpen}
          activeSidebarTab={sidebarTab}
          onToggleSidebar={(tab) => {
            setSidebarTab(tab);
            setIsSidebarOpen((prev) => (tab === sidebarTab ? !prev : true));
            if (tab === 'chat') setUnreadCount(0);
          }}
          unreadCount={unreadCount}
        />
      </div>

      {/* 5. Kosmi App Selector Modal (YouTube, Facebook, Virtual Browser, Screen Share, Lounge) */}
      <KosmiAppSelector
        isOpen={isAppSelectorOpen}
        onClose={() => setIsAppSelectorOpen(false)}
        onSelectApp={handleSelectApp}
        currentAppId={currentApp}
      />

      {/* 6. Dedicated WebRTC Remote Audio Elements for all peers with active audio stream */}
      {participants
        .filter((p) => p.id !== currentUser?.id && p.stream)
        .map((p) => (
          <RemoteAudio
            key={`remote-audio-${p.id}`}
            stream={p.stream!}
          />
        ))}
    </div>
  );
}
