'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  HeroCarousel,
  HeroCarouselItem,
} from '@/components/ui/hero-carousel';
import {
  Play,
  Sparkles,
  ArrowRight,
  Globe,
  Tv,
  Users,
  Film,
  MonitorUp,
  Volume2,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { SHINCHAN_MOVIES } from '@/lib/shinchan-catalog';

const CAROUSEL_LOOKS: HeroCarouselItem[] = [
  {
    id: 'shinchan-spicy-kasukabe',
    title: 'The Spicy Kasukabe\nDancers (Full Movie)',
    image: '/posters/spicy-kasukabe.jpg',
    credit: 'DIRECT HD STREAM • HINDI DUB',
    meta: ['ZERO BUFFER', 'FULL MOVIE', 'DIRECT SYNC'],
    accent: '#dc2626',
  },
  {
    id: 'shinchan-dance-amigo',
    title: 'The Legend Called:\nDance! Amigo!',
    image: '/posters/dance-amigo.jpg',
    credit: 'PRELOADED HINDI DUB • CULT CLASSIC',
    meta: ['SAMBA CLONES', 'MYSTERY', 'CINEMA STAGE'],
    accent: '#7c3aed',
  },
  {
    id: 'shinchan-bungle-jungle',
    title: 'Bungle in the\nJungle Island',
    image: '/posters/bungle-jungle.jpg',
    credit: 'ACTION KAMEN ADVENTURE',
    meta: ['HINDI DUBBED', 'JUNGLE RESCUE', 'COLLABORATIVE'],
    accent: '#059669',
  },
  {
    id: 'shinchan-robot-dad',
    title: 'Serious Battle!\nRobot Dad Strikes Back',
    image: '/posters/robot-dad.jpg',
    credit: 'AWARD WINNING • HINDI MOVIE',
    meta: ['EMOTIONAL', 'CYBORG DAD', 'WEBRTC MESH'],
    accent: '#2563eb',
  },
  {
    id: 'shinchan-b-grade-gourmet',
    title: 'B-Grade Gourmet\nSurvival Wars',
    image: '/posters/b-grade-gourmet.jpg',
    credit: 'KASUKABE DEFENSE CORPS',
    meta: ['YAKISOBA SAUCE', 'HINDI DUB', 'PRIVATE ROOMS'],
    accent: '#d97706',
  },
  {
    id: 'shinchan-adult-empire',
    title: 'The Adult Empire\nStrikes Back',
    image: '/posters/adult-empire.jpg',
    credit: 'LEGENDARY MASTERPIECE • HINDI DUB',
    meta: ['NOSTALGIA EXPO', 'HIROSHI MEMORY', '4K SYNC'],
    accent: '#db2777',
  },
  {
    id: 'shinchan-dreamy-world',
    title: 'Fast Asleep! Great\nDream World Assault',
    image: '/posters/dreamy-world.jpg',
    credit: 'LUCID DREAM REALM • HINDI DUB',
    meta: ['NIGHTMARE RESCUE', 'COLLAB WATCH', 'ZERO LAG'],
    accent: '#4f46e5',
  },
  {
    id: 'shinchan-dark-tama-tama',
    title: 'Dark Tama Tama\nThrilling Chase',
    image: '/posters/dark-tama-tama.jpg',
    credit: 'FAN FAVORITE CLASSIC • HINDI DUB',
    meta: ['HIMAWARI ORB', 'CROSS-COUNTRY', 'INSTANT ROOM'],
    accent: '#ea580c',
  },
  {
    id: 'shinchan-henderland',
    title: 'Great Adventure in\nHenderland',
    image: '/posters/henderland.jpg',
    credit: 'RETRO CLASSIC • HINDI DUB',
    meta: ['HENDERLAND PARK', 'TRUMP CARDS', 'COMEDY'],
    accent: '#0891b2',
  },
  {
    id: 'shinchan-kasukabe-boys',
    title: 'The Kasukabe Boys\nof the Evening Sun',
    image: '/posters/kasukabe-boys.jpg',
    credit: 'WESTERN WILD WEST • HINDI DUB',
    meta: ['CINEMA TRAP', 'COWBOYS', 'FULL MOVIE'],
    accent: '#b45309',
  },
  {
    id: 'shinchan-action-kamen',
    title: 'Action Mask vs.\nLeotard Devil',
    image: '/posters/action-kamen.jpg',
    credit: 'THE FIRST ORIGINAL SHINCHAN MOVIE',
    meta: ['PARALLEL WORLD', 'ACTION KAMEN', 'ORIGIN STORY'],
    accent: '#0284c7',
  },
];

export default function HomePage() {
  const router = useRouter();

  const [activeSlide, setActiveSlide] = useState(0);
  const [joinInput, setJoinInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Generate a random clean room hash (e.g. "zummnt") matching Kosmi
  const handleCreateInstantParty = () => {
    setIsCreating(true);
    const roomCode = Math.random().toString(36).substring(2, 8);
    const selectedMovie = CAROUSEL_LOOKS[activeSlide]?.id;
    router.push(selectedMovie ? `/room/${roomCode}?movie=${selectedMovie}` : `/room/${roomCode}`);
  };

  // Join existing watch party from input (cleans URLs, hashes, trailing slashes, and query params)
  const handleJoinParty = (e: React.FormEvent) => {
    e.preventDefault();
    let raw = joinInput.trim();
    if (!raw) return;

    // 1. Remove leading hash and trailing slashes
    raw = raw.replace(/^#+/, '').replace(/\/+$/, '');

    // 2. Separate query string if present (e.g. ?movie=...)
    let queryPart = '';
    if (raw.includes('?')) {
      const [pathPart, q] = raw.split('?');
      raw = pathPart.replace(/\/+$/, '');
      queryPart = q;
    }

    // 3. Extract room code from URL or path
    let extractedCode = raw;
    if (raw.includes('/room/')) {
      const parts = raw.split('/room/');
      extractedCode = parts[parts.length - 1];
    } else if (raw.includes('/')) {
      const parts = raw.split('/').filter(Boolean);
      extractedCode = parts[parts.length - 1] || '';
    }

    // 4. Sanitize to clean lowercase alphanumeric room code
    const cleanCode = extractedCode.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (cleanCode) {
      router.push(queryPart ? `/room/${cleanCode}?${queryPart}` : `/room/${cleanCode}`);
    }
  };

  const handleLaunchPreset = (presetRoom: string) => {
    router.push(`/room/${presetRoom}`);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#070709] canvas-grid text-white font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* ── 1. Top Navbar ── */}
      <header className="sticky top-0 z-50 h-14 px-4 sm:px-8 flex items-center justify-between border-b border-[#202534] bg-[#0c0e14]/90 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-sm shadow-md">
            K
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white">CINEMESH</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCreateInstantParty}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Create Room</span>
          </button>
        </div>
      </header>

      {/* ── 2. Hero Section: 21st.dev Scroll-Through Window (HeroCarousel) ── */}
      <section className="relative w-full overflow-hidden border-b border-[#1c2130]">
        <HeroCarousel
          items={CAROUSEL_LOOKS}
          defaultIndex={0}
          onIndexChange={(idx) => setActiveSlide(idx)}
          autoplay={true}
          autoplayDelay={6000}
          className="h-[68vh] sm:h-[72vh] w-full"
        />

      </section>

      {/* ── 3. Interactive Console: Create or Join Watch Party ── */}
      <section className="relative z-20 -mt-10 sm:-mt-14 max-w-5xl mx-auto w-full px-4 sm:px-6">
        <div className="p-6 sm:p-8 rounded-2xl bg-[#11131a]/95 backdrop-blur-2xl border border-[#242939] shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04)] grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Create Watch Party */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider font-mono">
                  Instant Link Room • Zero Sign-Up
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
                Watch movies together without lag or stream blur.
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                No Discord screen sharing quality drops, no Google Meet buffer. 
                Synchronized YouTube 4K, Facebook video player, web streams, and shared browser.
              </p>
            </div>

            {/* Create Action */}
            <div className="pt-2">
              <button
                onClick={handleCreateInstantParty}
                disabled={isCreating}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold tracking-wide shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isCreating ? 'Launching Room...' : 'Start Watch Party (Instant)'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Join Watch Party */}
          <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-xl bg-[#161922] border border-[#242938]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
                  Join Watch Party
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                  Instant Access
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Have a link from a friend? Paste the full link or the 6-character room code.
              </p>

              <form onSubmit={handleJoinParty} className="space-y-3 pt-2">
                <div className="relative">
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    placeholder="e.g. zummnt or paste URL..."
                    className="w-full px-4 py-2.5 bg-[#0e1017] border border-[#2b3244] focus:border-indigo-500 rounded-xl text-base sm:text-xs text-white placeholder-neutral-500 font-mono outline-none transition-all shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!joinInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#232734] hover:bg-[#2d3242] border border-[#343b4e] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <span>Enter Watch Party Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Preloaded Shinchan Cinema Vault ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-12 pb-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#202534] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Film className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest font-mono">
                Shinchan Cinema Vault
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Preloaded Shinchan Movies (Hindi Dub)
            </h2>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {SHINCHAN_MOVIES.length} Full Movies Ready to Stream
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SHINCHAN_MOVIES.map((movie) => (
            <div
              key={movie.id}
              className="group relative p-3 rounded-2xl bg-[#11131a] hover:bg-[#151924] border border-[#202534] hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-neutral-900 mb-3 border border-white/5">
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono text-amber-300 font-bold border border-white/10">
                    {movie.duration}
                  </div>
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-emerald-500/80 backdrop-blur-md text-[10px] font-mono text-white font-bold">
                    Hindi Dub
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono mb-1">
                  <span>{movie.year}</span>
                  <span>•</span>
                  <span>{movie.tags[0]}</span>
                </div>
                <h3 className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors line-clamp-1 mb-1">
                  {movie.title}
                </h3>
                <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                  {movie.synopsis}
                </p>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => {
                    const roomCode = Math.random().toString(36).substring(2, 8);
                    router.push(`/room/${roomCode}?movie=${movie.id}`);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Watch with Friends</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Feature Showcase Grid (21st.dev Obsidian Cards) ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest font-mono">
            Designed for Watch Parties
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Everything Discord & Meet struggle to do.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400">
            High definition video synchronization, direct web embeds, and spatial audio chat.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Feature 1 */}
          <div className="p-5 rounded-2xl bg-[#11131a] hover:bg-[#151822] border border-[#202534] hover:border-indigo-500/40 transition-all space-y-3 group shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
              Facebook & Web Streams
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Native player embed resolving direct Facebook links, Google Share links, and MP4 streams with zero buffer.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-5 rounded-2xl bg-[#11131a] hover:bg-[#151822] border border-[#202534] hover:border-red-500/40 transition-all space-y-3 group shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <Tv className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-red-300 transition-colors">
              YouTube 4K Synchronization
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Frame-accurate play, pause, and seek synced across all friends with full scrubbing controls.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-5 rounded-2xl bg-[#11131a] hover:bg-[#151822] border border-[#202534] hover:border-cyan-500/40 transition-all space-y-3 group shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
              Shared Virtual Co-Browser
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Explore Wikipedia cinema, Archive.org movies, and web streams collaboratively in real time.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-5 rounded-2xl bg-[#11131a] hover:bg-[#151822] border border-[#202534] hover:border-purple-500/40 transition-all space-y-3 group shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
              WebRTC Video Chat Lounge
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Low-latency webcam tiles, speaking activity indicators, soundboard alerts, and flying emoji reactions.
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. Minimalist 21st.dev Footer ── */}
      <footer className="mt-auto border-t border-[#1a1e2b] py-8 px-6 sm:px-8 bg-[#090b10] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>CINEMESH • Private Watch Parties with Friends</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleLaunchPreset('zummnt')}
            className="hover:text-white transition-colors"
          >
            Lobby Room
          </button>
          <span>•</span>
          <button
            onClick={handleCreateInstantParty}
            className="hover:text-white transition-colors"
          >
            Create New Party
          </button>
        </div>
      </footer>
    </div>
  );
}
