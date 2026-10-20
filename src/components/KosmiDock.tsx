'use client';

import React from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MessageSquare,
  Users,
  Share2,
  Grid,
} from 'lucide-react';

interface KosmiDockProps {
  onOpenAppSelector: () => void;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  isSidebarOpen: boolean;
  activeSidebarTab: 'chat' | 'users' | 'soundboard' | 'invite';
  onToggleSidebar: (tab: 'chat' | 'users' | 'soundboard' | 'invite') => void;
  unreadCount?: number;
}

export const KosmiDock: React.FC<KosmiDockProps> = ({
  onOpenAppSelector,
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  isSidebarOpen,
  activeSidebarTab,
  onToggleSidebar,
  unreadCount = 0,
}) => {
  return (
    <div className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center pointer-events-auto max-w-[calc(100vw-1rem)] touch-manipulation">
      {/* Kosmi Dock Capsule */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 bg-[#12151c]/95 backdrop-blur-xl border border-[#262c3c] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.04)]">
        {/* Core Media Controls: Mic, Camera */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Mic */}
          <button
            onClick={onToggleAudio}
            title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            className={`p-2 sm:p-2.5 rounded-xl transition-all ${
              isAudioMuted
                ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                : 'bg-[#1c202c] hover:bg-[#252a3a] text-emerald-400 border border-[#2b3345]'
            }`}
          >
            {isAudioMuted ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Camera */}
          <button
            onClick={onToggleVideo}
            title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
            className={`p-2 sm:p-2.5 rounded-xl transition-all ${
              isVideoMuted
                ? 'bg-[#1c202c] hover:bg-[#252a3a] text-neutral-400 border border-[#2b3345]'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isVideoMuted ? <VideoOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>

        <div className="w-px h-5 sm:h-6 bg-[#252b3b] mx-0.5 sm:mx-1" />

        {/* Social Utilities: Chat, Users, Sounds, Invite */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Soundboard */}
          <button
            onClick={() => onToggleSidebar('soundboard')}
            title="Soundboard FX"
            className={`p-2 sm:p-2.5 rounded-xl transition-all ${
              isSidebarOpen && activeSidebarTab === 'soundboard'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'bg-[#1c202c] hover:bg-[#252a3a] text-neutral-300 border border-[#2b3345]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          </button>

          {/* Chat Drawer Toggle */}
          <button
            onClick={() => onToggleSidebar('chat')}
            title="Room Chat"
            className={`relative p-2 sm:p-2.5 rounded-xl transition-all ${
              isSidebarOpen && activeSidebarTab === 'chat'
                ? 'bg-indigo-600 text-white'
                : 'bg-[#1c202c] hover:bg-[#252a3a] text-neutral-300 border border-[#2b3345]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {unreadCount > 0 && !(isSidebarOpen && activeSidebarTab === 'chat') && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </button>

          {/* Users List Toggle */}
          <button
            onClick={() => onToggleSidebar('users')}
            title="Participants List"
            className={`p-2 sm:p-2.5 rounded-xl transition-all ${
              isSidebarOpen && activeSidebarTab === 'users'
                ? 'bg-indigo-600 text-white'
                : 'bg-[#1c202c] hover:bg-[#252a3a] text-neutral-300 border border-[#2b3345]'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Invite Link */}
          <button
            onClick={() => onToggleSidebar('invite')}
            title="Invite Friends"
            className="p-2 sm:p-2.5 rounded-xl bg-[#1c202c] hover:bg-[#252a3a] text-neutral-300 hover:text-white border border-[#2b3345] transition-all"
          >
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
