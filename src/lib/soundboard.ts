// High-fidelity Web Audio API Soundboard Synthesizer
// Completely self-contained: No external audio assets needed, guaranteed zero lag and no 404s!

class SoundboardSynthesizer {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Tactile Mechanical Click (for buttons, dials, switches)
  public playClick(pitch: number = 800) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(pitch, ctx.currentTime);
    filter.Q.setValueAtTime(4, ctx.currentTime);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch * 1.5, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.045);
  }

  // Classic Airhorn Blast
  public playAirhorn() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const freqs = [466.16, 622.25]; // Bb4, Eb5 brass interval
    const now = ctx.currentTime;

    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq * 0.95, now);
      osc.frequency.linearRampToValueAtTime(freq, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.setValueAtTime(0.25, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  // Snappy Rimshot (Ba-dum-tss)
  public playRimshot() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Drum body
    const osc = ctx.createOscillator();
    const drumGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    drumGain.gain.setValueAtTime(0.5, now);
    drumGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(drumGain);
    drumGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // Snare rim crack (white noise burst)
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
  }

  // Popcorn Pops (Rapid bubbly popcorn effect)
  public playPopcorn() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const popCount = 6;

    for (let i = 0; i < popCount; i++) {
      const delay = i * 0.06 + Math.random() * 0.04;
      const popFreq = 400 + Math.random() * 800;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(popFreq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(popFreq * 0.3, now + delay + 0.04);

      gain.gain.setValueAtTime(0.25, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.05);
    }
  }

  // 808 Sub-Bass Drop
  public playBassDrop() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.8);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.95);
  }

  // Audience Applause / Cheering
  public playApplause() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 1.6;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Modulate noise to mimic hundreds of asynchronous claps
      const t = i / ctx.sampleRate;
      const mod = Math.sin(t * 18) * 0.3 + Math.sin(t * 31) * 0.2 + 0.5;
      data[i] = (Math.random() * 2 - 1) * mod;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.2);
    gain.gain.setValueAtTime(0.4, now + 1.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
  }

  // Cinematic Tungsten Bell / Chime
  public playChime() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const harmonics = [523.25, 783.99, 1046.50, 1567.98]; // C5, G5, C6, G6

    harmonics.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const amp = 0.25 / (idx + 1);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4 + idx * 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.8);
    });
  }

  // Dramatic Booo / Thumb Down
  public playBoo() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.7);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.85);
  }
}

export const soundboard = new SoundboardSynthesizer();

export const SOUND_EFFECTS = [
  { id: 'applause', name: 'Applause', emoji: '👏', desc: 'Crowd cheering' },
  { id: 'airhorn', name: 'Airhorn', emoji: '📯', desc: 'Hype horn blast' },
  { id: 'rimshot', name: 'Ba-Dum-Tss', emoji: '🥁', desc: 'Punchline rimshot' },
  { id: 'popcorn', name: 'Popcorn', emoji: '🍿', desc: 'Kernel pops' },
  { id: 'bassdrop', name: '808 Drop', emoji: '💣', desc: 'Heavy sub bass' },
  { id: 'chime', name: 'Cinema Bell', emoji: '🔔', desc: 'Tungsten chime' },
  { id: 'boo', name: 'Booo!', emoji: '👎', desc: 'Disappointed groan' },
];
