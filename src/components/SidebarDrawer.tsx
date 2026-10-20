'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Sparkles,
  Share2,
  Users,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Crown,
} from 'lucide-react';
import { ChatMessage, Participant } from '@/types';
import { SOUND_EFFECTS, soundboard } from '@/lib/soundboard';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'chat' | 'soundboard' | 'invite' | 'users';
  onChangeTab: (tab: 'chat' | 'soundboard' | 'invite' | 'users') => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onTriggerSound: (soundId: string) => void;
  onSendReaction: (emoji: string) => void;
  participants: Participant[];
  roomId: string;
  currentUserId: string;
}

const REACTION_EMOJIS = ['🍿', '🔥', '😱', '😂', '👏', '💀', '❤️', '🍻'];

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
  messages,
  onSendMessage,
  onTriggerSound,
  onSendReaction,
  participants,
  roomId,
  currentUserId,
}) => {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [soundboardMuted, setSoundboardMuted] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopyLink = () => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    soundboard.playClick(900);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSoundClick = (soundId: string) => {
    if (soundboardMuted) return;
    onTriggerSound(soundId);
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed top-0 right-0 bottom-0 w-full sm:w-88 z-50 bg-neutral-950/90 backdrop-blur-2xl border-l border-white/[0.08] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header & Tabs */}
      <div className="flex flex-col border-b border-white/[0.06] p-3 pb-0 bg-white/[0.01]">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-mono font-medium text-neutral-300 uppercase tracking-wider">
              Console
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 border-t border-white/[0.04] pt-1">
          <button
            onClick={() => onChangeTab('chat')}
            className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 rounded-lg transition-all ${
              activeTab === 'chat'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => onChangeTab('soundboard')}
            className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 rounded-lg transition-all ${
              activeTab === 'soundboard'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sounds</span>
          </button>

          <button
            onClick={() => onChangeTab('users')}
            className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 rounded-lg transition-all ${
              activeTab === 'users'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Peers</span>
          </button>

          <button
            onClick={() => onChangeTab('invite')}
            className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 rounded-lg transition-all ${
              activeTab === 'invite'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite</span>
          </button>
        </div>
      </div>

      {/* Tab: Chat */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 bg-transparent">
          {/* Reaction Bar */}
          <div className="px-3 py-2 border-b border-white/[0.04] flex items-center justify-between gap-1 overflow-x-auto">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider shrink-0">
              React:
            </span>
            <div className="flex items-center gap-1">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSendReaction(emoji)}
                  className="text-sm p-1 hover:scale-125 hover:bg-white/10 rounded-md transition-all select-none"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                <MessageSquare className="w-7 h-7 mb-2 opacity-30" />
                <p className="text-xs font-mono">No messages yet. Say hi!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;

                if (msg.type === 'sound') {
                  return (
                    <div
                      key={msg.id}
                      className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-300 text-xs font-mono flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>
                        <strong className="text-white">{msg.senderName}</strong> played {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-medium text-neutral-400">
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] text-neutral-600 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs break-words shadow-sm ${
                        isMe
                          ? 'bg-white text-black font-medium'
                          : 'bg-white/[0.06] text-neutral-100 border border-white/[0.08]'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Form */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-white/[0.06] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Message room..."
              className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder-neutral-500 focus:border-white/20 outline-none font-sans"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-white text-black hover:bg-neutral-200 disabled:opacity-30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Tab: Soundboard */}
      {activeTab === 'soundboard' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-transparent">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Soundboard
              </h3>
              <p className="text-[11px] text-neutral-400">
                Trigger instant sounds to everyone
              </p>
            </div>
            <button
              onClick={() => setSoundboardMuted(!soundboardMuted)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
              title={soundboardMuted ? 'Unmute' : 'Mute'}
            >
              {soundboardMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {SOUND_EFFECTS.map((sound) => (
              <button
                key={sound.id}
                onClick={() => handleSoundClick(sound.id)}
                className="group flex flex-col items-start p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.06] active:scale-95 transition-all text-left"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xl group-hover:scale-110 transition-transform">
                    {sound.emoji}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-white" />
                </div>
                <span className="text-xs font-medium text-white">
                  {sound.name}
                </span>
                <span className="text-[10px] text-neutral-500 mt-0.5">{sound.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-3">
            Peers Connected ({participants.length})
          </h3>
          {participants.map((p) => {
            const isMe = p.id === currentUserId;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg overflow-hidden border border-white/10"
                    style={{ backgroundColor: p.color + '22' }}
                  >
                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-white">{p.name}</span>
                      {p.isHost && (
                        <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                          <Crown className="w-2.5 h-2.5" /> HOST
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {isMe ? 'You' : 'Guest'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Invite */}
      {activeTab === 'invite' && (
        <div className="flex-1 p-5 overflow-y-auto flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Invite Friends
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed mt-1">
                Zero sign-up required. Anyone with this link enters instantly.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Shareable Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : `room/${roomId}`}
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs font-mono text-neutral-200 select-all outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2 rounded-xl bg-white text-black hover:bg-neutral-200 font-medium transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 mt-1">
                  <Check className="w-3.5 h-3.5" /> Copied to clipboard!
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
