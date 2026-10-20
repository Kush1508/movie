<div align="center">

# 🎬 CineMesh

**Real-Time Synchronized Watch Party Platform with WebRTC Video Calling, Live Chat, and Interactive Theater Controls**

[![Live Demo](https://img.shields.io/badge/Demo-Live%20on%20Vercel-success?style=for-the-badge&logo=vercel)](https://cinemesh-fawn.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![WebRTC](https://img.shields.io/badge/WebRTC-PeerJS-orange?style=for-the-badge&logo=webrtc)](https://webrtc.org/)

[**Explore Live Website »**](https://cinemesh-fawn.vercel.app)

</div>

---

## 🌟 Overview

**CineMesh** is a modern, low-latency watch party web application designed for friends and communities to stream movies, videos, and media together in real-time. It pairs synchronized video playback with live multi-peer audio/video calls, text chat, flying emoji reactions, and an interactive procedural soundboard.

---

## ✨ Features

### 🎥 Synchronized Theater Stage
- **Zero-Buffer Drift Correction**: Employs seamless playback rate nudging (`0.96x` – `1.20x`) to keep guests synchronized with the host without causing video buffer flushes or loading stalls.
- **Host Controls & Failover**: Automatic host designation with automatic host migration if the active host leaves the room.
- **Multiple Media Sources**:
  - Direct MP4/WebM video streams.
  - YouTube player integration with synchronized seeking.
  - Preloaded Hindi Dubbed Shinchan movie catalog.
  - Screen Sharing stage for live browser/screen broadcasts.
  - Co-Browser lounge.

### 📱 Mobile-First Experience
- **Responsive Split View**: On mobile portrait screens, the video stays pinned at the top covering the majority of the screen, while chat and participant cameras fill the lower half.
- **Native Double-Tap Skip**:
  - Double-tap the **Right half** to skip forward **+10 seconds**.
  - Double-tap the **Left half** to skip backward **-10 seconds**.
  - Animated ripple glow arcs and circular indicator badges (YouTube/Hotstar style).

### 🎙️ Real-Time P2P WebRTC Communication
- **Mesh Video & Audio**: Multi-user peer-to-peer audio and video calls powered by PeerJS and WebRTC with STUN/TURN fallback.
- **Dynamic Track Toggling**: Turn microphone and camera on/off on the fly without dropping existing peer connections.
- **Speaking Indicators**: Real-time audio waveform visualizer halos around speaking participants.

### 🎉 Interactive Social Features
- **Flying Reactions**: On-screen floating emoji reactions with custom particle physics visible to all watchers.
- **Procedural Soundboard**: Web Audio API synthesizer for sound effects (Applause, Laughter, Airhorn, Rimshot, Suspense) without requiring external audio assets.
- **Real-Time Chat**: In-room messaging with unique participant badges and timestamps.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **P2P & Networking**: [PeerJS](https://peerjs.com/) (WebRTC), BroadcastChannel, Serverless Polling Fallback
- **Media Playback**: HTML5 Video, [ReactPlayer](https://github.com/cookpete/react-player)
- **Audio Synthesis**: Web Audio API
- **Hosting & Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.17.0 or higher)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Kush1508/movie.git
   cd movie
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📦 Project Structure

```
├── public/                 # Static assets (posters, icons)
├── src/
│   ├── app/
│   │   ├── api/            # Serverless room signaling and URL resolution
│   │   │   ├── resolve-url/
│   │   │   └── room/[id]/
│   │   ├── room/[id]/      # Core watch party room page & controller
│   │   ├── globals.css     # Global styles & animations
│   │   ├── layout.tsx      # Root HTML layout & fonts
│   │   └── page.tsx        # Landing page with 3D Coverflow carousel
│   ├── components/
│   │   ├── KosmiStage.tsx  # Central theater stage, gesture handlers & video player
│   │   ├── KosmiSidebar.tsx# Chat, video tiles, participant list, soundboard
│   │   ├── KosmiDock.tsx   # Floating bottom control dock
│   │   ├── KosmiTopBar.tsx # Header with room link and user pill
│   │   ├── ScreenReactions.tsx # Flying emoji canvas
│   │   └── ui/             # 3D Hero Carousel and UI primitives
│   ├── lib/
│   │   ├── peer-sync.ts    # Dual-channel WebRTC / Server signaling engine
│   │   ├── soundboard.ts   # Web Audio procedural sound synthesizer
│   │   ├── shinchan-catalog.ts # Preloaded Hindi movie catalog
│   │   └── utils.ts        # Helper utilities
│   └── types/              # TypeScript definitions
└── package.json
```

---

## 🌐 Deployment

The project is pre-configured for instant deployment on **Vercel**:

```bash
npm run build
npx vercel --prod
```

Or connect the repository directly in the [Vercel Dashboard](https://vercel.com/new).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
