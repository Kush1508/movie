'use client';

import React, { useState } from 'react';
import { Film, Youtube, Facebook, X, Play, Sparkles, Loader2 } from 'lucide-react';

interface UrlInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resolvedData: {
    url: string;
    title?: string;
    embedUrl?: string;
    isFacebook?: boolean;
  }) => void;
  currentUrl?: string;
}

const PRESET_STREAMS = [
  {
    title: 'Shinchan The Spicy Kasukabe Dancers (Hindi)',
    type: 'Facebook Movie',
    url: 'https://share.google/2sFwi97YEbM12P7Aw',
    badge: 'Facebook Watch',
  },
  {
    title: 'Tears of Steel (Sci-Fi 4K)',
    type: 'Direct MP4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    badge: 'Direct Stream',
  },
  {
    title: 'Big Buck Bunny (Animation Classic)',
    type: 'Direct MP4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    badge: 'Direct Stream',
  },
  {
    title: 'Cyberpunk Tokyo Ambience (YouTube)',
    type: 'YouTube',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    badge: 'YouTube Live/VOD',
  },
];

export const UrlInputModal: React.FC<UrlInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUrl = '',
}) => {
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [customTitle, setCustomTitle] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawUrl = inputUrl.trim();
    if (!rawUrl) return;

    setIsResolving(true);
    try {
      // Resolve link via server to handle shortened links (e.g. share.google, fb.watch, etc.)
      const res = await fetch(`/api/resolve-url?url=${encodeURIComponent(rawUrl)}`);
      if (res.ok) {
        const data = await res.json();
        onSubmit({
          url: data.resolvedUrl || rawUrl,
          title: customTitle.trim() || data.title || undefined,
          embedUrl: data.embedUrl,
          isFacebook: data.isFacebook,
        });
      } else {
        onSubmit({
          url: rawUrl,
          title: customTitle.trim() || undefined,
          isFacebook: rawUrl.includes('facebook.com') || rawUrl.includes('fb.watch'),
        });
      }
    } catch (err) {
      onSubmit({
        url: rawUrl,
        title: customTitle.trim() || undefined,
        isFacebook: rawUrl.includes('facebook.com') || rawUrl.includes('fb.watch'),
      });
    } finally {
      setIsResolving(false);
      onClose();
    }
  };

  const handlePresetSelect = (url: string, title: string) => {
    setInputUrl(url);
    setCustomTitle(title);
  };

  const getPlatformIcon = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return <Youtube className="w-5 h-5 text-red-500" />;
    }
    if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('share.google')) {
      return <Facebook className="w-5 h-5 text-blue-500" />;
    }
    return <Film className="w-5 h-5 text-indigo-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-zinc-950/90 border border-white/15 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(99,102,241,0.2)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Load Media Stream
              </h2>
              <p className="text-xs text-zinc-400">
                Facebook Videos & Movies, YouTube 4K, Direct MP4, or Web Streams
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* URL Input */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400">
              Media Stream URL
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none">
                {getPlatformIcon(inputUrl)}
              </div>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Paste Facebook video/share link, YouTube, or direct MP4..."
                className="w-full pl-11 pr-4 py-3 bg-black/60 border border-white/15 rounded-2xl text-white placeholder-zinc-500 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Auto-resolves shortened links (Google Share, fb.watch) and loads embedded Facebook player
            </p>
          </div>

          {/* Optional Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400">
              Custom Title (Optional)
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Shinchan Kasukabe Dancers or Interstellar (2014)"
              className="w-full px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-zinc-200 placeholder-zinc-500 text-sm focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Quick Test Clips
              </span>
              <span className="text-[11px] text-zinc-500">Click to fill</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_STREAMS.map((item, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handlePresetSelect(item.url, item.title)}
                  className="flex flex-col text-left p-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 hover:border-indigo-500/50 rounded-2xl transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-medium text-zinc-200 group-hover:text-indigo-300 truncate">
                      {item.title}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-400 font-mono">
                      {item.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono truncate w-full">
                    {item.url}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isResolving}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!inputUrl.trim() || isResolving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(99,102,241,0.5)] disabled:opacity-40 transition-all flex items-center gap-2"
            >
              {isResolving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Resolving Stream...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Load to Stage
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
