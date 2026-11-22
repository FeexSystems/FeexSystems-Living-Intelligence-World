import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechNavigation } from "../useSpeechNavigation";

class FakeSpeechRecognition {
  static instance: FakeSpeechRecognition;
  continuous = false;
  interimResults = false;
  lang = "";
  maxAlternatives = 1;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() { FakeSpeechRecognition.instance = this; }
}

describe("useSpeechNavigation browser lifecycle", () => {
  beforeEach(() => {
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: FakeSpeechRecognition,
    });
  });

  it("does not claim LISTENING until the browser emits onstart", async () => {
    const { result } = renderHook(() => useSpeechNavigation());
    await waitFor(() => expect(result.current.supported).toBe(true));

    act(() => result.current.start());
    expect(result.current.status).toBe("idle");

    act(() => FakeSpeechRecognition.instance.onstart?.());
    expect(result.current.status).toBe("listening");
    expect(result.current.permissionState).toBe("granted");

    act(() => FakeSpeechRecognition.instance.onend?.());
    expect(result.current.status).toBe("idle");
  });

  it("maps browser permission denial to a denied state", async () => {
    const { result } = renderHook(() => useSpeechNavigation());
    await waitFor(() => expect(result.current.supported).toBe(true));

    act(() => FakeSpeechRecognition.instance.onerror?.({ error: "not-allowed" }));
    expect(result.current.status).toBe("denied");
    expect(result.current.permissionState).toBe("denied");
    expect(result.current.permissionDenied).toBe(true);
  });

  it("submits only the final transcript after the real end callback", async () => {
    const onFinalTranscript = vi.fn();
    const { result } = renderHook(() => useSpeechNavigation({ onFinalTranscript }));
    await waitFor(() => expect(result.current.supported).toBe(true));

    act(() => FakeSpeechRecognition.instance.onstart?.());
    act(() => FakeSpeechRecognition.instance.onresult?.({
      resultIndex: 0,
      results: Object.assign([[{ transcript: "inspect world" }]], {
        0: Object.assign([{ transcript: "inspect world" }], { isFinal: true }),
        length: 1,
      }),
    }));
    expect(onFinalTranscript).not.toHaveBeenCalled();

    act(() => FakeSpeechRecognition.instance.onend?.());
    expect(onFinalTranscript).toHaveBeenCalledWith("inspect world");
  });
});
