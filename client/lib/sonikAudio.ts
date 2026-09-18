/**
 * 3WM SONIK LABS — Procedural WebAudio DSP & Haptics Engine
 * 
 * Provides zero-dependency, real-time procedural audio synthesis:
 * 1. Cyber Clicks: Micro-impulse transient clicks for tactile controls
 * 2. Probe Engine Drone: FM/sub-oscillator drone modulated by velocity & thrust
 * 3. Node Resonant Impact: Harmonic bell/chime ping per domain topology
 * 4. Audio Reactive Energy Meter: Drives 3D laser grid & bloom frequencies
 * 5. Tactile Haptics: Browser vibration feedback (navigator.vibrate)
 */

export class SonikAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOscSub: OscillatorNode | null = null;
  private engineOscHarmonic: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning = false;

  private muted = false;
  private audioEnergy = 0;
  private lastEnergySampleTime = 0;
  private hapticsEnabled = true;

  constructor() {
    this.setupGestureUnlock();
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
  }

  private getContext(): AudioContext | null {
    if (!this.isBrowser()) return null;

    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        }
      } catch (e) {
        console.warn('⚠️ WebAudio initialization deferred or unsupported:', e);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Automatically unlocks AudioContext on first user interaction to satisfy browser autoplay policies
   */
  private setupGestureUnlock() {
    if (!this.isBrowser()) return;

    const unlock = () => {
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('pointerdown', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
  }

  public unlockAudio() {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  /**
   * Initializes or unlocks the AudioContext
   */
  public initAudio(): AudioContext | null {
    return this.getContext();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    const ctx = this.getContext();
    if (ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, ctx.currentTime);
    }
    return this.muted;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    const ctx = this.getContext();
    if (ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, ctx.currentTime);
    }
  }

  /**
   * Cyber Click: High-frequency transient click with exponential decay envelope.
   * Ideal for joystick engagement, buttons, and mode switches.
   */
  public playCyberClick(pitchMultiplier: number = 1.0) {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400 * pitchMultiplier, now);
      filter.Q.setValueAtTime(3.5, now);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800 * pitchMultiplier, now);
      osc.frequency.exponentialRampToValueAtTime(120 * pitchMultiplier, now + 0.025);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.04);

      this.pulseEnergy(0.15);
    } catch {
      // Audio node failure fallback
    }
  }

  /**
   * Probe Engine Drone: Continuous dual-oscillator sub-engine
   * Modulated in real-time by drone speed and thrust activation.
   * Supports both (thrust, velocityMagnitude) and (velocityNorm) signatures.
   */
  public updateProbeEngine(thrustOrVelocity: number, velocityMagnitude?: number) {
    if (this.muted) {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      return;
    }

    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    if (!this.isEngineRunning) {
      try {
        const now = ctx.currentTime;
        this.engineOscSub = ctx.createOscillator();
        this.engineOscHarmonic = ctx.createOscillator();
        this.engineFilter = ctx.createBiquadFilter();
        this.engineGain = ctx.createGain();

        this.engineOscSub.type = 'sine';
        this.engineOscSub.frequency.setValueAtTime(48, now);

        this.engineOscHarmonic.type = 'triangle';
        this.engineOscHarmonic.frequency.setValueAtTime(96, now);

        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.setValueAtTime(120, now);
        this.engineFilter.Q.setValueAtTime(2.0, now);

        this.engineGain.gain.setValueAtTime(0.001, now);

        this.engineOscSub.connect(this.engineFilter);
        this.engineOscHarmonic.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);

        this.engineOscSub.start(now);
        this.engineOscHarmonic.start(now);
        this.isEngineRunning = true;
      } catch {
        return;
      }
    }

    if (!this.engineFilter || !this.engineGain || !this.engineOscSub || !this.engineOscHarmonic) return;

    const now = ctx.currentTime;
    let thrust: number;
    let velocity: number;

    if (velocityMagnitude === undefined) {
      // Overload: updateProbeEngine(velocityNorm)
      const norm = Math.max(0, Math.min(1.0, thrustOrVelocity));
      thrust = norm;
      velocity = norm * 2.5;
    } else {
      thrust = thrustOrVelocity;
      velocity = velocityMagnitude;
    }

    const clampedVelocity = Math.min(Math.max(velocity, 0), 2.5);
    const activity = Math.max(thrust, clampedVelocity * 0.4);

    const baseFreq = 48 + activity * 32;
    const cutoff = 120 + activity * 420;
    const targetGain = 0.02 + activity * 0.09;

    this.engineOscSub.frequency.linearRampToValueAtTime(baseFreq, now + 0.05);
    this.engineOscHarmonic.frequency.linearRampToValueAtTime(baseFreq * 2.01, now + 0.05);
    this.engineFilter.frequency.linearRampToValueAtTime(cutoff, now + 0.05);
    this.engineGain.gain.linearRampToValueAtTime(targetGain, now + 0.05);

    this.pulseEnergy(activity * 0.25);
  }

  /**
   * Node Resonant Impact: Rich harmonic chime ping when colliding with database server nodes.
   * Supports (domainIndex, velocity), (frequency, domainIndex), and frequency overrides.
   */
  public playNodeImpact(domainIndexOrFreq: number = 0, velocityOrDomain: number = 1.0, frequencyOverride?: number) {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      // Domain-tuned harmonic base frequencies:
      // 0: FEEX_CORE (528Hz Solfeggio)
      // 1: LIVING_MODELS (660Hz E5)
      // 2: EVIDENCE_FABRIC (792Hz G5)
      // 3: AUTONOMOUS_SWARM (924Hz Bb5)
      // 4: SPATIAL_ORCHESTRATION (1056Hz C6)
      const domainFreqs = [528, 660, 792, 924, 1056];

      let baseFreq: number;
      let velocity: number;

      if (frequencyOverride !== undefined) {
        baseFreq = frequencyOverride;
        velocity = velocityOrDomain;
      } else if (domainIndexOrFreq > 100) {
        // Called as playNodeImpact(frequency, domainIndex)
        baseFreq = domainIndexOrFreq;
        velocity = typeof velocityOrDomain === 'number' && velocityOrDomain <= 10 ? velocityOrDomain : 1.0;
      } else {
        // Standard signature: playNodeImpact(domainIndex, velocity)
        const domainIndex = Math.abs(Math.round(domainIndexOrFreq)) % domainFreqs.length;
        baseFreq = domainFreqs[domainIndex];
        velocity = velocityOrDomain;
      }

      // Primary harmonic bell
      const osc = ctx.createOscillator();
      const oscOctave = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq * 1.5, now);
      filter.Q.setValueAtTime(4.0, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);

      oscOctave.type = 'triangle';
      oscOctave.frequency.setValueAtTime(baseFreq * 2.002, now);

      const hitVolume = Math.min(0.35, 0.15 + velocity * 0.1);
      gain.gain.setValueAtTime(hitVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      oscOctave.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      oscOctave.start(now);
      osc.stop(now + 0.5);
      oscOctave.stop(now + 0.5);

      // Instantaneous energy jump to drive laser grid glow and frequency modulation
      this.pulseEnergy(0.85);
    } catch {
      // Audio node failure fallback
    }
  }

  private pulseEnergy(amount: number) {
    this.audioEnergy = Math.min(1.0, this.audioEnergy + amount);
    this.lastEnergySampleTime = Date.now();
  }

  /**
   * Retrieves the current normalized audio energy level (0.0 to 1.0)
   * Decays smoothly each frame to modulate the 3D laser grid matrix frequency and bloom.
   */
  public getAudioEnergy(): number {
    const now = Date.now();
    if (this.lastEnergySampleTime === 0) {
      this.lastEnergySampleTime = now;
      return 0;
    }

    const deltaMs = Math.min(now - this.lastEnergySampleTime, 100);
    this.lastEnergySampleTime = now;

    // Smooth exponential decay (~0.92 per 16ms frame)
    const decayFactor = Math.pow(0.92, deltaMs / 16.6);
    this.audioEnergy *= decayFactor;
    if (this.audioEnergy < 0.001) this.audioEnergy = 0;

    return this.audioEnergy;
  }

  /**
   * Tactile Haptics: triggers browser vibration feedback when available
   * Supports single duration ms or pattern sequences (e.g., [20, 30, 20]).
   */
  public triggerHaptic(pattern: number | number[] = 15) {
    if (!this.hapticsEnabled || !this.isBrowser()) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Haptics not allowed or denied by permission policy
    }
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
  }

  public isHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  public dispose() {
    if (this.engineOscSub) {
      try { this.engineOscSub.stop(); } catch {}
    }
    if (this.engineOscHarmonic) {
      try { this.engineOscHarmonic.stop(); } catch {}
    }
    if (this.ctx) {
      try { this.ctx.close(); } catch {}
    }
    this.isEngineRunning = false;
  }
}

export const sonikAudio = new SonikAudioEngine();
