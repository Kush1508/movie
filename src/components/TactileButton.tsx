'use client';

import React from 'react';
import { soundboard } from '@/lib/soundboard';

interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'amber' | 'danger' | 'ghost' | 'panel';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  active?: boolean;
  tally?: 'red' | 'green' | 'amber' | null;
}

export const TactileButton: React.FC<TactileButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  active = false,
  tally = null,
  className = '',
  onClick,
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      soundboard.playClick(active ? 700 : 950);
      if (onClick) onClick(e);
    }
  };

  const baseStyles =
    'relative inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer rounded-lg border outline-none disabled:opacity-40 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-md',
    md: 'text-sm px-3.5 py-2 gap-2 rounded-lg',
    lg: 'text-base px-5 py-2.5 gap-2.5 rounded-xl',
    icon: 'p-2 rounded-lg aspect-square',
  }[size];

  const variantStyles = {
    primary:
      'bg-tungsten text-cinema-950 font-semibold border-amber-400 shadow-[0_2px_0_#b45309,0_4px_12px_rgba(245,158,11,0.25)] hover:bg-amber-400 active:translate-y-0.5 active:shadow-[0_0_0_#b45309]',
    amber:
      'bg-amber-950/60 text-amber-200 border-amber-700/50 hover:bg-amber-900/60 hover:border-amber-600 active:bg-amber-950 shadow-[0_2px_0_rgba(0,0,0,0.6)]',
    secondary:
      'bg-cinema-850 text-cinema-200 border-cinema-700/60 hover:bg-cinema-800 hover:text-white hover:border-cinema-600 active:translate-y-0.5 shadow-[0_2px_0_rgba(0,0,0,0.6)]',
    ghost:
      'bg-transparent text-cinema-300 border-transparent hover:bg-cinema-800/60 hover:text-white',
    danger:
      'bg-red-950/70 text-red-200 border-red-700/60 hover:bg-red-900/80 active:translate-y-0.5 shadow-[0_2px_0_rgba(0,0,0,0.6)]',
    panel:
      'bg-cinema-900 text-cinema-300 border-cinema-800 hover:border-cinema-700 shadow-inner',
  }[variant];

  const activeStyles = active
    ? 'ring-1 ring-amber-500/80 !bg-cinema-800 !text-amber-300 !border-amber-600/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]'
    : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${activeStyles} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {tally && (
        <span
          className={`w-2 h-2 rounded-full mr-1.5 animate-pulse ${
            tally === 'red'
              ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
              : tally === 'green'
              ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
              : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
          }`}
        />
      )}
      {children}
    </button>
  );
};
