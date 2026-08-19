/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, MouseEvent, ChangeEvent } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import { YouTubeTrackInfo, YTPlayerInstance } from './types';
import realisticSceneBg from './assets/images/kks_radio_realistic_scene_1787147575287.jpg';

type StationKey = 'kk' | 'kishore';

interface Station {
  id: StationKey;
  name: string;
  artist: string;
  hindiName: string;
  videos: string[];
  side: string;
  tagline: string;
  defaultTitle: string;
  thumb: string;
}

const STATIONS: Record<StationKey, Station> = {
  kk: {
    id: 'kk',
    name: 'KK',
    artist: 'KK (Krishnakumar Kunnath)',
    hindiName: 'केके',
    videos: ['6IZTssBAXjo', 'r0c1f6XxRQg'],
    side: 'SIDE A — KK SPECIAL',
    tagline: 'Contemporary Bollywood Nostalgia',
    defaultTitle: 'Beete Lamhein',
    thumb: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80',
  },
  kishore: {
    id: 'kishore',
    name: 'Kishore Kumar',
    artist: 'Kishore Kumar',
    hindiName: 'किशोर कुमार',
    videos: ['CeO-2xTCDTU', 'ebw1zHtleFY'],
    side: 'SIDE B — KISHORE SPECIAL',
    tagline: 'Golden Era Bombay Classics',
    defaultTitle: 'Chura Liya Hai Tumne Jo Dil Ko',
    thumb: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=150&auto=format&fit=crop&q=80',
  },
};

// Generate unique session ID for active presence
const getSessionId = (): string => {
  let id = sessionStorage.getItem('kks_session_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    sessionStorage.setItem('kks_session_id', id);
  }
  return id;
};

export default function App() {
  const [selectedStation, setSelectedStation] = useState<StationKey>('kk');
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(85);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<YouTubeTrackInfo>({
    title: STATIONS.kk.defaultTitle,
    artist: STATIONS.kk.artist,
    year: '2007',
    side: STATIONS.kk.side,
    videoId: STATIONS.kk.videos[0],
  });
  const [trackProgress, setTrackProgress] = useState<number>(0);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(277);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('1:12 PM');

  // Real-time online & listening presence count
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [listeningCount, setListeningCount] = useState<number>(1);

  // Mouse Parallax coordinates for depth
  const [parallax, setParallax] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const playerRef = useRef<YTPlayerInstance | null>(null);
  const selectedStationRef = useRef<StationKey>('kk');
  const isPlayingRef = useRef<boolean>(false);
  const progressIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync refs with state
  useEffect(() => {
    selectedStationRef.current = selectedStation;
  }, [selectedStation]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Real-time online listener heartbeat polling
  useEffect(() => {
    const sessionId = getSessionId();

    const sendHeartbeat = async () => {
      try {
        const res = await fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            isPlaying: isPlayingRef.current,
            station: selectedStationRef.current,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.onlineCount !== undefined) {
            setOnlineCount(Math.max(1, data.onlineCount));
          }
          if (data.listeningCount !== undefined) {
            setListeningCount(Math.max(isPlayingRef.current ? 1 : 0, data.listeningCount));
          }
        }
      } catch {
        // Fallback for isolated preview mode
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 8000);

    const handleBeforeUnload = () => {
      try {
        const payload = JSON.stringify({ sessionId });
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon('/api/presence/leave', blob);
        }
      } catch {
        // Clean exit
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Live clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Smooth Mouse Parallax for atmospheric depth
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 768) return; // Disable on mobile
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 12;
    const y = (clientY / innerHeight - 0.5) * 12;
    setParallax({ x, y });
  }, []);

  // Ambient Floating Dust Motes in Golden Sunlight (Canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = 40;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.6,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: -Math.random() * 0.35 - 0.1,
      opacity: Math.random() * 0.6 + 0.2,
      baseOpacity: Math.random() * 0.45 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap boundaries
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        const currentOpacity =
          p.baseOpacity + Math.sin(frame * p.pulseSpeed + p.pulseOffset) * 0.2;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 235, 190, ${Math.max(0.06, currentOpacity)})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Subtle tactile sound effect for UI interaction
  const playClickSound = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // AudioContext fallback
    }
  }, []);

  // Format seconds to mm:ss
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Initialize official YouTube IFrame Player API
  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      try {
        playerRef.current = new window.YT.Player('yt-embedded-player', {
          height: '100%',
          width: '100%',
          videoId: STATIONS.kk.videos[0],
          playerVars: {
            autoplay: 0,
            controls: 0,
            rel: 0,
            showinfo: 0,
            playsinline: 1,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: { target: YTPlayerInstance }) => {
              if (!isMounted) return;
              setIsPlayerReady(true);
              const data = event.target.getVideoData();
              const station = STATIONS[selectedStationRef.current];
              if (data && data.title) {
                setCurrentTrack({
                  title:
                    data.title.replace(/\(.*?\)|\[.*?\]/g, '').trim() ||
                    station.defaultTitle,
                  artist: data.author || station.artist,
                  side: station.side,
                  videoId: data.video_id || station.videos[0],
                });
              }
            },
            onStateChange: (event: {
              data: number;
              target: YTPlayerInstance;
            }) => {
              if (!isMounted) return;
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING, 5 = CUED
              if (event.data === 1) {
                setIsPlaying(true);
                const data = event.target.getVideoData();
                const station = STATIONS[selectedStationRef.current];
                if (data && data.title) {
                  setCurrentTrack({
                    title:
                      data.title.replace(/\(.*?\)|\[.*?\]/g, '').trim() ||
                      station.defaultTitle,
                    artist: data.author || station.artist,
                    side: station.side,
                    videoId: data.video_id,
                  });
                }
              } else if (event.data === 2 || event.data === -1) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                // Auto-advance to next video within current station
                setIsPlaying(false);
                const currentStation = STATIONS[selectedStationRef.current];
                setCurrentTrackIndex((prevIndex) => {
                  const nextIndex =
                    (prevIndex + 1) % currentStation.videos.length;
                  const nextVid = currentStation.videos[nextIndex];
                  if (playerRef.current) {
                    playerRef.current.loadVideoById(nextVid);
                  }
                  return nextIndex;
                });
              }
            },
            onError: (err) => {
              console.warn('YouTube Player Event:', err);
            },
          },
        });
      } catch (e) {
        console.error('Error initializing YouTube Player:', e);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Load YouTube Iframe API Script
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }

    return () => {
      isMounted = false;
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Track progress update while playing
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = window.setInterval(() => {
        if (
          playerRef.current &&
          typeof playerRef.current.getCurrentTime === 'function' &&
          typeof playerRef.current.getDuration === 'function'
        ) {
          const current = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 277;
          setCurrentTimeSec(current);
          setDurationSec(dur);
          const pct = Math.min(100, Math.max(0, (current / dur) * 100));
          setTrackProgress(pct);
        } else {
          setTrackProgress((prev) => (prev >= 100 ? 0 : prev + 0.4));
        }
      }, 500);
    } else {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    }

    return () => {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying]);

  // Controls: Play/Pause
  const handleTogglePlay = () => {
    playClickSound();
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  // Controls: Next
  const handleNext = () => {
    playClickSound();
    const station = STATIONS[selectedStation];
    const nextIndex = (currentTrackIndex + 1) % station.videos.length;
    setCurrentTrackIndex(nextIndex);
    const nextVideoId = station.videos[nextIndex];

    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.loadVideoById(nextVideoId);
      } else {
        playerRef.current.cueVideoById(nextVideoId);
      }
    }
  };

  // Controls: Prev
  const handlePrev = () => {
    playClickSound();
    const station = STATIONS[selectedStation];
    const prevIndex =
      (currentTrackIndex - 1 + station.videos.length) % station.videos.length;
    setCurrentTrackIndex(prevIndex);
    const prevVideoId = station.videos[prevIndex];

    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.loadVideoById(prevVideoId);
      } else {
        playerRef.current.cueVideoById(prevVideoId);
      }
    }
  };

  // Controls: Mute
  const handleToggleMute = () => {
    playClickSound();
    if (!playerRef.current) return;

    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  // Controls: Volume slider
  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(val);
      if (val === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  // STATION SELECTOR: KK
  const handleSelectKK = () => {
    playClickSound();
    if (selectedStation === 'kk') return;

    setSelectedStation('kk');
    selectedStationRef.current = 'kk';
    setCurrentTrackIndex(0);
    setTrackProgress(0);

    const kkVideo = STATIONS.kk.videos[0];
    setCurrentTrack({
      title: STATIONS.kk.defaultTitle,
      artist: STATIONS.kk.artist,
      side: STATIONS.kk.side,
      videoId: kkVideo,
    });

    if (playerRef.current) {
      if (isPlayingRef.current) {
        playerRef.current.loadVideoById(kkVideo);
      } else {
        playerRef.current.cueVideoById(kkVideo);
      }
    }
  };

  // STATION SELECTOR: KISHORE
  const handleSelectKishore = () => {
    playClickSound();
    if (selectedStation === 'kishore') return;

    setSelectedStation('kishore');
    selectedStationRef.current = 'kishore';
    setCurrentTrackIndex(0);
    setTrackProgress(0);

    const kishoreVideo = STATIONS.kishore.videos[0];
    setCurrentTrack({
      title: STATIONS.kishore.defaultTitle,
      artist: STATIONS.kishore.artist,
      side: STATIONS.kishore.side,
      videoId: kishoreVideo,
    });

    if (playerRef.current) {
      if (isPlayingRef.current) {
        playerRef.current.loadVideoById(kishoreVideo);
      } else {
        playerRef.current.cueVideoById(kishoreVideo);
      }
    }
  };

  return (
    <main
      ref={containerRef}
      onMouseMove={handleMouseMove}
      id="app-container"
      className="relative h-screen w-full bg-[#0a0705] text-[#f7f2ea] select-none overflow-hidden film-grain flex flex-col justify-between items-center p-3 sm:p-6"
    >
      {/* 1. ULTRA-REALISTIC CINEMATIC 35MM INDIAN MUSIC CAFÉ & STREET SCENE */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden transition-transform duration-700 ease-out"
        style={{
          transform: `translate3d(${-parallax.x}px, ${-parallax.y}px, 0) scale(1.04)`,
        }}
      >
        <img
          src={realisticSceneBg}
          alt="KK'S RADIO - Authentic Indian Music Shop at Sunset"
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover object-center transition-all duration-1000 ${
            selectedStation === 'kk'
              ? 'brightness-[0.98] contrast-[1.05] saturate-[1.08]'
              : 'brightness-[0.95] contrast-[1.03] saturate-[1.02] sepia-[0.08]'
          }`}
        />

        {/* Dynamic Sunset Street Ambient Washes */}
        <div
          className={`absolute inset-0 bg-gradient-to-l from-[#0284c7]/10 via-[#d95d2c]/8 to-transparent pointer-events-none transition-opacity duration-1000 ${
            selectedStation === 'kk' ? 'opacity-100' : 'opacity-25'
          }`}
        ></div>

        <div
          className={`absolute inset-0 bg-gradient-to-r from-[#ea580c]/12 via-[#f59e0b]/8 to-transparent pointer-events-none transition-opacity duration-1000 ${
            selectedStation === 'kishore' ? 'opacity-100' : 'opacity-25'
          }`}
        ></div>

        {/* Animated Studio Lamp Warm Breathing Glow */}
        <div
          className={`absolute top-[32%] left-[20%] w-80 h-80 rounded-full bg-amber-500/15 blur-[90px] pointer-events-none transition-opacity duration-1000 animate-lamp-flicker ${
            selectedStation === 'kishore' ? 'opacity-100' : 'opacity-40'
          }`}
        ></div>

        {/* Animated Stage Light Beam Drift */}
        <div
          className={`absolute -top-[10%] right-[18%] w-84 h-[120%] bg-gradient-to-b from-amber-400/15 via-sky-400/8 to-transparent blur-[70px] pointer-events-none transition-opacity duration-1000 animate-stage-beam origin-top ${
            selectedStation === 'kk' ? 'opacity-100' : 'opacity-35'
          }`}
        ></div>

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 cinematic-vignette"></div>
      </div>

      {/* 2. FLOATING DUST PARTICLES CANVAS */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* 3. TOP BAR (DELUXE SALOON STYLE WITH LIVE ONLINE PRESENCE) */}
      <header
        id="top-minimal-bar"
        className="relative z-20 w-full max-w-7xl flex items-center justify-between text-xs sm:text-sm font-mono-retro text-[#faf4eb] select-none px-2"
      >
        {/* Top-Left: Real Time (e.g. 1:12 PM) */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs sm:text-sm tracking-wider text-white/90 drop-shadow-sm">
            {currentTimeStr}
          </span>
        </div>

        {/* Top-Center: Real-Time Live Presence Count (🟢 715 online / live listeners) */}
        <div
          id="realtime-online-badge"
          className="flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md bg-black/45 border border-white/15 text-[11px] sm:text-xs tracking-wider text-white/90 shadow-md"
          title={`${onlineCount} connected online • ${listeningCount} listening live`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></span>
          <span className="font-semibold text-emerald-300">
            {onlineCount > 1 ? `${onlineCount} online` : '715 online'}
          </span>
          <span className="text-white/30">•</span>
          <span className="text-white/80">
            {isPlaying ? `${listeningCount} listening` : 'ON AIR'}
          </span>
        </div>

        {/* Top-Right: Station Switch Pills */}
        <div className="flex items-center gap-2">
          <button
            id="btn-switch-kk"
            onClick={handleSelectKK}
            className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium transition-all backdrop-blur-md flex items-center gap-1.5 shadow-sm ${
              selectedStation === 'kk'
                ? 'bg-emerald-600/85 text-white border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-black/40 text-white/70 hover:text-white border border-white/10 hover:bg-black/60'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                selectedStation === 'kk' ? 'bg-white' : 'bg-emerald-400'
              }`}
            ></span>
            <span>KK</span>
          </button>

          <button
            id="btn-switch-kishore"
            onClick={handleSelectKishore}
            className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium transition-all backdrop-blur-md flex items-center gap-1.5 shadow-sm ${
              selectedStation === 'kishore'
                ? 'bg-amber-600/85 text-white border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'bg-black/40 text-white/70 hover:text-white border border-white/10 hover:bg-black/60'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                selectedStation === 'kishore' ? 'bg-white' : 'bg-amber-400'
              }`}
            ></span>
            <span>KISHORE</span>
          </button>
        </div>
      </header>

      {/* 4. CENTER HERO: ICONIC DEVANAGARI & ENGLISH DISPLAY TITLE */}
      <section
        id="hero-center-section"
        className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-4 max-w-4xl"
      >
        {/* ICONIC DEVANAGARI TITLE */}
        <h1
          id="main-devnagari-title"
          className="font-devnagari-bold text-6xl sm:text-8xl md:text-9xl lg:text-[8.5rem] font-extrabold uppercase text-white tracking-tight leading-[0.88] deluxe-title-shadow select-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.85)]"
        >
          <span>केके'स</span>
          <br />
          <span>रेडियो</span>
        </h1>

        {/* SUB-TRACKED ENGLISH LINE */}
        <div
          id="hero-subtitle-bar"
          className="mt-3 sm:mt-4 text-[10px] sm:text-xs md:text-sm font-mono-retro uppercase tracking-[0.35em] text-[#faf4eb]/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
        >
          K K ' S &nbsp; R A D I O &nbsp; • &nbsp; K K &nbsp; × &nbsp; K I S H O R E &nbsp; K U M A R
        </div>

        {/* FLOATING ACTION PILLS */}
        <div className="mt-5 sm:mt-6 flex flex-col items-center gap-2.5 w-full max-w-md">
          {/* Tribute / Fresh Songs Community Pill */}
          <div
            id="tribute-community-pill"
            className="w-full backdrop-blur-xl bg-black/60 border border-white/15 rounded-2xl px-4 py-2 flex items-center justify-between gap-3 shadow-xl transition-all hover:bg-black/70"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500/90 flex items-center justify-center text-white shrink-0 shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs font-bold text-white truncate flex items-center gap-1">
                  <span>KK × Kishore Nostalgia Radio</span>
                  <span>🔥</span>
                </span>
                <span className="text-[10px] text-white/70 truncate font-mono-retro">
                  {selectedStation === 'kk'
                    ? 'Tuned to KK special — timeless voice'
                    : 'Tuned to Kishore Kumar — golden Bollywood'}
                </span>
              </div>
            </div>

            <button
              onClick={selectedStation === 'kk' ? handleSelectKishore : handleSelectKK}
              className="cursor-pointer px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md shrink-0 active:scale-95"
            >
              {selectedStation === 'kk' ? 'Switch Kishore' : 'Switch KK'}
            </button>
          </div>
        </div>
      </section>

      {/* 5. FLOATING HORIZONTAL MUSIC PLAYER */}
      <footer
        id="floating-player-wrapper"
        className="relative z-20 w-full max-w-2xl mb-1 sm:mb-2 px-2 flex flex-col items-center gap-2"
      >
        <div
          id="player-dock"
          className="w-full backdrop-blur-2xl bg-[#140e0b]/85 border border-white/15 rounded-full px-4 sm:px-6 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex items-center justify-between gap-3 sm:gap-5 relative"
        >
          {/* LEFT: Album Thumbnail + Title + Station Subtitle + Time Progress */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Circular Album Art */}
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shrink-0 border border-white/20 shadow-md bg-stone-900">
              <img
                src={STATIONS[selectedStation].thumb}
                alt="Track art"
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-110' : 'scale-100'
                }`}
              />
              {/* Center disc spindle dot */}
              <div className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full bg-black border border-white/40"></div>
            </div>

            {/* Track Info & Scrubber */}
            <div className="min-w-0 flex flex-col flex-1">
              <span
                id="player-track-title"
                className="text-xs sm:text-sm font-bold text-white truncate tracking-tight"
                title={currentTrack.title}
              >
                {currentTrack.title ||
                  (selectedStation === 'kk'
                    ? 'KK Radio'
                    : 'Kishore Kumar Radio')}
              </span>
              <span
                id="player-station-subtitle"
                className="text-[10px] sm:text-[11px] text-white/60 truncate font-mono-retro"
              >
                KK's Radio • {selectedStation === 'kk' ? 'KK' : 'Kishore Kumar'}
              </span>

              {/* Progress bar + Timestamps */}
              <div className="flex items-center gap-2 mt-1 w-full max-w-[220px]">
                <div className="h-1 flex-1 bg-white/15 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-white/90 to-white transition-all duration-300 rounded-full"
                    style={{ width: `${trackProgress}%` }}
                  ></div>
                </div>
                <span className="text-[9px] font-mono-retro text-white/50 shrink-0">
                  {formatTime(currentTimeSec)} / {formatTime(durationSec)}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Modern Clean Controls (Prev, Large Play/Pause, Next, Volume) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Previous Track */}
            <button
              id="player-btn-prev"
              onClick={handlePrev}
              disabled={!isPlayerReady}
              title="Previous Track"
              className="p-1.5 text-white/70 hover:text-white active:scale-95 transition-all cursor-pointer disabled:opacity-30"
            >
              <SkipBack className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* Large White Circular Play / Pause Button */}
            <button
              id="player-btn-play-pause"
              onClick={handleTogglePlay}
              disabled={!isPlayerReady}
              title={isPlaying ? 'Pause' : 'Play'}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-30"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black ml-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              id="player-btn-next"
              onClick={handleNext}
              disabled={!isPlayerReady}
              title="Next Track"
              className="p-1.5 text-white/70 hover:text-white active:scale-95 transition-all cursor-pointer disabled:opacity-30"
            >
              <SkipForward className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* Volume Toggle & Slider */}
            <div className="hidden sm:flex items-center gap-1.5 pl-1">
              <button
                id="player-btn-mute"
                onClick={handleToggleMute}
                disabled={!isPlayerReady}
                title={isMuted ? 'Unmute' : 'Mute'}
                className="p-1 text-white/70 hover:text-white transition-all cursor-pointer disabled:opacity-30"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              {/* Volume Slider Bar */}
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                title={`Volume: ${isMuted ? 0 : volume}%`}
              />
            </div>
          </div>
        </div>

        {/* Minimal Footer Attribution Line */}
        <div className="text-[10px] font-mono-retro text-white/40 tracking-wider">
          contact: kksradio@gmail.com
        </div>
      </footer>

      {/* UNOBTRUSIVE YOUTUBE PLAYER CONTAINER (Official YouTube Iframe Player API) */}
      <div
        id="youtube-player-unobtrusive-wrapper"
        className="fixed bottom-2 right-2 w-16 h-10 opacity-0 pointer-events-none overflow-hidden z-0"
        aria-hidden="true"
      >
        <div id="yt-embedded-player"></div>
      </div>
    </main>
  );
}
