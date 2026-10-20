'use client';

import React from 'react';
import DemoOne from '@/components/ui/demo';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CarouselDemoPage() {
  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col">
      <div className="absolute top-4 left-4 z-50">
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white text-xs font-semibold flex items-center gap-2 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cinemesh Lobby
        </Link>
      </div>
      <DemoOne />
    </div>
  );
}
