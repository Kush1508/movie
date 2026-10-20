'use client';

import React, { useState } from 'react';
import { Globe, ArrowLeft, ArrowRight, RotateCw, ExternalLink, ShieldCheck, Share2 } from 'lucide-react';
import { TactileButton } from './TactileButton';

interface SharedBrowserStageProps {
  currentUrl?: string;
  onNavigate?: (url: string) => void;
  isHost?: boolean;
}

const BROWSER_QUICK_LINKS = [
  { name: 'Wikipedia Cinema', url: 'https://en.m.wikipedia.org/wiki/Portal:Film' },
  { name: 'Archive.org Movies', url: 'https://archive.org/details/movies' },
  { name: 'Open Culture Free Movies', url: 'https://www.openculture.com/freemoviesonline' },
  { name: 'DuckDuckGo Search', url: 'https://duckduckgo.com' },
];

export const SharedBrowserStage: React.FC<SharedBrowserStageProps> = ({
  currentUrl = 'https://en.m.wikipedia.org/wiki/Portal:Film',
  onNavigate,
  isHost = true,
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [activeUrl, setActiveUrl] = useState(currentUrl);
  const [isLoading, setIsLoading] = useState(false);

  const handleGo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let target = urlInput.trim();
    if (!target) return;
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
    }
    setActiveUrl(target);
    setUrlInput(target);
    setIsLoading(true);
    if (onNavigate) onNavigate(target);
  };

  const handleSelectQuick = (url: string) => {
    setUrlInput(url);
    setActiveUrl(url);
    setIsLoading(true);
    if (onNavigate) onNavigate(url);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-cinema-950 text-cinema-100 overflow-hidden">
      {/* Browser Chrome Header */}
      <div className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-cinema-900 border-b border-cinema-800">
        {/* Navigation buttons */}
        <div className="flex items-center gap-1.5">
          <TactileButton size="icon" variant="ghost" onClick={() => {}}>
            <ArrowLeft className="w-4 h-4 text-cinema-400" />
          </TactileButton>
          <TactileButton size="icon" variant="ghost" onClick={() => {}}>
            <ArrowRight className="w-4 h-4 text-cinema-400" />
          </TactileButton>
          <TactileButton
            size="icon"
            variant="ghost"
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 800);
            }}
          >
            <RotateCw className={`w-4 h-4 text-cinema-400 ${isLoading ? 'animate-spin' : ''}`} />
          </TactileButton>
        </div>

        {/* Address Bar */}
        <form onSubmit={handleGo} className="flex-1 w-full flex items-center">
          <div className="relative w-full flex items-center">
            <div className="absolute left-3 flex items-center pointer-events-none text-cinema-500">
              <Globe className="w-3.5 h-3.5 text-tungsten" />
            </div>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter URL to co-browse with friends..."
              className="w-full pl-9 pr-24 py-1.5 bg-cinema-950 border border-cinema-700 rounded-lg text-xs font-mono text-cinema-200 focus:border-tungsten focus:ring-1 focus:ring-tungsten outline-none shadow-inner"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Shared
              </span>
              <button
                type="submit"
                className="text-[11px] font-medium px-2 py-0.5 rounded bg-cinema-800 hover:bg-cinema-700 text-amber-300 transition-colors"
              >
                Go
              </button>
            </div>
          </div>
        </form>

        {/* Quick launcher tabs */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full">
          {BROWSER_QUICK_LINKS.map((link, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectQuick(link.url)}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded bg-cinema-800/80 hover:bg-cinema-700 text-cinema-300 hover:text-white border border-cinema-700/60 transition-colors"
            >
              {link.name}
            </button>
          ))}
          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded text-cinema-400 hover:text-white"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Embedded Co-Browser Frame */}
      <div className="relative flex-1 w-full bg-white">
        <iframe
          src={activeUrl}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title="Shared Virtual Browser"
        />

        {/* Co-browsing synced badge */}
        <div className="absolute bottom-3 right-3 bg-cinema-900/90 backdrop-blur-md border border-cinema-700 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-mono text-cinema-200 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Co-Browsing Active</span>
        </div>
      </div>
    </div>
  );
};
