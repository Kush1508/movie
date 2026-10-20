'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  Globe,
  Share2,
  Tv,
  Edit2,
  Users,
} from 'lucide-react';
import { Participant } from '@/types';
import { KosmiAppId } from './KosmiAppSelector';
import { soundboard } from '@/lib/soundboard';

interface KosmiTopBarProps {
  roomId: string;
  currentUser: Participant | null;
  activeAppTitle: string;
  onOpenAppSelector: () => void;
  onUpdateNickname: (newName: string) => void;
  participantCount: number;
  hostName?: string;
}

export const KosmiTopBar: React.FC<KosmiTopBarProps> = ({
  roomId,
  currentUser,
  activeAppTitle,
  onOpenAppSelector,
  onUpdateNickname,
  participantCount,
  hostName,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(currentUser?.name || '');

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '0';
      textArea.style.top = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopied(true);
        soundboard.playClick(900);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.warn('Fallback copy error:', err);
    }
  };

  const handleCopy = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Copy the exact Room ID (e.g. 10v6f7) as displayed on the button
    const textToCopy = roomId;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          setCopied(true);
          soundboard.playClick(900);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          fallbackCopy(textToCopy);
        });
    } else {
      fallbackCopy(textToCopy);
    }
  };

  const handleSaveName = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (tempName.trim()) {
      onUpdateNickname(tempName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <header className="relative z-30 h-12 sm:h-13 px-2 sm:px-4 md:px-6 flex items-center justify-between border-b border-[#222634] bg-[#101218]/90 backdrop-blur-md select-none gap-2">
      {/* Left: Kosmi Logo & Room ID */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Back to Home Link */}
        <a
          href="/"
          className="px-2 py-1 rounded-lg bg-[#161820] hover:bg-[#1f2330] border border-[#272b3a] text-xs font-mono text-neutral-400 hover:text-white transition-all flex items-center gap-1"
          title="Back to Home"
        >
          <span>←</span>
          <span className="hidden sm:inline">Home</span>
        </a>

        {/* Room ID Badge & Copy Pill */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-[#191c25] hover:bg-[#222736] active:scale-95 border border-[#292e3e] hover:border-indigo-500/50 rounded-xl text-xs text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm group"
          title={`Click to copy Room ID: ${roomId}`}
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300 transition-colors shrink-0" />
          <span className="font-mono text-[11px] truncate max-w-[80px] sm:max-w-none">
            {copied ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                Copied!
              </span>
            ) : (
              `#${roomId}`
            )}
          </span>
          <span className="p-0.5 rounded text-neutral-400 group-hover:text-white transition-colors shrink-0 hidden sm:inline-block">
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </span>
        </button>
      </div>

      {/* Center: Active Application Switcher Button */}
      <div className="flex items-center min-w-0">
        <button
          onClick={onOpenAppSelector}
          className="group flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-[#1a1e29] hover:bg-[#222836] border border-[#2b3243] hover:border-indigo-500/50 text-[11px] sm:text-xs font-medium text-neutral-200 transition-all shadow-sm max-w-full"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate max-w-[85px] xs:max-w-[130px] sm:max-w-[200px] md:max-w-xs">{activeAppTitle}</span>
          <span className="hidden md:inline-block text-[11px] px-1.5 py-0.2 rounded bg-indigo-600/30 text-indigo-300 font-sans group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            Switch App
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-transform group-hover:translate-y-0.5 shrink-0" />
        </button>
      </div>

      {/* Right: Guest Identity & Edit Nickname */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {currentUser?.isHost ? (
          <div
            className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold shadow-sm select-none"
            title="You are the Room Host (Playback Controller)"
          >
            <Tv className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[11px]">📺 Host</span>
          </div>
        ) : hostName ? (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-[#181b24] border border-[#252a39] rounded-xl text-xs select-none"
            title={`Room Host (Playback Controller): ${hostName}`}
          >
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-amber-300 font-medium truncate max-w-[100px]">
              Host: {hostName}
            </span>
          </div>
        ) : null}

        <div className="flex items-center gap-1 px-2 py-1 bg-[#181b24] border border-[#252a39] rounded-xl text-xs">
          <Users className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-[11px] font-mono text-neutral-300">{participantCount}</span>
        </div>

        {currentUser && (
          <div className="relative">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="px-2 py-0.5 bg-[#0f1117] border border-indigo-500 rounded text-base sm:text-xs text-white font-medium outline-none w-24 sm:w-28"
                  autoFocus
                  onBlur={handleSaveName}
                />
              </form>
            ) : (
              <button
                onClick={() => {
                  setTempName(currentUser.name);
                  setIsEditingName(true);
                }}
                className="flex items-center gap-1.5 p-1 pl-1.5 sm:pl-2.5 rounded-xl bg-[#181b24] hover:bg-[#202430] border border-[#252a39] text-xs font-medium text-white transition-colors group"
                title="Click to edit nickname"
              >
                <span className="hidden sm:inline max-w-[80px] md:max-w-[100px] truncate">{currentUser.name}</span>
                <Edit2 className="w-3 h-3 text-neutral-500 group-hover:text-neutral-300 hidden sm:inline-block" />
                <div
                  className="w-6 h-6 rounded-lg overflow-hidden border border-[#303649] shrink-0"
                  style={{ backgroundColor: currentUser.color + '33' }}
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
