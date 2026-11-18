import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { HoloKaiRoboticCore } from "@/../src/components/holokai/HoloKaiRoboticCore";

// `vi.mock` is hoisted above the imports, so the Three.js stub must be
// registered at module scope — a `vi.doMock` inside beforeEach would run after
// the component (and its static `three` import) has already been resolved.
// The factory inlines a minimal inert surface; scheduling is what is tested,
// not pixels.
vi.mock("three", () => {
  const noop = () => undefined;
  const vectorLike = () => ({ x: 0, y: 0, z: 0, copy: noop, lerpColors: noop, set: noop });
  // These must be regular functions, not arrow functions — the component calls
  // them with `new`, and an arrow function is not constructible.
  const material = function () {
    return {
      color: vectorLike(),
      emissive: vectorLike(),
      emissiveIntensity: 0,
      dispose: vi.fn(),
    };
  };
  const geometry = function () {
    return { dispose: vi.fn() };
  };
  const object3d = () => ({
    position: vectorLike(),
    rotation: vectorLike(),
    scale: vectorLike(),
    add: noop,
    traverse: noop,
  });

  return {
    Scene: vi.fn(function () {
      return { ...object3d(), add: vi.fn(), remove: vi.fn(), traverse: vi.fn() };
    }),
    PerspectiveCamera: vi.fn(function () {
      return { ...object3d(), aspect: 1, updateProjectionMatrix: vi.fn() };
    }),
    WebGLRenderer: vi.fn(function () {
      return {
        setPixelRatio: vi.fn(),
        setSize: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn(),
        domElement: document.createElement("canvas"),
      };
    }),
    Group: vi.fn(function () {
      return { ...object3d(), add: vi.fn() };
    }),
    Mesh: vi.fn(function () {
      return { ...object3d(), add: vi.fn() };
    }),
    LineSegments: vi.fn(function () {
      return { ...object3d(), add: vi.fn() };
    }),
    AmbientLight: vi.fn(function () {
      return { ...object3d(), intensity: 1 };
    }),
    PointLight: vi.fn(function () {
      return { ...object3d(), intensity: 1, distance: 0 };
    }),
    SphereGeometry: vi.fn(geometry),
    RingGeometry: vi.fn(geometry),
    CircleGeometry: vi.fn(geometry),
    TorusGeometry: vi.fn(geometry),
    EdgesGeometry: vi.fn(geometry),
    BoxGeometry: vi.fn(geometry),
    CylinderGeometry: vi.fn(geometry),
    MeshStandardMaterial: vi.fn(material),
    MeshBasicMaterial: vi.fn(material),
    LineBasicMaterial: vi.fn(material),
    Color: vi.fn(function () {
      return { ...vectorLike(), r: 0, g: 0, b: 0 };
    }),
    Clock: vi.fn(function () {
      let t = 0;
      return { getElapsedTime: () => (t += 0.016), getDelta: () => 0.016 };
    }),
    MathUtils: { lerp: (a: number, b: number) => (a + b) / 2 },
    DoubleSide: 2,
  };
});

/**
 * HoloKaiRoboticCore — render gating (principle #9).
 *
 * The core ran an unconditional requestAnimationFrame loop, which burned GPU on
 * the landing (mid-scroll) and in the uplink drawer. These tests pin the three
 * gates that were added: off-screen pause, background-tab pause, and the
 * reduced-motion static frame.
 *
 * Three.js itself is mocked — this suite asserts *loop scheduling*, not pixels.
 */

/** Recorded IntersectionObserver instances so each test can drive them. */
const observers: Array<{ callback: IntersectionObserverCallback; targets: Element[]; disconnected: boolean }> = [];

/** RAF scheduler: we advance it manually so call counts are deterministic. */
let rafCallbacks: Map<number, FrameRequestCallback>;
let rafId: number;
let rafSpy: ReturnType<typeof vi.fn>;
let cancelSpy: ReturnType<typeof vi.fn>;

function flushFrames(count = 1) {
  for (let i = 0; i < count; i++) {
    const pending = [...rafCallbacks.entries()];
    rafCallbacks.clear();
    for (const [, callback] of pending) callback(performance.now());
  }
}

function triggerIntersection(isIntersecting: boolean) {
  const observer = observers[observers.length - 1];
  if (!observer) throw new Error("no IntersectionObserver was created");
  observer.callback(
    [{ isIntersecting, target: observer.targets[0] } as unknown as IntersectionObserverEntry],
    observer as unknown as IntersectionObserver,
  );
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  observers.length = 0;
  rafCallbacks = new Map();
  rafId = 0;

  rafSpy = vi.fn((callback: FrameRequestCallback) => {
    const id = ++rafId;
    rafCallbacks.set(id, callback);
    return id;
  });
  cancelSpy = vi.fn((id: number) => {
    rafCallbacks.delete(id);
  });

  vi.stubGlobal("requestAnimationFrame", rafSpy);
  vi.stubGlobal("cancelAnimationFrame", cancelSpy);

  // Replace the setup mock so this suite can drive the observer itself.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      callback: IntersectionObserverCallback;
      targets: Element[] = [];
      disconnected = false;
      root = null;
      rootMargin = "0px";
      thresholds: number[] = [];
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        observers.push(this as unknown as (typeof observers)[number]);
      }
      observe(target: Element) {
        this.targets.push(target);
      }
      unobserve() {}
      disconnect() {
        this.disconnected = true;
      }
      takeRecords() {
        return [];
      }
    },
  );

  Object.defineProperty(document, "hidden", { configurable: true, get: () => false });

  // jsdom reports every element as 0x0. The component seeds its initial
  // visibility from the container's measured rect (it cannot rely on an
  // IntersectionObserver callback, which may never fire), so give the core a
  // plausible on-screen box or the loop correctly refuses to start.
  const rect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    width: 320,
    height: 224,
    right: 320,
    bottom: 224,
    toJSON: () => ({}),
  } as DOMRect;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;

});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("HoloKaiRoboticCore render gating", () => {
  it("animates while on-screen and in a foreground tab", async () => {
    render(<HoloKaiRoboticCore />);
    await vi.waitFor(() => expect(observers.length).toBeGreaterThan(0));

    // The loop is started synchronously from the container's measured rect, so
    // frames flow without waiting for an IntersectionObserver callback (which,
    // in a StrictMode remount, may never fire at all).
    flushFrames(1);
    // The loop reschedules itself each frame.
    expect(rafSpy.mock.calls.length).toBeGreaterThan(1);
  });

  it("pauses when the core scrolls off-screen, and resumes when it returns", async () => {
    render(<HoloKaiRoboticCore />);
    await vi.waitFor(() => expect(observers.length).toBeGreaterThan(0));

    flushFrames(1);
    triggerIntersection(false);
    const callsWhilePaused = rafSpy.mock.calls.length;

    // Nothing is pending any more — flushing schedules no further work.
    flushFrames(3);
    expect(rafSpy.mock.calls.length).toBe(callsWhilePaused);

    triggerIntersection(true);
    flushFrames(1);
    expect(rafSpy.mock.calls.length).toBeGreaterThan(callsWhilePaused);
  });

  it("pauses in a background tab and resumes on return", async () => {
    render(<HoloKaiRoboticCore />);
    await vi.waitFor(() => expect(observers.length).toBeGreaterThan(0));

    flushFrames(1);
    setHidden(true);
    const callsWhileHidden = rafSpy.mock.calls.length;
    flushFrames(3);
    expect(rafSpy.mock.calls.length).toBe(callsWhileHidden);

    setHidden(false);
    flushFrames(1);
    expect(rafSpy.mock.calls.length).toBeGreaterThan(callsWhileHidden);
  });

  it("renders a static frame and never animates under reduced motion", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    render(<HoloKaiRoboticCore />);
    await vi.waitFor(() => expect(observers.length).toBeGreaterThan(0));

    // No animation frames are ever requested, even when visible.
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it("cancels the loop and disconnects the observer on unmount", async () => {
    const view = render(<HoloKaiRoboticCore />);
    await vi.waitFor(() => expect(observers.length).toBeGreaterThan(0));

    flushFrames(1);
    const observer = observers[observers.length - 1];
    view.unmount();

    expect(cancelSpy).toHaveBeenCalled();
    expect(observer.disconnected).toBe(true);
  });
});
