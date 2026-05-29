// YouTube IFrame API types — ambient declarations.
// See src/engines/ytplayer/index.ts for the loader.

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  setPlaybackQuality(quality: string): void;
  loadVideoById(videoId: string, startSeconds?: number): void;
  getVideoUrl(): string;
}

interface YTPlayerStateConstants {
  UNSTARTED: -1;
  ENDED: 0;
  PLAYING: 1;
  PAUSED: 2;
  BUFFERING: 3;
  CUED: 5;
}

interface YTNamespace {
  Player: new (elementId: string, options: Record<string, unknown>) => YTPlayer;
  PlayerState: YTPlayerStateConstants;
}

interface Window {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
}
