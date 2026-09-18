import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { MarketingIntelligenceSection } from "@/components/marketing/MarketingIntelligenceSection";

function renderComponent() {
  return render(
    <BrowserRouter>
      <MarketingIntelligenceSection />
    </BrowserRouter>
  );
}

describe("MarketingIntelligenceSection Component", () => {
  it("renders section title and all 4 interactive subsystem tabs", () => {
    renderComponent();

    expect(screen.getByText("// 08 ADVANCED MARKETING INTELLIGENCE")).toBeInTheDocument();
    expect(screen.getByText("Evidence-First Marketing. Grounded in Code.")).toBeInTheDocument();

    expect(screen.getByText("1. Evidence Claim Graph")).toBeInTheDocument();
    expect(screen.getByText("2. Marketing Digital Twin")).toBeInTheDocument();
    expect(screen.getByText("3. Gap & Decay Engines")).toBeInTheDocument();
    expect(screen.getByText("4. Grounded Navigator AI")).toBeInTheDocument();
  });

  it("allows selecting different claims and viewing cryptographic provenance", () => {
    renderComponent();

    // Default claim is Sonik Audio DSP
    expect(screen.getAllByText("Sonik Audio DSP").length).toBeGreaterThan(0);
    expect(screen.getAllByText("8f21a4c9").length).toBeGreaterThan(0);

    // Click second claim (World Model Core)
    const secondClaim = screen.getByText(
      /Zero-trust HMAC-SHA256 multi-tenant GitHub webhook ingestion/i
    );
    fireEvent.click(secondClaim);

    expect(screen.getAllByText("a39d82ef").length).toBeGreaterThan(0);
    expect(screen.getByText(/server\/routes\/world-model.ts/i)).toBeInTheDocument();
  });

  it("switches to Marketing Digital Twin tab and displays QIE telemetry metrics", () => {
    renderComponent();

    const twinTab = screen.getByText("2. Marketing Digital Twin");
    fireEvent.click(twinTab);

    expect(screen.getByText("Overall QIE Score")).toBeInTheDocument();
    expect(screen.getByText("94.8")).toBeInTheDocument();
    expect(screen.getByText("Evidence Click-Through")).toBeInTheDocument();
    expect(screen.getByText("82.1%")).toBeInTheDocument();
    expect(screen.getByText("DIGITAL TWIN NODE INSPECTOR")).toBeInTheDocument();
  });

  it("switches to Gap & Decay Engines tab and displays autonomous engine cards", () => {
    renderComponent();

    const enginesTab = screen.getByText("3. Gap & Decay Engines");
    fireEvent.click(enginesTab);

    expect(screen.getByText("Content Gap Engine")).toBeInTheDocument();
    expect(screen.getByText("Content Decay Engine")).toBeInTheDocument();
    expect(screen.getByText("GitHub → Marketing Ingestion")).toBeInTheDocument();
    expect(screen.getByText("GAP SCORE: 0.88")).toBeInTheDocument();
    expect(screen.getByText("DECAY INDEX: 0.72")).toBeInTheDocument();
  });

  it("switches to Grounded Navigator AI tab and allows querying strategic inquiries", () => {
    renderComponent();

    const navTab = screen.getByText("4. Grounded Navigator AI");
    fireEvent.click(navTab);

    expect(screen.getByText("Marketing Navigator Simulator")).toBeInTheDocument();
    expect(
      screen.getAllByText("What changed in GitHub this week that is marketing-worthy?").length
    ).toBeGreaterThan(0);

    // Click second query button
    const secondQuery = screen.getAllByText(
      "Which ecosystem world has the strongest evidence but lowest content coverage?"
    )[0];
    fireEvent.click(secondQuery);

    expect(
      screen.getByText(/Content Gap Engine evaluated 6 products against active content assets/i)
    ).toBeInTheDocument();
  });
});
