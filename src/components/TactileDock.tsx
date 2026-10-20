'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Film,
  Globe,
  MonitorUp,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  Sparkles,
  Share2,
} from 'lucide-react';
import { StageMode } from '@/types';
import { soundboard } from '@/lib/soundboard';

interface TactileDockProps {
  currentMode: StageMode;
  onSwitchMode: (mode: StageMode) => void;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: (tab?: 'chat' | 'soundboard' | 'invite') => void;
  unreadCount?: number;
}

export const TactileDock: React.FC<TactileDockProps> = ({
  currentMode,
  onSwitchMode,
  isAudioMuted,
  isVideoMuted,
  onToggleAudio,
  onToggleVideo,
  isSidebarOpen,
  onToggleSidebar,
  unreadCount = 0,
}) => {
  const dockApps = [
    { mode: 'video' as StageMode, label: 'Cinema', icon: Film },
    { mode: 'browser' as StageMode, label: 'Browser', icon: Globe },
    { mode: 'screen' as StageMode, label: 'Screen Share', icon: MonitorUp },
  ];

  const handleAppClick = (mode: StageMode) => {
    soundboard.playClick(900);
    onSwitchMode(mode);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center pointer-events-auto">
      {/* 21st.dev Floating Acrylic Capsule Dock */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        className="relative flex items-center gap-1.5 p-1.5 bg-neutral-900/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.06)]"
      >
        {/* Stage Apps Switcher */}
        <div className="flex items-center gap-1 pr-2 border-r border-white/10">
          {dockApps.map((app) => {
            const Icon = app.icon;
            const isActive = currentMode === app.mode;

            return (
              <motion.button
                key={app.mode}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAppClick(app.mode)}
                title={app.label}
                className={`relative px-3 py-2 rounded-full text-xs font-medium transition-all duration-150 flex items-center gap-1.5 select-none ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-lg'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{app.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Media Input Toggles: Mic & Camera */}
        <div className="flex items-center gap-1 px-1 border-r border-white/10">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleAudio}
            title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
            className={`p-2.5 rounded-full transition-all ${
              isAudioMuted
                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleVideo}
            title={isVideoMuted ? 'Start Camera' : 'Stop Camera'}
            className={`p-2.5 rounded-full transition-all ${
              isVideoMuted
                ? 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.05]'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isVideoMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </motion.button>
        </div>

        {/* Tools: Soundboard, Chat Drawer, Share */}
        <div className="flex items-center gap-1 pl-1">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggleSidebar('soundboard')}
            title="Soundboard FX"
            className="p-2.5 rounded-full text-neutral-300 hover:text-amber-300 hover:bg-white/[0.08] transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggleSidebar('chat')}
            title="Room Chat"
            className={`relative p-2.5 rounded-full transition-all ${
              isSidebarOpen
                ? 'bg-white/20 text-white'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            {unreadCount > 0 && !isSidebarOpen && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggleSidebar('invite')}
            title="Share Room Link"
            className="p-2.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <Share2 className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
