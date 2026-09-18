import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SonikAudioEngine } from "../../lib/sonikAudio";

describe("SonikAudioEngine (3WM SONIK LABS DSP)", () => {
  let engine: SonikAudioEngine;
  let mockOscillator: any;
  let mockGain: any;
  let mockFilter: any;
  let mockAudioContext: any;
  let vibrateMock: any;

  beforeEach(() => {
    mockOscillator = {
      type: "sine",
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockGain = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    mockFilter = {
      type: "bandpass",
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      Q: {
        setValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    mockAudioContext = {
      state: "running",
      currentTime: 10.5,
      destination: {},
      createOscillator: vi.fn(() => ({ ...mockOscillator })),
      createGain: vi.fn(() => ({ ...mockGain })),
      createBiquadFilter: vi.fn(() => ({ ...mockFilter })),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Attach constructible mock to window
    (window as any).AudioContext = vi.fn().mockImplementation(function () {
      return mockAudioContext;
    });

    vibrateMock = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    engine = new SonikAudioEngine();
  });

  afterEach(() => {
    engine.dispose();
    vi.clearAllMocks();
  });

  it("initializes with unmuted state by default and toggles cleanly", () => {
    expect(engine.isMuted()).toBe(false);
    const muted = engine.toggleMute();
    expect(muted).toBe(true);
    expect(engine.isMuted()).toBe(true);
    const unmuted = engine.toggleMute();
    expect(unmuted).toBe(false);
    expect(engine.isMuted()).toBe(false);
  });

  it("synthesizes cyber click impulses when unmuted", () => {
    engine.playCyberClick(1.0);
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
  });

  it("suppresses audio synthesis when muted", () => {
    engine.setMuted(true);
    engine.playCyberClick(1.0);
    // Only masterGain creation from initial context setup, no new nodes
    expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
  });

  it("synthesizes dual-oscillator probe engine drone on thrust activity", () => {
    engine.updateProbeEngine(0.8, 1.2);
    // Sub oscillator + harmonic oscillator created
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
  });

  it("synthesizes harmonic node resonant impact for domain index and spikes energy", () => {
    const initialEnergy = engine.getAudioEnergy();
    engine.playNodeImpact(0, 1.5);
    const postImpactEnergy = engine.getAudioEnergy();
    expect(postImpactEnergy).toBeGreaterThan(initialEnergy);
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
  });

  it("triggers haptic vibration via navigator.vibrate when enabled", () => {
    engine.triggerHaptic(25);
    expect(vibrateMock).toHaveBeenCalledWith(25);

    vibrateMock.mockClear();
    engine.triggerHaptic([10, 20, 10]);
    expect(vibrateMock).toHaveBeenCalledWith([10, 20, 10]);

    vibrateMock.mockClear();
    engine.setHapticsEnabled(false);
    engine.triggerHaptic(25);
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it("exposes initAudio() to retrieve or unlock the AudioContext", () => {
    const ctx = engine.initAudio();
    expect(ctx).toBe(mockAudioContext);
  });

  it("supports overloaded updateProbeEngine with single normalized velocity", () => {
    engine.updateProbeEngine(0.75);
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
  });

  it("supports playNodeImpact with frequency override or domain index", () => {
    // Frequency directly
    engine.playNodeImpact(528, 0);
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();

    // Domain index
    engine.playNodeImpact(2, 1.2);
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
  });
});
