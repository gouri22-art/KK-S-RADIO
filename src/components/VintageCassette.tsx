/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { YouTubeTrackInfo } from '../types';

interface VintageCassetteProps {
  isPlaying: boolean;
  track: YouTubeTrackInfo;
  tapeCounter: number;
}

export const VintageCassette: React.FC<VintageCassetteProps> = ({
  isPlaying,
  track,
  tapeCounter,
}) => {
  // Calculate tape thickness based on track progress / counter
  const progressRatio = (tapeCounter % 180) / 180;
  const leftSpoolRadius = Math.max(34, 46 - progressRatio * 18);
  const rightSpoolRadius = Math.max(34, 28 + progressRatio * 18);

  return (
    <div
      id="vintage-cassette-tape"
      className="relative w-full max-w-[460px] aspect-[1.58/1] mx-auto rounded-xl p-3 select-none transition-transform duration-300 hover:scale-[1.01]"
      style={{
        background: 'linear-gradient(180deg, #2b221d 0%, #17120f 50%, #0d0a08 100%)',
        boxShadow: `
          0 20px 40px -15px rgba(0, 0, 0, 0.9),
          0 0 0 2px rgba(217, 93, 44, 0.2),
          inset 0 1px 2px rgba(255, 255, 255, 0.15),
          inset 0 -2px 4px rgba(0, 0, 0, 0.8)
        `,
      }}
    >
      {/* 4 Corner Screws */}
      <div className="absolute top-2.5 left-2.5 w-2.5 h-2.5 rounded-full bg-stone-700 border border-stone-900 flex items-center justify-center shadow-inner">
        <div className="w-1.5 h-[1px] bg-stone-400 rotate-45"></div>
      </div>
      <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-stone-700 border border-stone-900 flex items-center justify-center shadow-inner">
        <div className="w-1.5 h-[1px] bg-stone-400 -rotate-12"></div>
      </div>
      <div className="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 rounded-full bg-stone-700 border border-stone-900 flex items-center justify-center shadow-inner">
        <div className="w-1.5 h-[1px] bg-stone-400 rotate-90"></div>
      </div>
      <div className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-stone-700 border border-stone-900 flex items-center justify-center shadow-inner">
        <div className="w-1.5 h-[1px] bg-stone-400 rotate-30"></div>
      </div>

      {/* Main Vintage Cassette Label */}
      <div
        id="cassette-label"
        className="w-full h-full rounded-lg relative overflow-hidden flex flex-col justify-between p-3 border border-[#3d2f26]"
        style={{
          background: 'linear-gradient(180deg, #f4ede2 0%, #ebe0cf 55%, #e1d3be 100%)',
          boxShadow: 'inset 0 0 15px rgba(100, 60, 20, 0.15)',
        }}
      >
        {/* Vintage Top Color Stripes (Classic 70s Red/Orange/Gold Indian tape branding) */}
        <div className="absolute top-0 left-0 right-0 h-4 flex flex-col">
          <div className="h-1.5 bg-[#b93815]"></div>
          <div className="h-1 bg-[#d95d2c]"></div>
          <div className="h-1 bg-[#e08a3c]"></div>
          <div className="h-0.5 bg-[#caa257]"></div>
        </div>

        {/* Top Header of Cassette Label */}
        <div className="relative z-10 pt-2 flex items-center justify-between text-[#1f1712]">
          <div className="flex items-center gap-2">
            <span className="font-['Rozha_One',serif] text-xs text-[#b93815] tracking-wider font-bold">
              ऑल इंडिया
            </span>
            <span className="text-[10px] font-mono-retro font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#1f1712] text-[#f4ede2]">
              {track.side ? track.side.split('—')[0].trim() : 'SIDE A'}
            </span>
            <span className="text-[9px] font-mono-retro font-bold text-[#b93815] tracking-wider border border-[#b93815]/40 px-1 rounded">
              C-90 STEREO
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-serif-vintage tracking-wider text-[#1f1712] font-black">
              KK'S RADIO
            </span>
            <span className="block text-[8px] font-mono-retro tracking-widest text-[#785942] uppercase">
              Hi-Fi Master Tape
            </span>
          </div>
        </div>

        {/* Center Cassette Window & Rotating Reels */}
        <div
          id="cassette-tape-window"
          className="relative my-auto w-[88%] mx-auto h-[78px] rounded-lg border-2 border-[#2b2019] overflow-hidden flex items-center justify-between px-6"
          style={{
            background: 'linear-gradient(180deg, #181310 0%, #0d0a08 100%)',
            boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          {/* Acrylic Glass Highlight */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12] pointer-events-none z-30"></div>

          {/* Scale Measurement Hashmarks */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[8px] font-mono-retro text-amber-200/40 z-20 pointer-events-none">
            <span>100</span>
            <span>50</span>
            <span className="text-amber-500 font-bold">▲ 0</span>
            <span>50</span>
            <span>100</span>
          </div>

          {/* Magnetic Tape Ribbon connecting reels */}
          <div className="absolute bottom-4 left-12 right-12 h-2.5 bg-[#261811] border-t border-b border-[#3b271c]/60 z-0"></div>

          {/* LEFT REEL (Supply Spool) */}
          <div className="relative z-10 flex items-center justify-center">
            {/* Magnetic Tape Pack (Dark Brown tape wound on spool) */}
            <div
              className="rounded-full bg-[#1e130c] border border-[#382316] flex items-center justify-center transition-all duration-1000 shadow-inner"
              style={{
                width: `${leftSpoolRadius * 2}px`,
                height: `${leftSpoolRadius * 2}px`,
              }}
            >
              {/* Rotating Reel Spokes / Gear Teeth */}
              <div
                id="left-cassette-reel"
                className={`w-12 h-12 rounded-full bg-[#e8ded1] border-2 border-[#1f1712] flex items-center justify-center relative shadow-md ${
                  isPlaying ? 'spin-reel-playing' : 'spin-reel-paused'
                }`}
              >
                {/* 6 Gear Spokes */}
                <div className="absolute w-full h-1 bg-[#1f1712]"></div>
                <div className="absolute w-full h-1 bg-[#1f1712] rotate-60"></div>
                <div className="absolute w-full h-1 bg-[#1f1712] rotate-120"></div>

                {/* Center Hub Hole */}
                <div className="w-5 h-5 rounded-full bg-[#0d0a08] border-2 border-[#e8ded1] z-10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-amber-500/80"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Inspection Window with Subtle Amber Glow */}
          <div className="relative z-10 flex flex-col items-center justify-center px-2 py-1 rounded bg-[#0d0a08]/80 border border-amber-950/60 shadow-inner">
            <div className="text-[7px] font-mono-retro tracking-widest text-amber-500/80 uppercase">
              DOLBY B-NR
            </div>
            <div className="flex items-center gap-1 my-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-stone-700'}`}></span>
              <span className="text-[9px] font-mono-retro font-bold text-amber-200">
                {String(Math.floor(tapeCounter)).padStart(3, '0')}
              </span>
            </div>
            <div className="text-[6px] font-mono-retro tracking-wider text-stone-500 uppercase">
              TYPE I • NORMAL
            </div>
          </div>

          {/* RIGHT REEL (Take-up Spool) */}
          <div className="relative z-10 flex items-center justify-center">
            {/* Magnetic Tape Pack */}
            <div
              className="rounded-full bg-[#1e130c] border border-[#382316] flex items-center justify-center transition-all duration-1000 shadow-inner"
              style={{
                width: `${rightSpoolRadius * 2}px`,
                height: `${rightSpoolRadius * 2}px`,
              }}
            >
              {/* Rotating Reel Spokes */}
              <div
                id="right-cassette-reel"
                className={`w-12 h-12 rounded-full bg-[#e8ded1] border-2 border-[#1f1712] flex items-center justify-center relative shadow-md ${
                  isPlaying ? 'spin-reel-playing' : 'spin-reel-paused'
                }`}
              >
                {/* 6 Gear Spokes */}
                <div className="absolute w-full h-1 bg-[#1f1712]"></div>
                <div className="absolute w-full h-1 bg-[#1f1712] rotate-60"></div>
                <div className="absolute w-full h-1 bg-[#1f1712] rotate-120"></div>

                {/* Center Hub Hole */}
                <div className="w-5 h-5 rounded-full bg-[#0d0a08] border-2 border-[#e8ded1] z-10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-amber-500/80"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Track Title on Typed Paper Ribbon */}
        <div className="relative z-10 pb-0.5 flex items-center justify-between border-t border-[#cbb89e] pt-1.5 text-[#1f1712]">
          <div className="flex-1 truncate pr-2">
            <span className="block text-[11px] font-mono-retro font-bold text-[#1f1712] truncate">
              {track.title}
            </span>
            <span className="block text-[9px] font-serif-vintage italic text-[#785942] truncate">
              {track.artist} {track.year ? `(${track.year})` : ''}
            </span>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block text-[8px] font-mono-retro font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#b93815]/15 text-[#b93815] border border-[#b93815]/30">
              KK SPECIAL
            </span>
          </div>
        </div>
      </div>

      {/* Cassette Tape Head Notch at bottom */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-48 h-3 bg-[#17120f] border-t border-[#3d2f26] rounded-b-md flex items-center justify-between px-6 shadow-md">
        <div className="w-2 h-1 bg-[#0d0a08] rounded-sm"></div>
        <div className="w-6 h-1.5 bg-[#825330] rounded-sm border border-[#a16c43]"></div>
        <div className="w-2 h-1 bg-[#0d0a08] rounded-sm"></div>
      </div>
    </div>
  );
};
