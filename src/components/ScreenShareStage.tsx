'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ScreenShare, MonitorUp, StopCircle, Volume2, VolumeX, Maximize } from 'lucide-react';
import { TactileButton } from './TactileButton';

interface ScreenShareStageProps {
  onStreamActive?: (stream: MediaStream | null) => void;
}

export const ScreenShareStage: React.FC<ScreenShareStageProps> = ({ onStreamActive }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startSharing = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert('Screen broadcasting is only supported on laptop or desktop web browsers.');
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 60, max: 60 },
        },
        audio: true,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      if (onStreamActive) onStreamActive(mediaStream);

      // Listen for when user stops via browser UI banner
      mediaStream.getVideoTracks()[0].onended = () => {
        stopSharing();
      };
    } catch (err) {
      console.warn('Screen sharing cancelled or denied:', err);
    }
  };

  const stopSharing = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (onStreamActive) onStreamActive(null);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black overflow-hidden">
      {stream ? (
        <div className="relative w-full h-full flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isAudioMuted}
            className="w-full h-full object-contain"
          />

          {/* Screen Share Overlay Banner */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-cinema-950/85 backdrop-blur-md border border-cinema-700 px-4 py-2 rounded-xl flex items-center gap-3 text-xs font-mono text-cinema-200 shadow-2xl">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-300 font-semibold">LIVE SCREEN SHARE</span>
            <span className="text-cinema-400">|</span>
            <TactileButton size="sm" variant="danger" onClick={stopSharing}>
              <StopCircle className="w-3.5 h-3.5 mr-1" /> Stop Share
            </TactileButton>
            <TactileButton
              size="icon"
              variant="ghost"
              onClick={() => setIsAudioMuted(!isAudioMuted)}
            >
              {isAudioMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-cinema-300" />
              )}
            </TactileButton>
            <TactileButton size="icon" variant="ghost" onClick={toggleFullscreen}>
              <Maximize className="w-3.5 h-3.5 text-cinema-300" />
            </TactileButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-8 max-w-md bg-cinema-900/60 border border-cinema-800 rounded-3xl backdrop-blur-sm shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-cinema-800/80 border border-amber-600/30 flex items-center justify-center mb-4 text-tungsten shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <MonitorUp className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-cinema-100 font-display mb-2">
            Share Your Screen & Audio
          </h3>
          <p className="text-xs text-cinema-400 mb-6 leading-relaxed">
            Stream your entire screen, a browser tab, or media window with system audio to your friends without Discord or Meet lag.
          </p>
          <TactileButton size="lg" variant="primary" onClick={startSharing}>
            <ScreenShare className="w-5 h-5 mr-2" />
            Start Screen Share
          </TactileButton>
        </div>
      )}
    </div>
  );
};
