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
  Tv,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from 'lucide-react';
import { ChatMessage, Participant } from '@/types';
import { SOUND_EFFECTS, soundboard } from '@/lib/soundboard';

interface KosmiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'chat' | 'users' | 'soundboard' | 'invite';
  onChangeTab: (tab: 'chat' | 'users' | 'soundboard' | 'invite') => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onTriggerSound: (soundId: string) => void;
  onSendReaction: (emoji: string) => void;
  participants: Participant[];
  roomId: string;
  currentUserId: string;
  isInline?: boolean;
  localStream?: MediaStream | null;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
}

const REACTION_EMOJIS = ['🍿', '🔥', '😂', '👏', '❤️', '💀', '🎉', '🍻'];

const LiveParticipantTile: React.FC<{
  participant: Participant;
  isMe: boolean;
  stream: MediaStream | null;
}> = ({ participant, isMe, stream }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
  const hasVideo = (!participant.isVideoMuted || hasVideoTrack) && Boolean(stream);

  return (
    <div className="relative aspect-video max-h-24 sm:max-h-28 lg:max-h-none rounded-xl overflow-hidden bg-[#0a0c10] border border-[#232838] flex items-center justify-center group">
      {/* Remote Host Badge */}
      {participant.isHost && (
        <div className="absolute top-1 left-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-black text-[9px] font-bold shadow-md tracking-wider pointer-events-none">
          <Tv className="w-2.5 h-2.5" />
          <span>HOST</span>
        </div>
      )}

      {hasVideo ? (
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted={true}
          className={`w-full h-full object-cover ${isMe ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 p-1">
          <img
            src={participant.avatar}
            alt={participant.name}
            className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full border border-white/10"
          />
        </div>
      )}

      {/* Bottom Info Pill */}
      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] text-white">
        <div className="flex items-center gap-1 min-w-0 flex-1 mr-1">
          {participant.isHost && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[8px] font-bold shrink-0">
              <Tv className="w-2 h-2 text-amber-300" />
              <span>Host</span>
            </span>
          )}
          <span className="truncate font-medium" title={`${participant.name} ${isMe ? '(You)' : ''}`}>
            {participant.name} {isMe ? '(You)' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {participant.isSpeaking && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          )}
          {participant.isAudioMuted ? (
            <MicOff className="w-2.5 h-2.5 text-red-400" />
          ) : (
            <Mic className="w-2.5 h-2.5 text-emerald-400" />
          )}
        </div>
      </div>
    </div>
  );
};

export const KosmiSidebar: React.FC<KosmiSidebarProps> = ({
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
  isInline = false,
  localStream = null,
  onToggleAudio,
  onToggleVideo,
  isAudioMuted = false,
  isVideoMuted = true,
}) => {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [soundboardMuted, setSoundboardMuted] = useState(false);
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>({});
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

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.setAttribute('readonly', '');
      textArea.style.contain = 'strict';
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      const selection = document.getSelection();
      const originalRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      document.body.appendChild(textArea);
      textArea.select();
      textArea.selectionStart = 0;
      textArea.selectionEnd = text.length;
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (originalRange && selection) {
        selection.removeAllRanges();
        selection.addRange(originalRange);
      }
      if (successful) {
        setCopied(true);
        soundboard.playClick(900);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.warn('Fallback copy error:', err);
    }
  };

  const handleCopyLink = () => {
    const textToCopy = typeof window !== 'undefined' ? `${window.location.origin}/room/${roomId}` : roomId;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          setCopied(true);
          soundboard.playClick(900);
          setTimeout(() => setCopied(false), 2500);
        })
        .catch(() => {
          fallbackCopy(textToCopy);
        });
    } else {
      fallbackCopy(textToCopy);
    }
  };

  const handleVolumeChange = (userId: string, val: number) => {
    setUserVolumes((prev) => ({ ...prev, [userId]: val }));
  };

  if (!isOpen) return null;

  const sidebarContent = (
    <aside className={isInline ? "relative w-full h-full flex flex-col bg-[#10121a] overflow-hidden" : "fixed top-0 right-0 bottom-0 w-full sm:w-[380px] max-w-[90vw] z-50 bg-[#12151c]/95 backdrop-blur-2xl border-l border-[#262c3c] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"}>
      {/* Top Header & Kosmi Tabs */}
      <div className="flex flex-col border-b border-[#222736] p-3 pb-0 bg-[#141824]">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Live Party Room
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {onToggleAudio && (
              <button
                type="button"
                onClick={onToggleAudio}
                title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
                className={`p-1.5 rounded-lg border transition-all lg:hidden ${
                  isAudioMuted
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : 'bg-[#1c202c] text-emerald-400 border-[#2b3345]'
                }`}
              >
                {isAudioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            )}
            {onToggleVideo && (
              <button
                type="button"
                onClick={onToggleVideo}
                title={isVideoMuted ? 'Turn Cam On' : 'Turn Cam Off'}
                className={`p-1.5 rounded-lg border transition-all lg:hidden ${
                  isVideoMuted
                    ? 'bg-[#1c202c] text-neutral-400 border-[#2b3345]'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isVideoMuted ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dedicated Live Video & Voice Feeds */}
        {participants.length > 0 && (
          <div className="pb-2 pt-0.5">
            <div className={`grid gap-2 ${
              participants.length === 1
                ? 'grid-cols-1 max-w-[200px] sm:max-w-[240px] lg:max-w-none mx-auto lg:mx-0'
                : 'grid-cols-2'
            }`}>
              {participants.slice(0, 4).map((p) => (
                <LiveParticipantTile
                  key={p.id}
                  participant={p}
                  isMe={p.id === currentUserId}
                  stream={p.id === currentUserId ? (localStream ?? null) : (p.stream ?? null)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 border-t border-[#222736] pt-1">
          <button
            onClick={() => onChangeTab('chat')}
            className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 rounded-lg transition-all ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => onChangeTab('users')}
            className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 rounded-lg transition-all ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Peers ({participants.length})</span>
          </button>

          <button
            onClick={() => onChangeTab('soundboard')}
            className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 rounded-lg transition-all ${
              activeTab === 'soundboard'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sounds</span>
          </button>

          <button
            onClick={() => onChangeTab('invite')}
            className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 rounded-lg transition-all ${
              activeTab === 'invite'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Chat */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 bg-transparent">
          {/* Reaction Bar */}
          <div className="px-3 py-2 border-b border-[#222736] flex items-center justify-between gap-1 overflow-x-auto bg-[#141721]">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider shrink-0">
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
                <MessageSquare className="w-8 h-8 mb-2 opacity-30 text-indigo-400" />
                <p className="text-xs font-mono">No messages yet. Say hi to friends!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;

                if (msg.type === 'sound') {
                  return (
                    <div
                      key={msg.id}
                      className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono flex items-center gap-2"
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
                      <span className="text-[11px] font-semibold" style={{ color: msg.senderColor }}>
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs break-words shadow-sm ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-xs'
                          : 'bg-[#1e2330] text-neutral-100 border border-[#2d3447] rounded-bl-xs'
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
            className="p-3 border-t border-[#222736] bg-[#141721] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Send message to room..."
              className="flex-1 px-3.5 py-2 bg-[#0e1017] border border-[#262c3d] rounded-xl text-base sm:text-xs text-white placeholder-neutral-500 focus:border-indigo-500 outline-none font-sans"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Participants with Volume Control */}
      {activeTab === 'users' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400">
              Room Members ({participants.length})
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
            </span>
          </div>

          {participants.map((p) => {
            const isMe = p.id === currentUserId;
            const volume = userVolumes[p.id] ?? 100;

            return (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-[#171b25] border border-[#252b3c] flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl overflow-hidden border border-[#2f374c]"
                      style={{ backgroundColor: p.color + '22' }}
                    >
                      <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white">{p.name}</span>
                        {p.isHost && (
                          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold tracking-wide shadow-sm">
                            <Tv className="w-2.5 h-2.5 text-amber-300" />
                            <span>📺 Host</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {isMe ? 'You' : 'Guest'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-neutral-400">
                    {p.isAudioMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {p.isVideoMuted ? (
                      <VideoOff className="w-3.5 h-3.5 text-neutral-500" />
                    ) : (
                      <Video className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                </div>

                {/* Per-user volume slider (Kosmi feature!) */}
                {!isMe && (
                  <div className="flex items-center gap-2 pt-1 border-t border-[#222838]">
                    <Volume2 className="w-3 h-3 text-neutral-500" />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={volume}
                      onChange={(e) => handleVolumeChange(p.id, parseInt(e.target.value))}
                      className="flex-1 h-1 bg-[#252b3c] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <span className="text-[10px] font-mono text-neutral-400 w-7 text-right">
                      {volume}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Soundboard */}
      {activeTab === 'soundboard' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-transparent">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Meme Soundboard
              </h3>
              <p className="text-[11px] text-neutral-400">
                Broadcast instant audio effects to everyone
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
                onClick={() => onTriggerSound(sound.id)}
                className="group flex flex-col items-start p-3 rounded-xl bg-[#171b25] border border-[#252b3c] hover:border-indigo-500/50 hover:bg-[#202534] active:scale-95 transition-all text-left shadow-sm"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xl group-hover:scale-110 transition-transform">
                    {sound.emoji}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 group-hover:bg-indigo-400" />
                </div>
                <span className="text-xs font-semibold text-white group-hover:text-indigo-300">
                  {sound.name}
                </span>
                <span className="text-[10px] text-neutral-500 mt-0.5">{sound.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Invite */}
      {activeTab === 'invite' && (
        <div className="flex-1 p-5 overflow-y-auto flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Share2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Share Kosmi Room
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed mt-1">
                Zero sign-up required. Friends can click the link and join your watch party instantly.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Instant Room URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/room/${roomId}` : `https://app.kosmi.io/room/${roomId}`}
                  className="w-full px-3 py-2 bg-[#0e1017] border border-[#252a3b] rounded-xl text-base sm:text-xs font-mono text-neutral-300 select-all outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 mt-1">
                  <Check className="w-3.5 h-3.5" /> Copied link to clipboard!
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );

  if (isInline) {
    return sidebarContent;
  }

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] transition-opacity duration-200"
      />
      {sidebarContent}
    </>
  );
};
