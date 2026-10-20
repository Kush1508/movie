'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Crown, Tv, Minus, Maximize2, X, Eye } from 'lucide-react';
import { Participant } from '@/types';

interface ParticipantBubblesProps {
  participants: Participant[];
  currentUserId: string;
  localStream: MediaStream | null;
}

const VideoTile: React.FC<{
  participant: Participant;
  isMe: boolean;
  stream: MediaStream | null;
}> = ({ participant, isMe, stream }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {});
    }
  };

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream) return;

    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }
    videoEl.play().catch(() => {});

    const handleTrackChange = () => {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.play().catch(() => {});
    };

    stream.addEventListener('addtrack', handleTrackChange);
    stream.addEventListener('removetrack', handleTrackChange);

    return () => {
      stream.removeEventListener('addtrack', handleTrackChange);
      stream.removeEventListener('removetrack', handleTrackChange);
    };
  }, [stream, participant.isVideoMuted]);

  const hasVideoTrack = Boolean(
    stream &&
      stream.getVideoTracks().length > 0 &&
      stream.getVideoTracks().some((t) => t.enabled)
  );
  const hasActiveVideo = (!participant.isVideoMuted || hasVideoTrack) && Boolean(stream);

  // If user has video muted and no active stream, don't block the video stage
  if (!hasActiveVideo) return null;

  if (isHidden) {
    return (
      <button
        onClick={() => setIsHidden(false)}
        className="p-1.5 rounded-xl bg-black/60 hover:bg-black/90 border border-white/10 text-neutral-400 hover:text-white backdrop-blur-md shadow-lg transition-all flex items-center gap-1.5 text-[11px]"
        title="Show video PIP"
      >
        <Eye className="w-3.5 h-3.5 text-indigo-400" />
        <span>Camera</span>
      </button>
    );
  }

  // Minimized Compact Avatar Bubble (takes virtually no space and never blocks the movie)
  if (isMinimized) {
    return (
      <motion.div
        drag
        dragConstraints={{ top: -50, bottom: 400, left: -600, right: 50 }}
        dragElastic={0.05}
        className="relative group cursor-grab active:cursor-grabbing"
      >
        <div
          onClick={() => setIsMinimized(false)}
          className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 shadow-2xl transition-transform hover:scale-110 flex items-center justify-center bg-zinc-900 ${
            participant.isSpeaking
              ? 'border-emerald-400 ring-2 ring-emerald-400/50'
              : 'border-white/20'
          }`}
          style={{ backgroundColor: participant.color + '33' }}
          title={`${participant.name} - Click to expand`}
        >
          <img
            src={participant.avatar}
            alt={participant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <Maximize2 className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {participant.isHost && (
          <span className="absolute -top-1 -left-1 px-1 py-0.2 rounded bg-amber-500 text-black text-[7px] font-bold shadow flex items-center gap-0.5 z-10">
            📺 Host
          </span>
        )}

        {participant.isAudioMuted && (
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-red-600 border border-black flex items-center justify-center text-white">
            <MicOff className="w-2 sm:w-2.5 h-2 sm:h-2.5" />
          </span>
        )}
      </motion.div>
    );
  }

  // Draggable, Minimizable Floating Video Card
  return (
    <motion.div
      drag
      dragConstraints={{ top: -50, bottom: 450, left: -600, right: 50 }}
      dragElastic={0.08}
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`group relative flex flex-col items-center overflow-hidden rounded-xl sm:rounded-2xl bg-zinc-900/90 backdrop-blur-xl border transition-all duration-200 shadow-2xl cursor-grab active:cursor-grabbing w-[110px] h-[75px] sm:w-[150px] sm:h-[100px] ${
        participant.isSpeaking
          ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] ring-2 ring-indigo-500/50'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Remote Host Badge */}
      {participant.isHost && (
        <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-black text-[8px] font-bold shadow-md tracking-wider pointer-events-none">
          <Tv className="w-2.5 h-2.5" />
          <span>HOST</span>
        </div>
      )}

      {/* Active Video Stream */}
      <video
        ref={setVideoRef}
        autoPlay
        playsInline
        muted={true} // Audio is handled cleanly by dedicated RemoteAudio elements
        className={`h-full w-full object-cover ${isMe ? 'scale-x-[-1]' : ''}`}
      />

      {/* Top Header Action Buttons (Minimize, Close/Hide) */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(true);
          }}
          className="p-1 rounded-md bg-black/70 hover:bg-black/90 text-neutral-300 hover:text-white transition-colors"
          title="Minimize video"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsHidden(true);
          }}
          className="p-1 rounded-md bg-black/70 hover:bg-black/90 text-neutral-300 hover:text-white transition-colors"
          title="Hide video"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Floating Bottom Info Pill */}
      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between rounded-md bg-black/75 px-1.5 py-0.5 backdrop-blur-md border border-white/5 pointer-events-none">
        <div className="flex items-center gap-1 min-w-0">
          {participant.isHost && (
            <span className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[8px] font-bold shrink-0">
              <Tv className="h-2 w-2 text-amber-300" />
              <span>Host</span>
            </span>
          )}
          <span className="truncate text-[10px] font-medium text-white" title={`${participant.name} ${isMe ? '(You)' : ''}`}>
            {participant.name} {isMe ? '(You)' : ''}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {participant.isSpeaking && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          )}
          {participant.isAudioMuted ? (
            <MicOff className="h-2.5 w-2.5 text-red-400" />
          ) : (
            <Mic className="h-2.5 w-2.5 text-emerald-400" />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const ParticipantBubbles: React.FC<ParticipantBubblesProps> = ({
  participants,
  currentUserId,
  localStream,
}) => {
  return (
    <div className="absolute top-14 right-2 sm:top-16 sm:right-4 z-30 flex flex-col gap-1.5 sm:gap-2.5 pointer-events-auto">
      <AnimatePresence>
        {participants.map((p) => {
          const isMe = p.id === currentUserId;
          return (
            <VideoTile
              key={p.id}
              participant={p}
              isMe={isMe}
              stream={isMe ? localStream : p.stream ?? null}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
};
