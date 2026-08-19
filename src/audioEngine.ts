/**
 * Vintage Nostalgic Audio Synthesizer Engine
 * Generates warm, nostalgic retro melodies with vintage tape saturation, 
 * subtle vinyl crackle, and analog filter modulation using Web Audio API.
 */

export interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  year: string;
  side: string;
  bpm: number;
  scale: number[]; // MIDI note offsets
  melodyPattern: number[];
  bassPattern: number[];
  instrumentType: 'sitar_synth' | 'vintage_rhodes' | 'nostalgic_flute' | 'golden_strings';
}

export const RETRO_TRACKS: TrackInfo[] = [
  {
    id: 'track-1',
    title: 'Pal Pal Dil Ke Paas',
    artist: 'Vintage Tape Session • Studio 7',
    year: '1973',
    side: 'SIDE A — TRACK 01',
    bpm: 72,
    scale: [60, 62, 64, 65, 67, 69, 71, 72, 74, 76], // C Major / Bilawal
    melodyPattern: [
      67, 69, 67, 64, 65, 67, 64, 60,
      62, 64, 65, 67, 65, 64, 62, 60,
      67, 72, 71, 69, 67, 65, 64, 65,
      67, 65, 64, 62, 60, 62, 60, 60
    ],
    bassPattern: [36, 36, 41, 41, 43, 43, 36, 36],
    instrumentType: 'sitar_synth',
  },
  {
    id: 'track-2',
    title: 'Chura Liya Hai Tumne',
    artist: 'Analog Acoustic Reverb',
    year: '1977',
    side: 'SIDE A — TRACK 02',
    bpm: 80,
    scale: [57, 59, 60, 62, 64, 65, 67, 69], // A minor
    melodyPattern: [
      64, 64, 65, 67, 65, 64, 62, 60,
      59, 60, 62, 64, 62, 60, 59, 57,
      64, 67, 69, 72, 69, 67, 65, 64,
      62, 65, 64, 62, 60, 59, 57, 57
    ],
    bassPattern: [33, 33, 38, 38, 40, 40, 33, 33],
    instrumentType: 'vintage_rhodes',
  },
  {
    id: 'track-3',
    title: 'Roop Tera Mastana',
    artist: 'Monsoon Vinyl Edition',
    year: '1969',
    side: 'SIDE B — TRACK 01',
    bpm: 68,
    scale: [58, 60, 61, 63, 65, 66, 68, 70], // Bb Minor / Bhairavi
    melodyPattern: [
      65, 66, 65, 63, 61, 63, 65, 65,
      68, 70, 68, 66, 65, 63, 61, 60,
      65, 68, 70, 73, 70, 68, 66, 65,
      63, 65, 66, 65, 63, 61, 58, 58
    ],
    bassPattern: [34, 34, 39, 39, 41, 41, 34, 34],
    instrumentType: 'nostalgic_flute',
  },
  {
    id: 'track-4',
    title: 'O Mere Dil Ke Chain',
    artist: 'Late Night Transistor Broadcast',
    year: '1972',
    side: 'SIDE B — TRACK 02',
    bpm: 76,
    scale: [60, 62, 64, 67, 69, 72, 74, 76], // Pentatonic / Bhoopali
    melodyPattern: [
      67, 69, 72, 69, 67, 64, 62, 60,
      64, 67, 69, 67, 64, 62, 60, 60,
      72, 74, 76, 74, 72, 69, 67, 64,
      67, 69, 67, 64, 62, 60, 60, 60
    ],
    bassPattern: [36, 36, 43, 43, 41, 41, 36, 36],
    instrumentType: 'golden_strings',
  },
];

class VintageAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentTrackIndex: number = 0;
  private volume: number = 0.8;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private noiseNode: AudioNode | null = null;
  private noiseGain: GainNode | null = null;
  private timerId: number | null = null;
  private step: number = 0;
  private onTrackChangeCallback?: (track: TrackInfo) => void;
  private onStateChangeCallback?: (isPlaying: boolean) => void;
  private onAnalyserTick?: (vuLevel: number) => void;
  private vuAnimFrame: number | null = null;

  private mtof(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  public init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    // Tape Warmth Filter (Warm lowpass roll-off at ~4.5kHz)
    const tapeFilter = this.ctx.createBiquadFilter();
    tapeFilter.type = 'lowpass';
    tapeFilter.frequency.setValueAtTime(4200, this.ctx.currentTime);
    tapeFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    // Subtle Bass Boost (Vintage magnetic tape proximity effect ~120Hz)
    const tapeBass = this.ctx.createBiquadFilter();
    tapeBass.type = 'peaking';
    tapeBass.frequency.setValueAtTime(120, this.ctx.currentTime);
    tapeBass.gain.setValueAtTime(3.5, this.ctx.currentTime);

    // Analyser for VU Meter & Reel movement responsiveness
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.85;

    // Connect audio chain
    this.masterGain.connect(tapeFilter);
    tapeFilter.connect(tapeBass);
    tapeBass.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Create subtle analog tape hiss & vinyl crackle
    this.setupTapeCrackle();
  }

  private setupTapeCrackle() {
    if (!this.ctx || !this.masterGain) return;
    // 2 seconds buffer of pinkish tape hiss and subtle pops
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      let pink = b0 + b1 + b2 + white * 0.5362;
      pink *= 0.04; // low level
      // Random vinyl pop/crackle spike
      if (Math.random() < 0.0003) {
        pink += (Math.random() > 0.5 ? 0.35 : -0.35);
      }
      output[i] = pink;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1800, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    whiteNoise.start(0);
    this.noiseNode = whiteNoise;
  }

  public setCallbacks(
    onTrackChange: (track: TrackInfo) => void,
    onStateChange: (isPlaying: boolean) => void,
    onAnalyserTick?: (vuLevel: number) => void
  ) {
    this.onTrackChangeCallback = onTrackChange;
    this.onStateChangeCallback = onStateChange;
    this.onAnalyserTick = onAnalyserTick;
  }

  public play() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isPlaying = true;
    this.onStateChangeCallback?.(true);
    this.startSequencer();
    this.startVuLoop();
  }

  public pause() {
    this.isPlaying = false;
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.vuAnimFrame) {
      cancelAnimationFrame(this.vuAnimFrame);
      this.vuAnimFrame = null;
    }
    this.onStateChangeCallback?.(false);
  }

  public toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % RETRO_TRACKS.length;
    this.step = 0;
    const track = RETRO_TRACKS[this.currentTrackIndex];
    this.onTrackChangeCallback?.(track);
    if (this.isPlaying) {
      this.startSequencer();
    }
  }

  public prevTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + RETRO_TRACKS.length) % RETRO_TRACKS.length;
    this.step = 0;
    const track = RETRO_TRACKS[this.currentTrackIndex];
    this.onTrackChangeCallback?.(track);
    if (this.isPlaying) {
      this.startSequencer();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentTrack(): TrackInfo {
    return RETRO_TRACKS[this.currentTrackIndex];
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private startSequencer() {
    if (this.timerId) {
      window.clearInterval(this.timerId);
    }
    const track = RETRO_TRACKS[this.currentTrackIndex];
    const sixteenthInterval = (60 / track.bpm / 2) * 1000; // eighth notes step

    this.timerId = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;
      this.triggerStep();
      this.step = (this.step + 1) % track.melodyPattern.length;
    }, sixteenthInterval);
  }

  private triggerStep() {
    if (!this.ctx || !this.masterGain) return;
    const track = RETRO_TRACKS[this.currentTrackIndex];
    const now = this.ctx.currentTime;
    const note = track.melodyPattern[this.step];

    // Play melody note
    if (note) {
      this.playSynthNote(this.mtof(note), track.instrumentType, now);
    }

    // Play chord drone / bass every 4 steps
    if (this.step % 4 === 0) {
      const bassIndex = Math.floor(this.step / 4) % track.bassPattern.length;
      const bassNote = track.bassPattern[bassIndex];
      this.playBassNote(this.mtof(bassNote), now);
    }

    // Play subtle analog percussion (lo-fi tabla / shaker tap)
    if (this.step % 2 === 0) {
      this.playTapePercussion(now, this.step % 4 === 0 ? 'dha' : 'tin');
    }
  }

  private playSynthNote(freq: number, type: TrackInfo['instrumentType'], when: number) {
    if (!this.ctx || !this.masterGain) return;

    // Dual oscillators with warm detune for rich vintage tape chorus
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    if (type === 'sitar_synth') {
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.detune.setValueAtTime(-5, when);
      osc2.detune.setValueAtTime(6, when);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.5, when);
      filter.frequency.exponentialRampToValueAtTime(freq * 0.8, when + 0.6);
      filter.Q.setValueAtTime(3.2, when);

      noteGain.gain.setValueAtTime(0.001, when);
      noteGain.gain.exponentialRampToValueAtTime(0.28, when + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.001, when + 0.7);
    } else if (type === 'nostalgic_flute') {
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.detune.setValueAtTime(-2, when);
      osc2.detune.setValueAtTime(2, when);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, when);
      filter.Q.setValueAtTime(1.0, when);

      noteGain.gain.setValueAtTime(0.001, when);
      noteGain.gain.linearRampToValueAtTime(0.3, when + 0.12);
      noteGain.gain.exponentialRampToValueAtTime(0.001, when + 0.8);
    } else if (type === 'vintage_rhodes') {
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.detune.setValueAtTime(0, when);
      osc2.detune.setValueAtTime(4, when);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, when);
      filter.frequency.exponentialRampToValueAtTime(600, when + 0.5);

      noteGain.gain.setValueAtTime(0.001, when);
      noteGain.gain.linearRampToValueAtTime(0.32, when + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, when + 0.65);
    } else {
      // golden strings / organ
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.detune.setValueAtTime(-8, when);
      osc2.detune.setValueAtTime(8, when);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, when);

      noteGain.gain.setValueAtTime(0.001, when);
      noteGain.gain.linearRampToValueAtTime(0.22, when + 0.15);
      noteGain.gain.exponentialRampToValueAtTime(0.001, when + 0.9);
    }

    osc1.frequency.setValueAtTime(freq, when);
    osc2.frequency.setValueAtTime(freq, when);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc1.start(when);
    osc2.start(when);
    osc1.stop(when + 1.0);
    osc2.stop(when + 1.0);
  }

  private playBassNote(freq: number, when: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, when);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, when);

    gain.gain.setValueAtTime(0.001, when);
    gain.gain.linearRampToValueAtTime(0.4, when + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(when);
    osc.stop(when + 1.3);
  }

  private playTapePercussion(when: number, stroke: 'dha' | 'tin') {
    if (!this.ctx || !this.masterGain) return;

    if (stroke === 'dha') {
      // Warm low membrane tap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, when);
      osc.frequency.exponentialRampToValueAtTime(60, when + 0.18);

      gain.gain.setValueAtTime(0.3, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(when);
      osc.stop(when + 0.22);
    } else {
      // Subtle vintage shaker / high-hat brush tap
      const bufferSize = this.ctx.sampleRate * 0.04;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(4500, when);
      filter.Q.setValueAtTime(2.0, when);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.04);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(when);
      noise.stop(when + 0.05);
    }
  }

  private startVuLoop() {
    const check = () => {
      if (!this.isPlaying) {
        this.onAnalyserTick?.(0);
        return;
      }
      if (this.analyser) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length; // 0 to 255
        const normalized = Math.min(1, (avg / 120));
        this.onAnalyserTick?.(normalized);
      }
      this.vuAnimFrame = requestAnimationFrame(check);
    };
    check();
  }

  // Tactile Mechanical Click Sound effect for physical buttons
  public playMechanicalClick() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.03);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.035);
  }
}

export const audioEngine = new VintageAudioEngine();
