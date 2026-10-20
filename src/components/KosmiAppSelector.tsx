'use client';

import React, { useState } from 'react';
import {
  Youtube,
  Film,
  Globe,
  MonitorUp,
  Search,
  X,
  Play,
  Sparkles,
  Tv,
  Users,
  Facebook,
  ExternalLink,
  Clock,
  Check,
  Grid,
} from 'lucide-react';
import { SHINCHAN_MOVIES } from '@/lib/shinchan-catalog';
import { ShinchanMovie } from '@/types';

export type KosmiAppId = 'youtube' | 'facebook' | 'browser' | 'screenshare' | 'lounge';

interface KosmiAppSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectApp: (appId: KosmiAppId, streamData?: { url: string; title?: string }) => void;
  currentAppId?: KosmiAppId;
}

const APPS_LIST = [
  {
    id: 'youtube' as KosmiAppId,
    title: 'YouTube Watch Party',
    category: 'Streaming',
    icon: Youtube,
    color: 'text-red-500 bg-red-500/10 border-red-500/20',
    description: 'Watch synchronized YouTube 4K videos, live streams, and music with friends.',
    placeholder: 'Paste YouTube link (e.g. youtube.com/watch?v=...)',
    defaultPreset: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    presetName: 'Lofi Hip Hop Radio (Live)',
  },
  {
    id: 'facebook' as KosmiAppId,
    title: 'Facebook Video & Web Movies',
    category: 'Streaming',
    icon: Facebook,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    description: 'Stream Facebook movies, reels, Google Share links, direct MP4, or HLS streams.',
    placeholder: 'Paste Facebook video link or Google Share link...',
    defaultPreset: 'https://share.google/2sFwi97YEbM12P7Aw',
    presetName: 'Shinchan The Spicy Kasukabe Dancers (Hindi Movie)',
  },
  {
    id: 'browser' as KosmiAppId,
    title: 'Shared Virtual Browser',
    category: 'Co-Browsing',
    icon: Globe,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    description: 'Browse the web together, read wikis, explore archives, and search collaboratively.',
    placeholder: 'Enter website URL (e.g. archive.org or wikipedia.org)',
    defaultPreset: 'https://en.m.wikipedia.org/wiki/Portal:Film',
    presetName: 'Wikipedia Cinema Portal',
  },
  {
    id: 'screenshare' as KosmiAppId,
    title: 'Screen & Audio Sharing',
    category: 'Screen',
    icon: MonitorUp,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    description: 'Broadcast your entire display, application window, or browser tab with desktop audio.',
    placeholder: '',
    defaultPreset: '',
    presetName: '',
  },
  {
    id: 'lounge' as KosmiAppId,
    title: 'Voice & Webcam Lounge',
    category: 'Social',
    icon: Users,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    description: 'Switch the central stage to a focused video grid for face-to-face hangout.',
    placeholder: '',
    defaultPreset: '',
    presetName: '',
  },
];

export const KosmiAppSelector: React.FC<KosmiAppSelectorProps> = ({
  isOpen,
  onClose,
  onSelectApp,
  currentAppId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeInputApp, setActiveInputApp] = useState<KosmiAppId | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  if (!isOpen) return null;

  const categories = ['All', 'Shinchan Movies', 'Streaming', 'Co-Browsing', 'Screen', 'Social'];

  const filteredApps = APPS_LIST.filter((app) => {
    const matchesSearch =
      app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredShinchanMovies = SHINCHAN_MOVIES.filter((movie) => {
    const query = searchQuery.toLowerCase();
    const matches =
      movie.title.toLowerCase().includes(query) ||
      (movie.hindiTitle && movie.hindiTitle.toLowerCase().includes(query)) ||
      movie.synopsis.toLowerCase().includes(query) ||
      movie.tags.some((t) => t.toLowerCase().includes(query));
    return matches;
  });

  const handleLaunchClick = (app: (typeof APPS_LIST)[0]) => {
    if (app.id === 'screenshare' || app.id === 'lounge') {
      onSelectApp(app.id);
      onClose();
    } else {
      setActiveInputApp(app.id);
      setCustomUrl(app.defaultPreset);
    }
  };

  const handlePlayShinchan = (movie: ShinchanMovie) => {
    onSelectApp(movie.isFacebook ? 'facebook' : 'youtube', {
      url: movie.streamUrl,
      title: movie.hindiTitle || movie.title,
    });
    onClose();
  };

  const handleConfirmUrlLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInputApp || !customUrl.trim()) return;

    setIsResolving(true);
    try {
      // Auto-resolve any shortened or Facebook link
      const res = await fetch(`/api/resolve-url?url=${encodeURIComponent(customUrl.trim())}`);
      if (res.ok) {
        const data = await res.json();
        onSelectApp(activeInputApp, {
          url: data.resolvedUrl || customUrl.trim(),
          title: data.title || undefined,
        });
      } else {
        onSelectApp(activeInputApp, { url: customUrl.trim() });
      }
    } catch {
      onSelectApp(activeInputApp, { url: customUrl.trim() });
    } finally {
      setIsResolving(false);
      setActiveInputApp(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl bg-[#13151b] border border-[#2a2f3f] rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kosmi Modal Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-[#222634] bg-[#161922]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Kosmi Applications & Media Stage
              </h2>
              <p className="text-xs text-neutral-400">
                Choose what you want to play or do in this room
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[#222634] bg-[#111319] flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps or Shinchan movies..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#181b24] border border-[#2a2f3f] rounded-xl text-base sm:text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {cat === 'Shinchan Movies' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {activeInputApp ? (
            /* Sub-modal: Enter Video / Stream URL */
            <form onSubmit={handleConfirmUrlLaunch} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
                  {APPS_LIST.find((a) => a.id === activeInputApp)?.title}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveInputApp(null)}
                  className="text-xs text-indigo-400 hover:underline"
                >
                  ← Back to apps list
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-300 font-medium">Stream or Video URL:</label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder={
                    APPS_LIST.find((a) => a.id === activeInputApp)?.placeholder ||
                    'Paste URL here...'
                  }
                  className="w-full px-4 py-2.5 bg-[#0f1117] border border-[#2a2f3f] rounded-xl text-base sm:text-sm text-white placeholder-neutral-500 font-mono outline-none focus:border-indigo-500 shadow-inner"
                  autoFocus
                />
              </div>

              {/* Preset suggestion chip */}
              {APPS_LIST.find((a) => a.id === activeInputApp)?.defaultPreset && (
                <div className="p-3 bg-[#181b24] border border-[#2a2f3f] rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white block">
                      {APPS_LIST.find((a) => a.id === activeInputApp)?.presetName}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono truncate max-w-md block">
                      {APPS_LIST.find((a) => a.id === activeInputApp)?.defaultPreset}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomUrl(
                        APPS_LIST.find((a) => a.id === activeInputApp)?.defaultPreset || ''
                      )
                    }
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all shrink-0 ml-2"
                  >
                    Use Preset
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveInputApp(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customUrl.trim() || isResolving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isResolving ? 'Resolving Link...' : 'Launch on Stage'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* SECTION 1: PRELOADED SHINCHAN MOVIES */}
              {(selectedCategory === 'All' || selectedCategory === 'Shinchan Movies') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Preloaded Shinchan Movies (Hindi Dub)
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono">
                        {filteredShinchanMovies.length} Available
                      </span>
                    </div>

                    {selectedCategory === 'All' && (
                      <button
                        onClick={() => setSelectedCategory('Shinchan Movies')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        View all Shinchan movies →
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredShinchanMovies.map((movie) => (
                      <div
                        key={movie.id}
                        className="group relative p-3 rounded-xl bg-[#161922] hover:bg-[#1b202c] border border-[#242938] hover:border-amber-500/40 transition-all flex gap-3.5 shadow-sm"
                      >
                        {/* Movie Thumbnail */}
                        <div className="relative w-24 h-32 rounded-lg overflow-hidden shrink-0 bg-neutral-900 border border-white/10">
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute bottom-1 left-1 right-1 text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-black/85 text-center text-amber-300 backdrop-blur-sm">
                            {movie.duration}
                          </span>
                        </div>

                        {/* Metadata & Launch */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                                {movie.year}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                                Hindi Dub
                              </span>
                              {movie.isFacebook && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
                                  Facebook 1080p
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                              {movie.title}
                            </h4>
                            <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                              {movie.synopsis}
                            </p>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={() => handlePlayShinchan(movie)}
                              className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Play Movie on Stage</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: KOSMI CORE APPS */}
              {selectedCategory !== 'Shinchan Movies' && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Grid className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Kosmi Applications & Tools
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {filteredApps.map((app) => {
                      const Icon = app.icon;
                      const isCurrent = currentAppId === app.id;

                      return (
                        <div
                          key={app.id}
                          onClick={() => handleLaunchClick(app)}
                          className="group relative p-4 rounded-xl bg-[#161922] hover:bg-[#1c202c] border border-[#242938] hover:border-indigo-500/50 cursor-pointer transition-all flex flex-col justify-between shadow-sm"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${app.color}`}
                              >
                                <Icon className="w-5 h-5" />
                              </div>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                                  ACTIVE
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors mb-1">
                              {app.title}
                            </h3>
                            <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                              {app.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#222634] text-[11px] text-neutral-500">
                            <span className="font-mono uppercase">{app.category}</span>
                            <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform font-medium flex items-center gap-1">
                              Select App →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
