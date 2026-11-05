// Ambient Audio Engine using Web Audio API

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private tracks: Map<
    string,
    {
      gainNode: GainNode;
      stopFn?: () => void;
      isPlaying: boolean;
      volume: number;
    }
  > = new Map();

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Create a loopable buffer of noise
  private createNoiseBuffer(type: 'white' | 'pink' | 'brown', durationSeconds = 5): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not initialized');
    const bufferSize = this.ctx.sampleRate * durationSeconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;

      if (type === 'white') {
        data[i] = white * 0.3;
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
        b6 = white * 0.115926;
      } else {
        // Brown noise
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 0.5;
      }
    }
    return buffer;
  }

  // 1. Rain Synthesizer
  private startRain(gainNode: GainNode): () => void {
    if (!this.ctx) return () => {};
    const noiseBuffer = this.createNoiseBuffer('pink', 6);
    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 250;

    source.connect(filter);
    filter.connect(highpass);
    highpass.connect(gainNode);
    source.start();

    return () => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    };
  }

  // 2. Coffee Shop Synthesizer (warm ambient chatter / hum)
  private startCoffeeShop(gainNode: GainNode): () => void {
    if (!this.ctx) return () => {};
    const noiseBuffer = this.createNoiseBuffer('brown', 5);
    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 450;
    bandpass.Q.value = 1.2;

    const tremolo = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.3; // gentle 0.3Hz swell
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.25;

    lfo.connect(lfoGain);
    lfoGain.connect(tremolo.gain);
    lfo.start();

    source.connect(bandpass);
    bandpass.connect(tremolo);
    tremolo.connect(gainNode);
    source.start();

    return () => {
      try {
        source.stop();
        lfo.stop();
        source.disconnect();
      } catch {}
    };
  }

  // 3. Fireplace Synthesizer (low rumble + crackles)
  private startFireplace(gainNode: GainNode): () => void {
    if (!this.ctx) return () => {};
    // Low rumble base
    const rumbleBuffer = this.createNoiseBuffer('brown', 4);
    const rumbleSource = this.ctx.createBufferSource();
    rumbleSource.buffer = rumbleBuffer;
    rumbleSource.loop = true;

    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 180;

    rumbleSource.connect(rumbleFilter);
    rumbleFilter.connect(gainNode);
    rumbleSource.start();

    // Crackle generator
    let crackleTimer: number | null = null;
    let isRunning = true;
    const playCrackle = () => {
      if (!this.ctx || !isRunning) return;
      const osc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400 + Math.random() * 800, now);

      popGain.gain.setValueAtTime(0.08 + Math.random() * 0.12, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(popGain);
      popGain.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.05);

      const nextDelay = 120 + Math.random() * 450;
      crackleTimer = window.setTimeout(playCrackle, nextDelay);
    };

    playCrackle();

    return () => {
      isRunning = false;
      try {
        rumbleSource.stop();
        rumbleSource.disconnect();
        if (crackleTimer) clearTimeout(crackleTimer);
      } catch {}
    };
  }

  // 4. Lofi Beats (generative chill chords with smooth vinyl warmth)
  private startLofi(gainNode: GainNode): () => void {
    if (!this.ctx) return () => {};

    // Soft vinyl crackle
    const vinylBuffer = this.createNoiseBuffer('white', 3);
    const vinylSource = this.ctx.createBufferSource();
    vinylSource.buffer = vinylBuffer;
    vinylSource.loop = true;

    const vinylFilter = this.ctx.createBiquadFilter();
    vinylFilter.type = 'bandpass';
    vinylFilter.frequency.value = 2500;
    vinylFilter.Q.value = 3.0;

    const vinylGain = this.ctx.createGain();
    vinylGain.gain.value = 0.04;

    vinylSource.connect(vinylFilter);
    vinylFilter.connect(vinylGain);
    vinylGain.connect(gainNode);
    vinylSource.start();

    // Generative chord progressions (Cmaj9, Am9, Dm9, G13)
    const chords = [
      [261.63, 329.63, 392.0, 493.88, 587.33], // Cmaj9
      [220.0, 261.63, 329.63, 392.0, 493.88],  // Am9
      [146.83, 220.0, 261.63, 349.23, 440.0],  // Dm9
      [196.0, 246.94, 329.63, 392.0, 440.0],   // G13
    ];

    let chordIndex = 0;
    let isRunning = true;
    let timerId: number | null = null;

    const playNextChord = () => {
      if (!this.ctx || !isRunning) return;
      const currentChord = chords[chordIndex % chords.length];
      chordIndex++;

      const now = this.ctx.currentTime;
      const duration = 4.2;

      currentChord.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);

        // Soft attack & long dreamy decay
        oscGain.gain.setValueAtTime(0.001, now);
        oscGain.gain.linearRampToValueAtTime(0.04, now + 0.4);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(gainNode);

        osc.start(now);
        osc.stop(now + duration);
      });

      timerId = window.setTimeout(playNextChord, 4000);
    };

    playNextChord();

    return () => {
      isRunning = false;
      if (timerId) clearTimeout(timerId);
      try {
        vinylSource.stop();
        vinylSource.disconnect();
      } catch {}
    };
  }

  public setVolume(id: string, vol: number) {
    this.initContext();
    let track = this.tracks.get(id);
    if (!track) {
      const gainNode = this.ctx!.createGain();
      gainNode.gain.value = vol;
      gainNode.connect(this.masterGain!);
      track = { gainNode, isPlaying: false, volume: vol };
      this.tracks.set(id, track);
    } else {
      track.volume = vol;
      track.gainNode.gain.setValueAtTime(vol, this.ctx!.currentTime);
    }
  }

  public toggleTrack(id: 'rain' | 'coffee' | 'fireplace' | 'lofi', shouldPlay?: boolean): boolean {
    this.initContext();
    let track = this.tracks.get(id);
    if (!track) {
      const gainNode = this.ctx!.createGain();
      gainNode.gain.value = 0.5;
      gainNode.connect(this.masterGain!);
      track = { gainNode, isPlaying: false, volume: 0.5 };
      this.tracks.set(id, track);
    }

    const nextState = shouldPlay !== undefined ? shouldPlay : !track.isPlaying;

    if (nextState && !track.isPlaying) {
      track.gainNode.gain.setValueAtTime(track.volume, this.ctx!.currentTime);
      if (id === 'rain') {
        track.stopFn = this.startRain(track.gainNode);
      } else if (id === 'coffee') {
        track.stopFn = this.startCoffeeShop(track.gainNode);
      } else if (id === 'fireplace') {
        track.stopFn = this.startFireplace(track.gainNode);
      } else if (id === 'lofi') {
        track.stopFn = this.startLofi(track.gainNode);
      }
      track.isPlaying = true;
    } else if (!nextState && track.isPlaying) {
      if (track.stopFn) {
        track.stopFn();
        track.stopFn = undefined;
      }
      track.isPlaying = false;
    }

    return track.isPlaying;
  }

  public stopAll() {
    this.tracks.forEach((track) => {
      if (track.isPlaying && track.stopFn) {
        track.stopFn();
        track.stopFn = undefined;
        track.isPlaying = false;
      }
    });
  }

  public getTrackState(id: string) {
    return this.tracks.get(id) || { isPlaying: false, volume: 0.5 };
  }
}

export const ambientAudio = new AmbientAudioEngine();
