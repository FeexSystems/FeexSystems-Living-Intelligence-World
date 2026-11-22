import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import React from "react";
import { OmniCommandBar } from "@/components/omni/OmniCommandBar";

// OmniCommandBar shares useSpeechNavigation with HoloKaiVoiceModal and
// disables its microphone on status === "denied" (it does not consume
// permissionDenied). This suite is the consumer-level regression cover
// for the Stage 5 permission-revocation fix.
class FakeSpeechRecognition {
  static instance!: FakeSpeechRecognition;
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
  constructor() {
    FakeSpeechRecognition.instance = this;
  }
}

describe("OmniCommandBar speech permission regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: FakeSpeechRecognition,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: FakeSpeechRecognition,
    });
  });

  it("disables the microphone after permission denial survives abort/end", async () => {
    render(<OmniCommandBar onSubmit={vi.fn()} />);

    const mic = screen.getByRole("button", { name: /voice input/i });
    await waitFor(() => expect(mic).toBeEnabled());

    // Browser sequence: permission error, then aborted, then end.
    act(() => FakeSpeechRecognition.instance.onerror?.({ error: "not-allowed" }));
    act(() => FakeSpeechRecognition.instance.onerror?.({ error: "aborted" }));
    act(() => FakeSpeechRecognition.instance.onend?.());

    expect(screen.getByRole("button", { name: /voice input/i })).toBeDisabled();
  });
});
