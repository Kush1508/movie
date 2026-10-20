"use client";

import React from "react";
import {
  HeroCarousel,
  type HeroCarouselItem,
} from "@/components/ui/hero-carousel";

// Verified cinematic art assets with fallback Unsplash high-res photography
const LOOKS: HeroCarouselItem[] = [
  {
    title: "Interstellar\nOdyssey",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
    credit: "STREAMED IN 4K • NO BUFFER",
    meta: ["SYNCHRONIZED", "CINEMA ROOM", "ZERO LAG"],
    accent: "#6366f1",
  },
  {
    title: "Cyberpunk\nChronicles",
    image: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&auto=format&fit=crop&q=80",
    credit: "CO-WATCH WITH FRIENDS",
    meta: ["FACEBOOK REELS", "YOUTUBE 4K", "DIRECT MP4"],
    accent: "#06b6d4",
  },
  {
    title: "Midnight\nNoir",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&auto=format&fit=crop&q=80",
    credit: "BY CINEMESH STUDIO",
    meta: ["WEBRTC MESH", "LIVE VOICE", "SOUNDBOARD"],
    accent: "#8b5cf6",
  },
  {
    title: "Celestial\nHorizon",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80",
    credit: "INSTANT LINK • ZERO SIGN-UP",
    meta: ["ONE-CLICK INVITE", "AUTO NICKNAME", "PRIVATE"],
    accent: "#3b82f6",
  },
  {
    title: "Neon\nEchoes",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    credit: "DIRECT STREAM SYNC",
    meta: ["FRAME ACCURATE", "SCRUB SYNC", "ULTRA HD"],
    accent: "#ec4899",
  },
];

export default function DemoOne() {
  return (
    <HeroCarousel
      items={LOOKS}
      defaultIndex={0}
      brand="CINEMESH"
      autoplay={true}
      autoplayDelay={5000}
      className="h-[75vh] w-full"
    />
  );
}
