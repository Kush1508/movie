'use client';

import React from 'react';
import { FlyingReaction } from '@/types';

interface ScreenReactionsProps {
  reactions: FlyingReaction[];
}

export const ScreenReactions: React.FC<ScreenReactionsProps> = ({ reactions }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-12 flex flex-col items-center animate-[flyUp_3s_ease-out_forwards]"
          style={{ left: `${r.x}%` }}
        >
          <span className="text-4xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] filter hover:scale-125 transition-transform select-none">
            {r.emoji}
          </span>
          <span className="text-[10px] font-mono text-amber-300 bg-cinema-950/80 px-2 py-0.5 rounded-full mt-1 border border-cinema-800 shadow-md">
            {r.senderName}
          </span>
        </div>
      ))}

      <style jsx global>{`
        @keyframes flyUp {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.6);
          }
          15% {
            opacity: 1;
            transform: translateY(0px) scale(1.15);
          }
          75% {
            opacity: 0.9;
            transform: translateY(-240px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-380px) scale(0.8);
          }
        }
      `}</style>
    </div>
  );
};
