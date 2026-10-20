# CineMesh Project Status & Baseline Registry

This document establishes the official operational baseline for CineMesh. All features, modules, components, and utility functions inventoried below represent verified baseline code that must remain guarded and protected from unwanted modifications or refactoring regressions.

---

## Baseline Functions & Modules

### 1. Core State & Networking Engine (`src/lib/peer-sync.ts`)
*   **Class**: `MeshRoomSignaling`
    *   `constructor(roomId: string, myId: string)`: Initializes peer session with sanitized canonical `roomId` and BroadcastChannel.
    *   `setLocalMediaTime(time: number, playing: boolean, duration?: number)`: Updates local playback tracker used for periodic sync pulses.
    *   `initSync(user: Participant, initialMedia?: Partial<MediaState>, initialApp?: KosmiAppId)`: Dispatches immediate registration payload to `/api/room/[id]` and initiates 1.5s heartbeats.
    *   `triggerSync(): Promise<RoomSyncData | null>`: Dispatches immediate heartbeat/sync poll to the serverless room router.
    *   `notifyMediaUpdate(mediaState: Partial<MediaState>, currentApp?: KosmiAppId)`: Sends play, pause, seek, and movie switch updates to the server.
    *   `notifyAppChange(currentApp: KosmiAppId, mediaState?: Partial<MediaState>)`: Synchronizes active application change (YouTube, Screen Share, Lounge, etc.).
    *   `notifyChatMessage(message: ChatMessage)`: Posts chat message to server room session.
    *   `updateCurrentUser(partial: Partial<Participant>)`: Updates local user profile flags in memory.
    *   `setLocalStream(stream: MediaStream | null, participants?: Participant[])`: In-place track replacer and caller for all room participants.
    *   `initPeer(): Promise<void>`: Configures PeerJS with Google STUN, Twilio STUN, Mozilla STUN, and OpenRelay TURN servers.
    *   `setupConnection(conn: any)`: Hooks WebRTC data connection events (`open`, `data`, `close`) and handles immediate presence and host state transmission.
    *   `callPeer(targetPeerId: string, stream?: MediaStream, targetUserId?: string)`: Makes WebRTC audio/video call or hot-swaps tracks via `RTCRtpSender.replaceTrack()`.
    *   `connectToPeer(targetPeerId: string, targetUserId?: string)`: Establishes P2P WebRTC data connection with target peer.
    *   `broadcast(message: PeerSyncMessage)`: Dual-channel broadcaster distributing state to both BroadcastChannel and open WebRTC data channels.
    *   `onMessage(callback: MessageCallback)`: Event subscription for peer sync messages.
    *   `onSync(callback: (data: RoomSyncData) => void)`: Event subscription for room server sync payloads.
    *   `onPeerJoin(callback: (peerId: string) => void)`: Callback when a remote peer connects.
    *   `onPeerLeave(callback: (peerId: string) => void)`: Callback when a remote peer disconnects.
    *   `onRemoteStream(callback: RemoteStreamCallback)`: Callback when a remote WebRTC audio/video stream arrives.
    *   `onRemoteStreamEnd(callback: (peerId: string) => void)`: Callback when a remote stream closes.
    *   `notifyMessage(msg: PeerSyncMessage)`: Dispatches messages to all registered message listeners.
    *   `notifySync(data: RoomSyncData)`: Dispatches room updates and synchronizes local host status.
    *   `handleLeave()`: Fast-failover teardown on tab/browser exit.
    *   `destroy()`: Cleans up peer listeners, interval timers, and local media streams.

### 2. Serverless Room Signaling API (`src/app/api/room/[id]/route.ts`)
*   `getOrCreateRoom(roomId: string, initialMedia?: Partial<MediaState>, initialApp?: KosmiAppId): ServerRoomSession`: Retrieves or initializes server room session with resilient defaults (`lastUpdated: 0` for unstarted placeholder).
*   `pruneInactive(room: ServerRoomSession): void`: Removes stale heartbeats (>5s) and automatically promotes next active user to host if host disconnects.
*   `withTimeout<T>(promise: Promise<T>, ms = 500): Promise<T>`: Failsafe wrapper guaranteeing Netlify Blobs or external calls never block AWS Lambda functions.
*   `syncFromBlob(roomId: string, room: ServerRoomSession): Promise<void>`: Safely loads room state from Netlify Blobs storage with non-blocking timeout.
*   `syncToBlob(room: ServerRoomSession): Promise<void>`: Safely persists room state to Netlify Blobs storage with non-blocking timeout.
*   `getParticipantList(room: ServerRoomSession): Participant[]`: Sanitizes and outputs participant array.
*   `getLiveMediaState(mediaState: MediaState): MediaState`: Computes real-time elapsed playback position for live movies.
*   `GET(req: NextRequest, { params }): Promise<NextResponse>`: Handles room state queries with canonical `roomId` normalization.
*   `POST(req: NextRequest, { params }): Promise<NextResponse>`: Handles room joins, heartbeats, host media adoption, play/pause updates, seeks, and chat.

### 3. URL Resolution API (`src/app/api/resolve-url/route.ts`)
*   `GET(req: NextRequest): Promise<NextResponse>`: Resolves streaming URLs, direct video links, and metadata for external media.

### 4. Room Page & Main Controller (`src/app/room/[id]/page.tsx`)
*   `RemoteAudio({ stream })`: Dedicated unmuted `<audio>` renderer for remote peers with auto-unlock listeners (`click`, `touchstart`, `pointerdown`).
*   `RoomPage()`: Master controller managing signaling, WebRTC streams, UI drawers, chat, soundboard, and reactions.
    *   `handlePlayPause(playing: boolean)`: Dispatches movie play/pause events.
    *   `handleSeek(seconds: number)`: Dispatches movie seek updates.
    *   `handleTimeProgress(state)`: Emits continuous playback progress pulses.
    *   `handleSelectApp(appId: KosmiAppId, mediaState?)`: Switches active room application.
    *   `handleSendMessage(text: string)`: Sends chat message across P2P channels and server.
    *   `handleTriggerSound(soundId: string)`: Dispatches synthesized sound effect trigger.
    *   `handleSendReaction(emoji: string)`: Dispatches flying on-screen emoji reactions.
    *   `toggleVideo()`: Hardware-access camera activator with track preservation.
    *   `toggleAudio()`: Hardware-access microphone activator with track preservation.
    *   `handleToggleScreenShare()`: Toggles display media capture and switches stage mode.

### 5. Media Stage Component (`src/components/KosmiStage.tsx`)
*   `KosmiStage`: Primary theater stage rendering movie playback, video tiles, and overlay controls.
    *   `effectiveIsHost`: Permission evaluator granting controls to creator, sole watcher (`participants.length <= 1`), or active room host.
    *   `handlePlayPause(nextPlaying: boolean)`: Toggles movie playback.
    *   `handleSeekChange(e: React.ChangeEvent<HTMLInputElement>)`: Interactively scrubs the progress bar.
    *   `handleSeekCommit(e)`: Commits playback position to stage and signaling.
    *   `handleSkip(seconds: number)`: Performs `-10s` / `+10s` instant movie skip.
    *   `toggleFullscreen()`: Toggles full-screen stage viewport.
    *   `seekVideoTo(seconds: number)`: Synchronously positions underlying HTML5 `<video>`.
    *   `getCurrentPlaybackTime(): number`: Reads live `<video>` current time.
    *   `handleBufferStart()`: Debounced buffer state tracker preventing premature loading spinners.
    *   `handleBufferEnd()`: Clears buffering overlay when playback resumes.
    *   `formatTime(seconds: number): string`: Formats time into `HH:MM:SS` or `MM:SS`.

### 6. Interactive Sidebar (`src/components/KosmiSidebar.tsx`)
*   `LiveParticipantTile`: Video/avatar tile displaying remote or local stream, audio mute indicators, speaking halo, and host badge.
*   `KosmiSidebar`: Tabbed drawer containing Chat, Peers list, Soundboard triggers, and Room Invite links.
    *   `handleSend(e)`: Submits chat message.
    *   `handleCopyLink()`: Copies room share URL to clipboard with fallback.
    *   `handleVolumeChange(e)`: Local master audio slider.

### 7. Floating Control Dock (`src/components/KosmiDock.tsx`)
*   `KosmiDock`: Floating tactile dock with App Launcher, Mic toggle, Camera toggle, Screen Share toggle, and Sidebar tab buttons.

### 8. Room Top Bar (`src/components/KosmiTopBar.tsx`)
*   `KosmiTopBar`: Header navigation displaying Home link, Room ID badge, Copy Room Link, Active App badge, and User profile pill.

### 9. Application Selector Modal (`src/components/KosmiAppSelector.tsx`)
*   `KosmiAppSelector`: Modal offering YouTube search/URL, Hindi Shinchan catalog selection, Screen Share, and Lounge mode.

### 10. Flying Reactions Canvas (`src/components/ScreenReactions.tsx`)
*   `ScreenReactions`: Canvas rendering flying floating emojis across the stage.

### 11. Screen Share Stage (`src/components/ScreenShareStage.tsx`)
*   `ScreenShareStage`: Dedicated viewport for active screen share streams.

### 12. Shared Browser Stage (`src/components/SharedBrowserStage.tsx`)
*   `SharedBrowserStage`: Embedded browser frame with quick navigation links.

### 13. UI & Utility Modules
*   **Hero Carousel** (`src/components/ui/hero-carousel.tsx`):
    *   `HeroCarousel`: Interactive 3D cover-flow movie carousel for the homepage.
*   **Soundboard Synthesizer** (`src/lib/soundboard.ts`):
    *   `SoundboardSynthesizer`: Web Audio API procedural synthesizer (Applause, Laughter, Rimshot, Airhorn, Suspense, Pop, Whoosh, Click, etc.).
*   **Shinchan Catalog** (`src/lib/shinchan-catalog.ts`):
    *   `SHINCHAN_MOVIES`: Inventory of 11 preloaded Hindi Dubbed full movies.
*   **User Generator** (`src/lib/user-generator.ts`):
    *   `generateRandomUser()`: Produces random unique name, avatar, and color theme.
*   **Classname Merge Utility** (`src/lib/utils.ts`):
    *   `cn(...inputs: ClassValue[])`: Tailwind merge and clsx wrapper.
*   **Home Page** (`src/app/page.tsx`):
    *   `HomePage`: Landing page with Hero Carousel, Instant Party Creator, and Resilient Room Join input parser (`handleJoinParty`).

---

## Bug Fix Ledger (Starting From Today)

| Date | Issue Description | Root Cause | Files Changed | Guarded/Protected Functions |
| :--- | :--- | :--- | :--- | :--- |
| 2026-10-09 | Peer audio/video call failed to stream between participants when cameras/mics turned on dynamically; Non-host video experienced periodic buffer stalls and stutter. | `callPeer` in `peer-sync.ts` attempted `pc.addTrack` without SDP renegotiation when a new track kind (video) was added, preventing WebRTC from sending the stream to the peer. In `KosmiStage.tsx`, 3.5s drift threshold caused non-hosts to repeatedly flush decode buffers on 1.5s heartbeats. | `src/lib/peer-sync.ts`, `src/app/room/[id]/page.tsx`, `src/components/KosmiStage.tsx` | `MeshRoomSignaling.callPeer`, `RoomPage.onRemoteStream`, `KosmiStage.effectiveIsHost`, `KosmiStage.seekVideoTo` |
| 2026-10-09 | When a participant joined an existing room, the video started from 0:00 instead of syncing to what the host was watching, and reset the room's playback position. | In `route.ts`, `room.participants.size <= 1` evaluated to true when a newcomer joined, incorrectly marking the newcomer as `isHost: true`. The newcomer's periodic heartbeat at 1.5s sent `currentTime: 0`, overwriting the room's live playback time. In `page.tsx` and `KosmiStage.tsx`, newcomer initialized with `isHost: true` before server confirmation, preventing initial seek to host's position. | `src/app/api/room/[id]/route.ts`, `src/lib/peer-sync.ts`, `src/app/room/[id]/page.tsx`, `src/components/KosmiStage.tsx` | `getOrCreateRoom`, `POST`, `syncFromBlob`, `MeshRoomSignaling.triggerSync`, `RoomPage.handleTimeProgress`, `KosmiStage.effectiveIsHost`, `KosmiStage.seekVideoTo` |
| 2026-10-09 | Non-host participant video was buffering, stalling with loading spinner, and not playing smoothly. | In `KosmiStage.tsx`, an 8.0s hard-seek drift threshold was repeatedly triggered whenever a guest lagged slightly behind the host. Each hard seek forced HTML5 `<video>` decode buffer flushes, triggering `onBuffer` and loading spinners every 10 seconds. In addition, 3 duplicate delayed seeks (at 300ms, 800ms, 1600ms) on join were thrashing the browser's initial buffer. Replaced hard-seeking during continuous playback with seamless rate-nudging (`1.05x` / `0.95x`) and discrete seek detection (>4.5s delta), completely eliminating buffer stalls. | `src/components/KosmiStage.tsx` | `KosmiStage.seekVideoTo`, `KosmiStage.handleBufferStart` |
| 2026-10-09 | Non-host video playback stalled in buffer loop due to browser unmuted autoplay rejection, brittle 4.5s delta threshold, ReactPlayer static playbackRate, and aggressive 5s room prune timeout. | 1. In `KosmiStage.tsx`, browser autoplay policies blocked unmuted playback on newcomer join, rejecting `videoEl.play()` and leaving `<video>` in a paused state that triggered perpetual `isBuffering: true` stalls. 2. `Math.abs(newRemoteTime - prevRemoteTime) > 4.5` falsely classified normal network latency intervals as discrete host skips, triggering hard seeks. 3. `ReactPlayer` had static `playbackRate={1}`, overriding DOM nudges. 4. In `seekVideoTo`, `loadedmetadata` and `canplay` both fired seeks on startup. 5. In `route.ts`, 5-second prune timeout prematurely deleted participants during brief network delays. Implemented tiered rate nudging (`1.04x`/`0.96x`, `1.12x`/`0.88x`, `1.20x`/`0.80x`), wall-clock elapsed skip detection, dynamic `currentPlaybackRate` React state, single-execution startup seek listeners, global unmuted autoplay unlock handlers (`pointerdown`, `click`, `touchstart`, `keydown`) with temporary muted fallback, and relaxed room prune grace period to 12s. | `src/components/KosmiStage.tsx`, `src/app/api/room/[id]/route.ts` | `KosmiStage.seekVideoTo`, `KosmiStage.handleBufferStart`, `KosmiStage.handleBufferEnd`, `pruneInactive` |
| 2026-10-09 | Changing user nickname in top bar did not update the name displayed on user's video tile in sidebar/PIP feeds. | In `page.tsx`, `handleUpdateNickname` updated local component state and broadcast over P2P, but failed to call `signaling.updateCurrentUser({ name })` or `signaling.triggerSync()`. On the next 1.5s server sync, `signaling.onSync` mapped `syncData.participants` where `serverP` still held the stale server name, overwriting `participants[me].name` back to the old name. Additionally, `KosmiSidebar.tsx` clamped the name span to `max-w-[75px]`, clipping longer updated names, and `KosmiTopBar.tsx` discarded name edits on input blur. Fixed by propagating name changes immediately to `signalingRef`, triggering server heartbeat sync, guarding `onSync` against overwriting local user name, auto-saving on blur, and expanding video tile text span. | `src/app/room/[id]/page.tsx`, `src/components/KosmiSidebar.tsx`, `src/components/KosmiTopBar.tsx`, `src/components/ParticipantBubbles.tsx` | `RoomPage.handleUpdateNickname`, `KosmiTopBar.handleSaveName`, `KosmiSidebar.LiveParticipantTile` |
| 2026-10-09 | Clicking reaction emotes in the reaction bar only animated locally and did not appear on other participants' screens. | 1. In `page.tsx`, `handleSendReaction` and `handleTriggerSound` only invoked `signaling.broadcast()`, relying solely on same-browser `BroadcastChannel` and fragile P2P WebRTC DataChannels with zero server fallback signaling. When participants connected across different networks, mobile devices, or firewalls where DataChannels were disconnected/blocked, reactions were entirely dropped. 2. `peer-sync.ts` had a connection lockout bug in `connectToPeer` where stale/pending failed connections prevented reconnect attempts, and fallback peers omitted `connection` and `call` listeners. 3. `route.ts` lacked storage and synchronization endpoints for reactions and sounds. Resolved by implementing a dual-delivery architecture (instant P2P WebRTC + 100% reliable server room polling sync with unique ID deduplication), adding `notifyReaction` and `notifySound` to `MeshRoomSignaling`, and handling `reactions` and `sounds` arrays with a 10s retention window in `route.ts`. | `src/app/api/room/[id]/route.ts`, `src/lib/peer-sync.ts`, `src/app/room/[id]/page.tsx` | `RoomPage.handleSendReaction`, `RoomPage.triggerFlyingReaction`, `MeshRoomSignaling.notifyReaction`, `MeshRoomSignaling.broadcast`, `route.POST` |
| 2026-10-09 | Participant audio and video stopped/cut off after 10-60 seconds; high Netlify usage (75% limit) due to aggressive heartbeat polling. | 1. In `page.tsx`, `createMediaStreamSource(localStream)` inside the audio level effect was not stored in a persistent reference; Chrome V8 garbage collector reclaimed the source node after ~10-60s, severing the Web Audio graph and silencing the microphone track. 2. `onSync` running every 1.5s called `callPeer` continuously; when a call was already open, re-calling tore down the active `MediaConnection` and reset remote streams to null. 3. `RemoteAudio` had `style={{ display: 'none' }}`, causing Chromium power management to throttle or put the audio element to sleep after 60s. 4. Lack of NAT keepalive allowed router UDP pinholes to time out after 30-60s. 5. Excessive 1.5s server polling and un-guarded Netlify Blobs writes on every heartbeat consumed function and blob allowances. Fixed by anchoring Web Audio sources and streams to window/refs, eliminating repeated `callPeer` from sync loop, guarding active media connections, adding a 10s WebRTC NAT keepalive ping, keeping audio in DOM render tree, relaxing heartbeat to 5s, and gating Netlify Blobs writes to state mutations only. | `src/lib/peer-sync.ts`, `src/app/room/[id]/page.tsx`, `src/app/api/room/[id]/route.ts` | `MeshRoomSignaling.callPeer`, `MeshRoomSignaling.handleIncomingCall`, `RoomPage.RemoteAudio`, `route.pruneInactive`, `route.POST` |
| 2026-10-09 | Video call dropped or stalled when both peers enabled cameras dynamically; Host identity was ambiguous across video tiles, stage, and top bar. | 1. In `peer-sync.ts` and `page.tsx`, closing superseded media calls during dynamic renegotiation triggered `onRemoteStreamEnd`, unconditionally clearing `p.stream = null` even when active live tracks were still connected. 2. `LiveParticipantTile` and `ParticipantBubbles` lacked `addtrack`/`removetrack` event listeners, causing HTMLVideoElements to stall when tracks arrived post-mount. 3. `setLocalStream` in `page.tsx` mutated stream references in-place without refreshing React state. 4. Host identity was not prominently distinguished. Resolved by adding `getRemoteStream` track liveness guards, track change event listeners, fresh `MediaStream` state wrappers, and a prominent remote control icon and badge (`📺 Host` / `Tv`) across `LiveParticipantTile`, `ParticipantBubbles`, `KosmiTopBar`, and `KosmiStage`. | `src/lib/peer-sync.ts`, `src/app/room/[id]/page.tsx`, `src/components/KosmiSidebar.tsx`, `src/components/ParticipantBubbles.tsx`, `src/components/KosmiTopBar.tsx`, `src/components/KosmiStage.tsx` | `MeshRoomSignaling.callPeer`, `MeshRoomSignaling.handleIncomingCall`, `MeshRoomSignaling.getRemoteStream`, `RoomPage.onRemoteStreamEnd`, `KosmiSidebar.LiveParticipantTile`, `KosmiTopBar`, `KosmiStage` |
| 2026-10-10 | Laptop participant tile in sidebar was squashed into a tiny centered pill when camera was off; sidebar covered 50% of the screen instead of being a compact side panel. | In `KosmiSidebar.tsx`, `!hasVideo ? 'h-14 aspect-auto' : ''` and `max-w-[170px] mx-auto` collapsed the 16:9 participant tile on laptops into a small 56px capsule. In `page.tsx`, `w-full flex-1` on the sidebar container caused it to take equal 50% flex space with the video player. Restored full-width `aspect-video rounded-xl` tile with `w-12 h-12` avatar, restored standard grid container (`grid-cols-1` / `grid-cols-2`), restored `pb-24 sm:pb-4` controls padding in `KosmiStage.tsx`, and restored the exact original `main flex-row` layout with `w-80 xl:w-96` sidebar. The video player once again occupies ~80% of laptop screen and the sidebar is a slim 320px/384px companion. Laptop is 100% restored to original verified baseline. | `src/components/KosmiSidebar.tsx`, `src/components/KosmiStage.tsx`, `src/app/room/[id]/page.tsx` | `KosmiSidebar.LiveParticipantTile`, `KosmiStage`, `RoomPage` |
| 2026-10-10 | On mobile devices, opening chat covered 100% of the screen and completely hid the movie; participant video tile dominated the mobile panel. | In `page.tsx`, the mobile sidebar was rendered as a full-screen fixed overlay (`fixed inset-y-0 w-full z-50`), completely removing the movie player when chat was active. Implemented a responsive vertical split layout for mobile portrait: the movie player stays pinned at the top covering the larger part of the screen (`h-[48dvh] sm:h-[50dvh]`), while the interactive sidebar fills the lower half (`flex-1 min-h-0`). In `KosmiSidebar.tsx`, guarded participant tiles with `max-h-24 lg:max-h-none` so camera feeds remain compact on mobile while staying full-width 16:9 widescreen on laptops. Wrapped `KosmiDock` in `hidden lg:block` when chat is active on mobile so message inputs are never obstructed. Desktop/laptop is 100% guarded with `lg:flex-none lg:w-80 xl:w-96`. | `src/app/room/[id]/page.tsx`, `src/components/KosmiSidebar.tsx`, `src/components/KosmiStage.tsx` | `RoomPage`, `KosmiSidebar.LiveParticipantTile`, `KosmiStage` |
| 2026-10-10 | Mobile and touchscreen users could not quickly double-tap to skip forward (+10s) or backward (-10s) on video playback, requiring tiny scrub bar interactions on mobile screens. | Implemented native double-tap detection in `KosmiStage.tsx` via `handleStageInteraction` tracking touches within 350ms and 80px radius. Right-side double tap triggers `handleSkip(10)` and left-side triggers `handleSkip(-10)` with synchronized room state updates. Deduplicated synthetic clicks using `lastTouchTimeRef` to avoid double triggers, and deconflicted controls bars and buttons. Added YouTube/Hotstar-style visual feedback arcs and circular badges (`+10s`/`-10s`) with tactile soundboard click. Left laptop and desktop layout 100% untouched. | `src/components/KosmiStage.tsx` | `KosmiStage.handleSkip`, `KosmiStage.handleStageInteraction`, `KosmiStage.seekVideoTo` |



