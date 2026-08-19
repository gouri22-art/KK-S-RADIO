/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface YouTubeTrackInfo {
  title: string;
  artist: string;
  year?: string;
  side?: string;
  videoId?: string;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: {
            autoplay?: 0 | 1;
            controls?: 0 | 1;
            disablekb?: 0 | 1;
            enablejsapi?: 0 | 1;
            fs?: 0 | 1;
            iv_load_policy?: 1 | 3;
            list?: string;
            listType?: 'playlist' | 'search' | 'user_uploads';
            loop?: 0 | 1;
            modestbranding?: 1;
            origin?: string;
            playlist?: string;
            playsinline?: 0 | 1;
            rel?: 0 | 1;
            showinfo?: 0 | 1;
          };
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number; target: YTPlayerInstance }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  nextVideo: () => void;
  previousVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoData: () => {
    video_id: string;
    author: string;
    title: string;
  };
  getPlaylist: () => string[];
  getPlaylistIndex: () => number;
  loadPlaylist: (playlist: string | string[] | { list: string; listType?: string; index?: number; startSeconds?: number; suggestedQuality?: string }) => void;
  cuePlaylist: (playlist: string | string[] | { list: string; listType?: string; index?: number; startSeconds?: number; suggestedQuality?: string }) => void;
  loadVideoById: (videoId: string | { videoId: string; startSeconds?: number }) => void;
  cueVideoById: (videoId: string | { videoId: string; startSeconds?: number }) => void;
}
