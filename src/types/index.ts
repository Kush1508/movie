export type StageMode = 'video' | 'browser' | 'screen';

export interface MediaState {
  url: string;
  title: string;
  playing: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  hostId: string;
  lastUpdated: number;
  embedUrl?: string;
  isFacebook?: boolean;
}

export interface Participant {
  id: string;
  peerId?: string;
  name: string;
  avatar: string;
  color: string;
  isHost: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isSpeaking: boolean;
  stream?: MediaStream | null;
  joinedAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'sound' | 'system' | 'reaction';
}

export interface FlyingReaction {
  id: string;
  emoji: string;
  x: number;
  senderName: string;
}

export type KosmiAppId = 'youtube' | 'facebook' | 'browser' | 'screenshare' | 'lounge';

export interface PeerSyncMessage {
  type:
    | 'STATE_SYNC'
    | 'PLAY_STATE'
    | 'SEEK'
    | 'URL_CHANGE'
    | 'APP_CHANGE'
    | 'STAGE_MODE_CHANGE'
    | 'CHAT_MESSAGE'
    | 'SOUND_TRIGGER'
    | 'FLYING_REACTION'
    | 'PARTICIPANT_UPDATE'
    | 'BROWSER_URL_CHANGE';
  payload: any;
  senderId: string;
  timestamp: number;
}

export interface ShinchanMovie {
  id: string;
  title: string;
  hindiTitle?: string;
  year: number;
  duration: string;
  synopsis: string;
  poster: string;
  backdrop?: string;
  streamUrl: string;
  isFacebook?: boolean;
  tags: string[];
}
