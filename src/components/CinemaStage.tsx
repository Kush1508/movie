'use client';

import React, { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Sparkles,
  Link2,
  Film,
  ExternalLink,
  Facebook,
  Radio,
} from 'lucide-react';
import { MediaState } from '@/types';
import { soundboard } from '@/lib/soundboard';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface CinemaStageProps {
  mediaState: MediaState;
  onPlayPause: (playing: boolean) => void;
  onSeek: (seconds: number) => void;
  onOpenUrlModal: () => void;
  isHost: boolean;
}

export const CinemaStage: React.FC<CinemaStageProps> = ({
  mediaState,
  onPlayPause,
  onSeek,
  onOpenUrlModal,
  isHost,
}) => {
  const playerRef = useRef<any>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);

  const [hasMounted, setHasMounted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [ambientGlow, setAmbientGlow] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!isSeeking && playerRef.current && Math.abs(playedSeconds - mediaState.currentTime) > 2) {
      playerRef.current.seekTo(mediaState.currentTime, 'seconds');
    }
  }, [mediaState.currentTime, isSeeking, playedSeconds]);

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
    const nextState = !mediaState.playing;
    onPlayPause(nextState);
    soundboard.playClick(nextState ? 900 : 700);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetSec = parseFloat(e.target.value);
    setPlayedSeconds(targetSec);
    setIsSeeking(true);
  };

  const handleSeekCommit = () => {
    setIsSeeking(false);
    onSeek(playedSeconds);
    if (playerRef.current) {
      playerRef.current.seekTo(playedSeconds, 'seconds');
    }
  };

  const toggleFullscreen = () => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
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

  const isFacebookVideo =
    mediaState.isFacebook ||
    mediaState.url.includes('facebook.com') ||
    mediaState.url.includes('fb.watch') ||
    mediaState.url.includes('share.google');

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
      className="relative w-full h-full flex flex-col items-center justify-center bg-[#070709] overflow-hidden select-none group"
    >
      {/* 21st.dev Ambient Radial Light */}
      {ambientGlow && (
        <div
          className={`absolute -inset-10 pointer-events-none transition-opacity duration-1000 ${
            mediaState.playing ? 'opacity-30 blur-[130px]' : 'opacity-10 blur-[90px]'
          }`}
          style={{
            background: isFacebookVideo
              ? 'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.4) 0%, rgba(30, 64, 175, 0.1) 50%, transparent 75%)'
              : 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.45) 0%, rgba(79, 70, 229, 0.1) 50%, transparent 75%)',
          }}
        />
      )}

      {/* Main Viewport Container */}
      <div className="relative w-full h-full max-w-[94vw] max-h-[86vh] flex items-center justify-center p-2 sm:p-4">
        <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04)] flex items-center justify-center">
          {hasMounted && mediaState.url ? (
            isFacebookVideo ? (
              /* Facebook Video Embed Stage */
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <iframe
                  src={fbEmbedSrc}
                  width="100%"
                  height="100%"
                  className="w-full h-full border-none"
                  style={{ border: 'none', overflow: 'hidden' }}
                  scrolling="no"
                  frameBorder="0"
                  allowFullScreen={true}
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
                  title={mediaState.title || 'Facebook Video Stream'}
                />
              </div>
            ) : (
              /* Universal Player Stage (YouTube, Direct MP4, Web) */
              <div className="relative w-full h-full flex items-center justify-center">
                <ReactPlayer
                  ref={playerRef}
                  url={mediaState.url}
                  playing={mediaState.playing}
                  volume={isMuted ? 0 : volume}
                  width="100%"
                  height="100%"
                  controls={false}
                  playsinline
                  onProgress={(state: { playedSeconds: number }) => {
                    if (!isSeeking) {
                      setPlayedSeconds(state.playedSeconds);
                    }
                  }}
                  onDuration={(d: number) => setDuration(d)}
                  onEnded={() => onPlayPause(false)}
                  config={{
                    file: {
                      attributes: {
                        crossOrigin: 'anonymous',
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

                {/* Centered Minimal Play Trigger on Pause */}
                <AnimatePresence>
                  {!mediaState.playing && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={handlePlayPause}
                      className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-2xl"
                      >
                        <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          ) : (
            /* 21st.dev Sleek Empty State */
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-5 text-indigo-400 shadow-xl">
                <Film className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-white tracking-tight mb-2">
                Stage Idle
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-sans">
                Paste any Facebook movie link, YouTube 4K stream, or direct MP4 URL to start co-watching.
              </p>
              <button
                onClick={onOpenUrlModal}
                className="px-5 py-2.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-semibold shadow-lg transition-all flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                Add Stream Link
              </button>
            </div>
          )}

          {/* Top Stage Header Overlay */}
          <div
            className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-between transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white tracking-tight truncate max-w-sm">
                  {mediaState.title || (mediaState.url ? 'Custom Stream' : 'Cinema Stage')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] text-neutral-400 border border-white/[0.06] font-mono">
                  {isFacebookVideo ? 'Facebook Video' : mediaState.url ? 'Ultra-HD' : 'Ready'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08] text-[10px] font-mono text-neutral-300 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400" />
                <span>SYNC LOCK</span>
              </div>
              <button
                onClick={() => setAmbientGlow(!ambientGlow)}
                className={`p-1.5 rounded-full border transition-all ${
                  ambientGlow
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-transparent border-white/[0.08] text-neutral-500'
                }`}
                title="Toggle Ambient Glow"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Floating Scrubber & Playback Pill Overlay */}
          {!isFacebookVideo && (
            <div
              className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col gap-2 transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Timeline Track */}
              <div className="relative flex items-center w-full group/scrub cursor-pointer">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={playedSeconds}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekCommit}
                  onTouchEnd={handleSeekCommit}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:h-1.5 transition-all"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${
                      duration ? (playedSeconds / duration) * 100 : 0
                    }%, rgba(255,255,255,0.15) ${duration ? (playedSeconds / duration) * 100 : 0}%, rgba(255,255,255,0.15) 100%)`,
                  }}
                />
              </div>

              {/* Controls Bar */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlayPause}
                    className="w-8 h-8 rounded-full bg-white text-black hover:bg-neutral-200 flex items-center justify-center transition-all"
                  >
                    {mediaState.playing ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      const next = Math.max(0, playedSeconds - 10);
                      onSeek(next);
                      if (playerRef.current) playerRef.current.seekTo(next, 'seconds');
                    }}
                    className="p-2 rounded-full hover:bg-white/10 text-neutral-300 hover:text-white transition-all"
                    title="Rewind 10s"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <div className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] font-mono text-[11px] text-neutral-300">
                    <span className="text-white">{formatTime(playedSeconds)}</span>
                    <span className="text-neutral-600 mx-1">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Volume Slider */}
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08]">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-neutral-400 hover:text-white transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-neutral-200" />
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
                      className="w-14 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  <button
                    onClick={onOpenUrlModal}
                    className="px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Change Link</span>
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-full hover:bg-white/10 text-neutral-300 hover:text-white transition-all"
                  >
                    {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
