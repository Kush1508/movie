'use client';

import React, { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Sparkles,
  Link2,
  ExternalLink,
  Facebook,
  Radio,
  Grid,
  Youtube,
  Globe,
  MonitorUp,
  Film,
  Lock,
  Tv,
} from 'lucide-react';
import { MediaState, Participant } from '@/types';
import { KosmiAppId } from './KosmiAppSelector';
import { soundboard } from '@/lib/soundboard';
import { SharedBrowserStage } from './SharedBrowserStage';
import { ScreenShareStage } from './ScreenShareStage';
import { ParticipantBubbles } from './ParticipantBubbles';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface KosmiStageProps {
  currentApp: KosmiAppId;
  mediaState: MediaState;
  onPlayPause: (playing: boolean) => void;
  onSeek: (seconds: number) => void;
  onTimeProgress?: (seconds: number, duration: number) => void;
  onOpenAppSelector: () => void;
  onSelectApp: (appId: KosmiAppId, streamData?: { url: string; title?: string }) => void;
  isHost: boolean;
  participants: Participant[];
  currentUser: Participant | null;
  localStream: MediaStream | null;
  isSidebarOpen?: boolean;
}

export const KosmiStage: React.FC<KosmiStageProps> = ({
  currentApp,
  mediaState,
  onPlayPause,
  onSeek,
  onTimeProgress,
  onOpenAppSelector,
  onSelectApp,
  isHost,
  participants,
  currentUser,
  localStream,
  isSidebarOpen = false,
}) => {
  const isSoleParticipant = !participants || participants.length <= 1;
  const otherHostActive = participants?.some((p) => p.id !== currentUser?.id && p.isHost);
  const effectiveIsHost = Boolean(isHost && !otherHostActive);

  const playerRef = useRef<any>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const lastTimeEmittedRef = useRef<number>(0);

  const [hasMounted, setHasMounted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const bufferDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bufferWatchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [skipFeedback, setSkipFeedback] = useState<{ type: 'forward' | 'backward'; text: string } | null>(null);
  const skipFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTouchTimeRef = useRef<number>(0);

  const lastHardSeekRef = useRef<number>(0);

  const lastUserSeekRef = useRef<number>(0);
  const hasInitialSyncedRef = useRef<boolean>(false);
  const lastRemoteTimeRef = useRef<number>(mediaState.currentTime || 0);
  const lastRemoteTimeUpdateRef = useRef<number>(Date.now());
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState<number>(1.0);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleBufferStart = () => {
    // If paused, it is not buffering
    if (!mediaState.playing) {
      handleBufferEnd();
      return;
    }
    // Only show loading spinner if buffering persists for > 800ms
    // Fast seeks (5s, 10s) complete in ~150ms and will NEVER show any spinner!
    if (bufferDebounceTimerRef.current) clearTimeout(bufferDebounceTimerRef.current);
    bufferDebounceTimerRef.current = setTimeout(() => {
      setIsBuffering(true);
      // Hard cap: Maximum buffer tolerance is 3 seconds. After 3s, force resume!
      if (bufferWatchdogTimerRef.current) clearTimeout(bufferWatchdogTimerRef.current);
      bufferWatchdogTimerRef.current = setTimeout(() => {
        setIsBuffering(false);
        try {
          const videoEl = stageContainerRef.current?.querySelector('video');
          if (videoEl && videoEl.paused) {
            videoEl.play().catch(() => {});
          }
        } catch (e) {}
      }, 3000);
    }, 800);
  };

  const handleBufferEnd = () => {
    if (bufferDebounceTimerRef.current) {
      clearTimeout(bufferDebounceTimerRef.current);
      bufferDebounceTimerRef.current = null;
    }
    if (bufferWatchdogTimerRef.current) {
      clearTimeout(bufferWatchdogTimerRef.current);
      bufferWatchdogTimerRef.current = null;
    }
    setIsBuffering(false);
  };

  const getCurrentPlaybackTime = (): number => {
    try {
      const videoEl = stageContainerRef.current?.querySelector('video');
      if (videoEl && typeof videoEl.currentTime === 'number' && !isNaN(videoEl.currentTime)) {
        return videoEl.currentTime;
      }
    } catch (e) {}

    try {
      const internal = playerRef.current?.getInternalPlayer();
      if (internal && typeof internal.currentTime === 'number' && !isNaN(internal.currentTime)) {
        return internal.currentTime;
      }
    } catch (e) {}

    try {
      const current = playerRef.current?.getCurrentTime();
      if (typeof current === 'number' && !isNaN(current)) {
        return current;
      }
    } catch (e) {}

    return playedSeconds;
  };

  const seekVideoTo = (targetSeconds: number) => {
    if (isNaN(targetSeconds) || targetSeconds < 0) return;

    try {
      const videoEl = stageContainerRef.current?.querySelector('video');
      if (videoEl) {
        if (videoEl.readyState >= 1) {
          videoEl.currentTime = targetSeconds;
          if (mediaState.playing && videoEl.paused) {
            videoEl.play().catch(() => {});
          }
        } else {
          let hasSeeked = false;
          const onMeta = () => {
            if (hasSeeked) return;
            hasSeeked = true;
            try {
              videoEl.removeEventListener('loadedmetadata', onMeta);
              videoEl.removeEventListener('canplay', onMeta);
              videoEl.currentTime = targetSeconds;
              if (mediaState.playing && videoEl.paused) {
                videoEl.play().catch(() => {});
              }
            } catch (e) {}
          };
          videoEl.addEventListener('loadedmetadata', onMeta, { once: true });
          videoEl.addEventListener('canplay', onMeta, { once: true });
        }
      } else {
        playerRef.current?.seekTo(targetSeconds, 'seconds');
      }
    } catch (e) {}
  };

  const handleSkip = (offsetSeconds: number) => {
    // Only the host or sole participant can skip forward or backward
    if (!effectiveIsHost) return;

    const videoEl = stageContainerRef.current?.querySelector('video');
    const cur = (videoEl && typeof videoEl.currentTime === 'number') ? videoEl.currentTime : playedSeconds;
    const maxSec = duration > 0 ? duration : Infinity;
    const target = Math.max(0, Math.min(maxSec, cur + offsetSeconds));

    lastUserSeekRef.current = Date.now();
    setPlayedSeconds(target);

    // 1. Hotstar / Prime Video on-screen skip indicator (+10s / -10s)
    if (skipFeedbackTimerRef.current) clearTimeout(skipFeedbackTimerRef.current);
    setSkipFeedback({
      type: offsetSeconds > 0 ? 'forward' : 'backward',
      text: offsetSeconds > 0 ? `+${Math.abs(offsetSeconds)}s` : `-${Math.abs(offsetSeconds)}s`,
    });
    skipFeedbackTimerRef.current = setTimeout(() => {
      setSkipFeedback(null);
    }, 850);

    // 2. Direct instant seek
    if (videoEl) {
      videoEl.currentTime = target;
      if (videoEl.paused) {
        videoEl.play().catch(() => {});
      }
    } else {
      playerRef.current?.seekTo(target, 'seconds');
    }

    // 3. Notify room and resume playback
    onSeek(target);
    if (!mediaState.playing) {
      onPlayPause(true);
    }

    soundboard.playClick(offsetSeconds > 0 ? 850 : 650);
  };

  // Reset initial sync flag when media URL changes
  useEffect(() => {
    hasInitialSyncedRef.current = false;
    lastRemoteTimeRef.current = 0;
  }, [mediaState.url]);

  // Dedicated room join / newcomer sync:
  // When a non-host participant joins, seek immediately once to the host's ongoing playback position
  useEffect(() => {
    if (effectiveIsHost) return;

    const targetTime = mediaState.currentTime;
    if (typeof targetTime === 'number' && targetTime > 0 && !hasInitialSyncedRef.current) {
      hasInitialSyncedRef.current = true;
      lastRemoteTimeRef.current = targetTime;
      lastRemoteTimeUpdateRef.current = Date.now();
      setPlayedSeconds(targetTime);
      seekVideoTo(targetTime);
    }
  }, [mediaState.currentTime, effectiveIsHost, mediaState.url, mediaState.playing]);

  // Synchronize playback position when remote mediaState changes (teleparty/watch2gether zero-buffering model)
  useEffect(() => {
    // If local user sought recently (within 8 seconds), ignore incoming time changes
    if (Date.now() - lastUserSeekRef.current < 8000) return;

    // Only non-host participants follow the host
    if (effectiveIsHost) return;

    const videoEl = stageContainerRef.current?.querySelector('video');

    // 1. Play / Pause state synchronization & Autoplay handling
    if (videoEl) {
      if (mediaState.playing && videoEl.paused) {
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise.catch((err: any) => {
            // If browser blocked unmuted autoplay, mute temporarily to start video immediately
            if (err?.name === 'NotAllowedError') {
              videoEl.muted = true;
              videoEl.play().then(() => {
                setIsAutoplayBlocked(true);
              }).catch(() => {});
            }
          });
        }
      } else if (!mediaState.playing && !videoEl.paused) {
        videoEl.pause();
      }
    }

    // 2. Continuous smooth playback synchronization (Tiered rate nudging & zero-buffer model)
    if (!isSeeking && typeof mediaState.currentTime === 'number' && mediaState.currentTime >= 0) {
      const cur = getCurrentPlaybackTime();
      const newRemoteTime = mediaState.currentTime;
      const prevRemoteTime = lastRemoteTimeRef.current;
      const now = Date.now();
      const elapsedWallClock = (now - lastRemoteTimeUpdateRef.current) / 1000;
      lastRemoteTimeRef.current = newRemoteTime;
      lastRemoteTimeUpdateRef.current = now;

      // Host explicitly jumped if:
      // a) Host scrubbed backwards (time decreased by > 1.5s), OR
      // b) Host skipped forward (+10s, scrubber drag) where remote time advanced significantly faster than wall clock
      const hostScrubbedBackward = prevRemoteTime > 0 && (newRemoteTime < prevRemoteTime - 1.5);
      const hostSkippedForward = prevRemoteTime > 0 && (newRemoteTime - prevRemoteTime > elapsedWallClock + 6.0);
      const hostDiscretelyJumped = hostScrubbedBackward || hostSkippedForward;

      const diff = cur - newRemoteTime; // negative means guest is behind host
      const absDiff = Math.abs(diff);

      if (!mediaState.playing) {
        // When host is paused, snap directly to host's paused frame
        if (absDiff > 1.0) {
          seekVideoTo(newRemoteTime);
          setPlayedSeconds(newRemoteTime);
        }
        if (videoEl) videoEl.playbackRate = 1.0;
        setCurrentPlaybackRate(1.0);
      } else if (hostDiscretelyJumped) {
        // Host performed an explicit jump/skip: seek immediately to match host scene
        lastHardSeekRef.current = now;
        seekVideoTo(newRemoteTime);
        setPlayedSeconds(newRemoteTime);
        if (videoEl) videoEl.playbackRate = 1.0;
        setCurrentPlaybackRate(1.0);
      } else if (absDiff > 25.0) {
        // Severe desync (>25s) with 20s cooldown so HTML5 video has plenty of time to buffer once and play smoothly
        if (now - lastHardSeekRef.current > 20000) {
          lastHardSeekRef.current = now;
          seekVideoTo(newRemoteTime);
          setPlayedSeconds(newRemoteTime);
          if (videoEl) videoEl.playbackRate = 1.0;
          setCurrentPlaybackRate(1.0);
        }
      } else {
        // Tiered smooth playback rate nudging (ZERO hard seeks -> ZERO buffer flushes -> 100% silky smooth video)
        let targetRate = 1.0;
        if (absDiff <= 1.0) {
          targetRate = 1.0; // In sync
        } else if (absDiff <= 3.5) {
          targetRate = diff < 0 ? 1.04 : 0.96; // Gentle glide
        } else if (absDiff <= 8.0) {
          targetRate = diff < 0 ? 1.12 : 0.88; // Moderate catch-up
        } else {
          targetRate = diff < 0 ? 1.20 : 0.80; // Fast catch-up
        }

        if (videoEl && videoEl.playbackRate !== targetRate) {
          videoEl.playbackRate = targetRate;
        }
        if (currentPlaybackRate !== targetRate) {
          setCurrentPlaybackRate(targetRate);
        }
      }
    }
  }, [mediaState.currentTime, isSeeking, effectiveIsHost, mediaState.playing]);

  // Global user interaction listener to unlock audio if unmuted autoplay was blocked by browser
  useEffect(() => {
    const unlockAutoplay = () => {
      const videoEl = stageContainerRef.current?.querySelector('video');
      if (videoEl) {
        if (videoEl.muted && !isMuted) {
          videoEl.muted = false;
        }
        if (videoEl.paused && mediaState.playing) {
          videoEl.play().catch(() => {});
        }
      }
      setIsAutoplayBlocked(false);
    };

    window.addEventListener('pointerdown', unlockAutoplay, { capture: true, passive: true });
    window.addEventListener('click', unlockAutoplay, { capture: true, passive: true });
    window.addEventListener('touchstart', unlockAutoplay, { capture: true, passive: true });
    window.addEventListener('keydown', unlockAutoplay, { capture: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAutoplay, { capture: true });
      window.removeEventListener('click', unlockAutoplay, { capture: true });
      window.removeEventListener('touchstart', unlockAutoplay, { capture: true });
      window.removeEventListener('keydown', unlockAutoplay, { capture: true });
    };
  }, [isMuted, mediaState.playing]);

  // Keyboard shortcuts: ArrowRight (+10s), ArrowLeft (-10s), Space (play/pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only the host can control playback via keyboard
      if (!effectiveIsHost) return;

      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkip(10);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, mediaState.playing, effectiveIsHost]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!effectiveIsHost) return;
    const nextState = !mediaState.playing;
    onPlayPause(nextState);
    soundboard.playClick(nextState ? 900 : 700);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!effectiveIsHost) return;
    const targetSec = parseFloat(e.target.value);
    lastUserSeekRef.current = Date.now();
    setPlayedSeconds(targetSec);
    setIsSeeking(true);
  };

  const handleSeekCommit = () => {
    if (!effectiveIsHost) return;
    setIsSeeking(false);
    lastUserSeekRef.current = Date.now();
    onSeek(playedSeconds);
    seekVideoTo(playedSeconds);

    if (mediaState.playing) {
      setTimeout(() => {
        try {
          const videoEl = stageContainerRef.current?.querySelector('video');
          if (videoEl && videoEl.paused) {
            videoEl.play().catch(() => {});
          }
        } catch (e) {}
      }, 100);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as any;
      const isFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isFs);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const container = stageContainerRef.current as any;
    if (!container) return;
    const doc = document as any;

    const isFs = Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isFs) {
      if (container.requestFullscreen) {
        container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
        setIsFullscreen(true);
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
        setIsFullscreen(true);
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
        setIsFullscreen(true);
      } else {
        const videoEl = container.querySelector('video') as any;
        if (videoEl?.webkitEnterFullscreen) {
          videoEl.webkitEnterFullscreen();
        }
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
        setIsFullscreen(false);
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
        setIsFullscreen(false);
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => {
      if (mediaState.playing) {
        setShowControls(false);
      }
    }, 4000);
    setControlsTimeout(timeout);
  };

  const handleStageInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-controls-bar]') || target.closest('button') || target.closest('input')) {
      handleMouseMove();
      return;
    }

    const isTouchEvent = 'changedTouches' in e;
    const now = Date.now();

    // Prevent synthetic duplicate click following touchend
    if (!isTouchEvent && now - lastTouchTimeRef.current < 500) {
      return;
    }
    if (isTouchEvent) {
      lastTouchTimeRef.current = now;
    }

    const touch = isTouchEvent ? (e as React.TouchEvent).changedTouches?.[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;

    const rect = stageContainerRef.current?.getBoundingClientRect();
    const containerWidth = rect?.width || (typeof window !== 'undefined' ? window.innerWidth : 500);
    const relativeX = rect ? clientX - rect.left : clientX;

    const isDoubleTap =
      lastTapRef.current &&
      now - lastTapRef.current.time < 350 &&
      Math.abs(clientX - lastTapRef.current.x) < 80;

    if (isDoubleTap) {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      lastTapRef.current = null;

      // Double press right side -> skip forward 10s
      // Double press left side -> skip backward 10s
      if (relativeX > containerWidth / 2) {
        handleSkip(10);
      } else {
        handleSkip(-10);
      }
      return;
    }

    lastTapRef.current = { time: now, x: clientX, y: clientY };

    if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    singleTapTimeoutRef.current = setTimeout(() => {
      singleTapTimeoutRef.current = null;
      setShowControls((prev) => {
        const next = !prev;
        if (next) {
          if (controlsTimeout) clearTimeout(controlsTimeout);
          const timeout = setTimeout(() => {
            if (mediaState.playing) {
              setShowControls(false);
            }
          }, 4000);
          setControlsTimeout(timeout);
        }
        return next;
      });
    }, 280);
  };

  const isDirectVideo =
    mediaState.url.startsWith('/movies/') ||
    mediaState.url.includes('.mp4') ||
    mediaState.url.includes('.webm') ||
    mediaState.url.includes('.mkv');

  const isFacebookVideo =
    !isDirectVideo &&
    (currentApp === 'facebook' ||
    mediaState.isFacebook ||
    mediaState.url.includes('facebook.com') ||
    mediaState.url.includes('fb.watch') ||
    mediaState.url.includes('share.google'));

  const fbEmbedSrc =
    mediaState.embedUrl ||
    (isFacebookVideo
      ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
          mediaState.url
        )}&show_text=0&autoplay=1`
      : '');

  return (
    <div
      ref={stageContainerRef}
      onMouseMove={handleMouseMove}
      onClick={handleStageInteraction}
      onTouchEnd={handleStageInteraction}
      className="relative w-full h-full flex flex-col items-center justify-center bg-[#0a0c10] overflow-hidden select-none touch-manipulation"
    >
      {/* Central Media Stage Area (Cinematic Edge-to-Edge like Hotstar / Prime) */}
      <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
          {/* Sub-Stage 1: Co-Browser */}
          {currentApp === 'browser' && <SharedBrowserStage />}

          {/* Sub-Stage 2: Screen Sharing */}
          {currentApp === 'screenshare' && <ScreenShareStage />}

          {/* Sub-Stage 3: Video Streaming (YouTube or Facebook/Web) */}
          {(currentApp === 'youtube' || currentApp === 'facebook') && (
            hasMounted && mediaState.url ? (
              isFacebookVideo ? (
                /* Fallback for blocked external Facebook links */
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/95 p-8 text-center select-none">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
                    <Play className="w-8 h-8 ml-0.5" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Synchronized HD Movie Available</h3>
                  <p className="text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">
                    Facebook embeds are blocked on external domains. Play our preloaded Shinchan movies with synchronized watch party controls!
                  </p>
                  <button
                    onClick={() => {
                      onSelectApp('youtube', {
                        url: '/movies/dance-amigo.mp4',
                        title: 'Shinchan: Dance Amigo (Hindi Dubbed)',
                      });
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-xl transition-all flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Watch Shinchan: Dance Amigo (HD Direct Stream)
                  </button>
                </div>
              ) : (
                /* Universal ReactPlayer for YouTube & Direct MP4 */
                <div className="relative w-full h-full flex items-center justify-center">
                  <ReactPlayer
                    ref={playerRef}
                    url={mediaState.url}
                    playing={mediaState.playing}
                    playbackRate={currentPlaybackRate}
                    volume={isMuted ? 0 : volume}
                    width="100%"
                    height="100%"
                    controls={false}
                    playsinline
                    onReady={() => {
                      if (!effectiveIsHost && typeof mediaState.currentTime === 'number' && mediaState.currentTime > 0 && !hasInitialSyncedRef.current) {
                        hasInitialSyncedRef.current = true;
                        lastRemoteTimeRef.current = mediaState.currentTime;
                        lastRemoteTimeUpdateRef.current = Date.now();
                        seekVideoTo(mediaState.currentTime);
                        setPlayedSeconds(mediaState.currentTime);
                      }
                    }}
                    onProgress={(state: { playedSeconds: number }) => {
                      if (isSeeking) return;

                      // Protect local time from stale progress during the 3.5s seek window
                      if (Date.now() - lastUserSeekRef.current < 3500) {
                        return;
                      }

                      setPlayedSeconds(state.playedSeconds);

                      // Broadcast progress if host or sole watcher ONLY:
                      const now = Date.now();
                      if (effectiveIsHost && now - lastTimeEmittedRef.current > 1000) {
                        lastTimeEmittedRef.current = now;
                        onTimeProgress?.(state.playedSeconds, duration);
                      }
                    }}
                    onDuration={(d: number) => {
                      setDuration(d);
                    }}
                    onBuffer={handleBufferStart}
                    onBufferEnd={handleBufferEnd}
                    onSeek={handleBufferEnd}
                    onPlay={handleBufferEnd}
                    onPause={handleBufferEnd}
                    onEnded={() => {
                      if (effectiveIsHost) onPlayPause(false);
                    }}
                    config={{
                      file: {
                        attributes: {
                          preload: 'auto',
                          playsInline: true,
                          controlsList: 'nodownload',
                        },
                      },
                      youtube: {
                        playerVars: {
                          modestbranding: 1,
                          rel: 0,
                        },
                      },
                    }}
                  />

                  {/* Autoplay Blocked Tap to Unmute Overlay */}
                  {isAutoplayBlocked && (
                    <div
                      onClick={() => {
                        const videoEl = stageContainerRef.current?.querySelector('video');
                        if (videoEl) {
                          videoEl.muted = false;
                          if (videoEl.paused && mediaState.playing) {
                            videoEl.play().catch(() => {});
                          }
                        }
                        setIsMuted(false);
                        setIsAutoplayBlocked(false);
                      }}
                      className="absolute top-16 left-1/2 -translate-x-1/2 z-35 cursor-pointer animate-bounce select-none"
                    >
                      <div className="px-4 py-2 rounded-full bg-indigo-600/90 hover:bg-indigo-500 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-2xl flex items-center gap-2">
                        <Volume2 className="w-4 h-4 animate-pulse text-yellow-300" />
                        <span>Tap anywhere to unmute audio</span>
                      </div>
                    </div>
                  )}

                  {/* Hotstar / YouTube Style On-Screen Skip Indicator & Ripple (+10s / -10s) */}
                  {skipFeedback?.type === 'forward' && (
                    <>
                      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-indigo-500/20 via-indigo-500/5 to-transparent rounded-l-full pointer-events-none z-25 animate-in fade-in duration-150" />
                      <div className="absolute right-8 sm:right-24 top-1/2 -translate-y-1/2 pointer-events-none z-30 flex flex-col items-center justify-center animate-in zoom-in-75 fade-in duration-150">
                        <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-black/80 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shadow-[0_0_35px_rgba(99,102,241,0.6)]">
                          <RotateCw className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400" />
                          <span className="text-xs sm:text-base font-bold font-mono text-white mt-0.5 sm:mt-1">+10s</span>
                          <span className="absolute -inset-2 rounded-full border border-indigo-500/50 animate-ping pointer-events-none" />
                        </div>
                      </div>
                    </>
                  )}

                  {skipFeedback?.type === 'backward' && (
                    <>
                      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-indigo-500/20 via-indigo-500/5 to-transparent rounded-r-full pointer-events-none z-25 animate-in fade-in duration-150" />
                      <div className="absolute left-8 sm:left-24 top-1/2 -translate-y-1/2 pointer-events-none z-30 flex flex-col items-center justify-center animate-in zoom-in-75 fade-in duration-150">
                        <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-black/80 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shadow-[0_0_35px_rgba(99,102,241,0.6)]">
                          <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400" />
                          <span className="text-xs sm:text-base font-bold font-mono text-white mt-0.5 sm:mt-1">-10s</span>
                          <span className="absolute -inset-2 rounded-full border border-indigo-500/50 animate-ping pointer-events-none" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Hotstar / Prime Video Loading / Buffering Placeholder (Only during active playback stall) */}
                  {mediaState.playing && (
                    <div
                      className={`absolute inset-0 z-25 pointer-events-none flex flex-col items-center justify-center transition-opacity duration-300 ${
                        isBuffering ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center px-6 py-4 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.85)]">
                        <div className="relative w-12 h-12 flex items-center justify-center mb-2">
                          <div className="w-10 h-10 rounded-full border-3 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                        </div>
                        <span className="text-xs font-mono font-bold tracking-widest uppercase text-white drop-shadow">
                          Loading...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Center Play Button on Pause (Always accessible for host, spectator indicator for guests) */}
                  {!mediaState.playing && (
                    effectiveIsHost ? (
                      <div
                        onClick={handlePlayPause}
                        className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer"
                        title="Resume Movie"
                      >
                        <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                          <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none select-none">
                        <div className="px-4 py-2.5 rounded-2xl bg-black/85 backdrop-blur-md border border-white/10 flex items-center gap-2.5 shadow-2xl">
                          <Pause className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                          <span className="text-xs font-semibold text-white/90">Paused by Host</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )
            ) : (
              /* Idle Video State */
              <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                  <Film className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5">No Video Loaded</h3>
                <p className="text-xs text-neutral-400 mb-5">
                  Select where you want to stream from (YouTube, Facebook, or direct link).
                </p>
                <button
                  onClick={onOpenAppSelector}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2"
                >
                  <Grid className="w-4 h-4" />
                  Select Video Source
                </button>
              </div>
            )
          )}

          {/* Sub-Stage 4: Empty Lounge (Lounge mode) */}
          {currentApp === 'lounge' && (
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-lg">
              <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 shadow-xl">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-2">
                Kosmi Living Room Lounge
              </h3>
              <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                Chill with voice & video chat, or click below to launch a synchronized movie or game.
              </p>
              <button
                onClick={onOpenAppSelector}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-xl transition-all flex items-center gap-2"
              >
                <Grid className="w-4 h-4" />
                Launch Application or Stream
              </button>
            </div>
          )}

          {/* Top Stage Bar with Sync Lock */}
          {(currentApp === 'youtube' || currentApp === 'facebook') && mediaState.url && (
            <div
              className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-white truncate max-w-sm">
                  {mediaState.title || (isFacebookVideo ? 'Facebook Video Stream' : 'YouTube Watch Party')}
                </span>
              </div>

              {/* Top title bar (unobtrusive Hotstar/Prime style) */}
            </div>
          )}

          {/* Bottom Video Controls Overlay (for YouTube/MP4) */}
          {!isFacebookVideo && mediaState.url && (
            <div
              data-controls-bar="true"
              onClick={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 ${
                isSidebarOpen ? 'pb-3 lg:pb-4' : 'pb-24 sm:pb-4'
              } bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-300 pointer-events-auto ${
                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                value={playedSeconds}
                disabled={!effectiveIsHost}
                onChange={effectiveIsHost ? handleSeekChange : undefined}
                onMouseUp={effectiveIsHost ? handleSeekCommit : undefined}
                onTouchEnd={effectiveIsHost ? handleSeekCommit : undefined}
                className={`w-full h-2 sm:h-1 bg-white/20 rounded-lg appearance-none accent-indigo-500 transition-all ${
                  effectiveIsHost ? 'cursor-pointer sm:hover:h-1.5' : 'cursor-default pointer-events-none'
                }`}
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${
                    duration ? (playedSeconds / duration) * 100 : 0
                  }%, rgba(255,255,255,0.2) ${duration ? (playedSeconds / duration) * 100 : 0}%, rgba(255,255,255,0.2) 100%)`,
                }}
              />

              <div className="flex items-center justify-between gap-1 sm:gap-4 pt-1">
                <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                  {effectiveIsHost ? (
                    <>
                      <button
                        onClick={handlePlayPause}
                        className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all shadow-md"
                        title={mediaState.playing ? 'Pause (Space)' : 'Play (Space)'}
                      >
                        {mediaState.playing ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleSkip(-10)}
                        className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-neutral-300 hover:text-white transition-all flex items-center gap-1"
                        title="Rewind 10s (Left Arrow)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono font-medium">-10s</span>
                      </button>

                      <button
                        onClick={() => handleSkip(10)}
                        className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-neutral-300 hover:text-white transition-all flex items-center gap-1"
                        title="Skip forward 10s (Right Arrow)"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono font-medium">+10s</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        disabled
                        className="w-9 h-9 rounded-xl bg-white/[0.04] text-neutral-500 flex items-center justify-center cursor-not-allowed"
                        title="Only the room host can pause or play"
                      >
                        {mediaState.playing ? (
                          <Pause className="w-4 h-4 fill-current opacity-40" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5 opacity-40" />
                        )}
                      </button>

                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-sans text-[11px]"
                        title="Only the room host can pause or skip"
                      >
                        <Tv className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-semibold">📺 Host Controls</span>
                      </div>
                    </>
                  )}

                  <div className="px-2.5 py-1 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-neutral-300">
                    <span className="text-white font-medium">{formatTime(playedSeconds)}</span>
                    <span className="text-neutral-600 mx-1">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-black/60 border border-white/10">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-neutral-400 hover:text-white transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(parseFloat(e.target.value));
                        setIsMuted(false);
                      }}
                      className="w-14 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-neutral-300 hover:text-white transition-all"
                  >
                    {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Overlaid Floating Webcam Video PIP Tiles (Only when sidebar is collapsed/closed to prevent duplicate video) */}
          {currentUser && !isSidebarOpen && (
            <ParticipantBubbles
              participants={participants}
              currentUserId={currentUser.id}
              localStream={localStream}
            />
          )}
        </div>
      </div>
    </div>
  );
};
