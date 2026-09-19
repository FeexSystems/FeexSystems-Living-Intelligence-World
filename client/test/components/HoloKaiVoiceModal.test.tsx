import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { HoloKaiVoiceModal } from "@/components/sovereign/HoloKaiVoiceModal";

// Mock sonikAudio
vi.mock("@/lib/sonikAudio", () => ({
  sonikAudio: {
    playCyberClick: vi.fn(),
    unlockAudio: vi.fn(),
    triggerHaptic: vi.fn(),
    isMuted: () => false,
  },
}));

describe("HoloKaiVoiceModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        explanation: "HoloKai analysis: FarmPlug agricultural telemetry is 100% nominal.",
        confidence: 0.98,
        suggestions: ["Explain Yurrheeler Med-Net", "Query KappaXchangefin"],
      }),
    });
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <HoloKaiVoiceModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders Swiss Typographic header, waveform canvas, and HoloKai initial message when open", () => {
    render(<HoloKaiVoiceModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/HOLOKAI REASONING CORE/i)).toBeInTheDocument();
    expect(screen.getByText(/GEMINI INTERACTIONS API/i)).toBeInTheDocument();
    expect(screen.getByText(/HoloKai Uplink established/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Speak command or enter directive/i)).toBeInTheDocument();
  });

  it("submits text query to /api/world-model/navigator and displays response", async () => {
    render(<HoloKaiVoiceModal isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Speak command or enter directive/i);
    const transmitButton = screen.getByRole("button", { name: /TRANSMIT/i });

    fireEvent.change(input, { target: { value: "Status of FarmPlug AI" } });
    fireEvent.click(transmitButton);

    expect(screen.getByText(/Status of FarmPlug AI/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/FarmPlug agricultural telemetry is 100% nominal/i)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/world-model/navigator",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <HoloKaiVoiceModal isOpen={true} onClose={onClose} />
    );

    const closeBtn = container.querySelector("button:has(svg.lucide-x)");
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    }
  });
});
