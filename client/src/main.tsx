import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App.tsx";
import "../styles/sovereign-hud-glass.css";
import "../styles/global-body-p0.css";
import "../styles/global-body-p1.css";
import "../styles/global-body-p2.css";

// Dev-mode accessibility audit (Task 17: Phase 2, Sprint 5)
if (import.meta.env.DEV) {
  import('@axe-core/react').then(({ default: axe }) => {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      axe(React, ReactDOM, 1000);
    }, 1000);
  }).catch((error) => {
    console.warn('[a11y] Could not load axe-core/react:', error);
  });
}

// Real User Monitoring (Task 34: Phase 3, Sprint 9)
import { initPerformanceMonitoring } from "@/lib/performance-monitor";
initPerformanceMonitoring();

// Screen-reader announcement regions (Task 28: Phase 2, Sprint 7).
//
// Mounted once at startup so both the polite and assertive containers exist in
// the DOM before any announcement: screen readers only report a mutation inside
// a live region that was already present, so creating them lazily on first use
// would swallow the very first message.
import { initAnnouncementRegions } from "@/lib/announcements";
initAnnouncementRegions();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register the service worker only for production builds. In dev the SW would
// cache-first Vite module transforms and mask HMR updates.
if (import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      // Offline support is progressive enhancement — never block the app.
      console.warn("[sw] registration failed:", error);
    });
  });
}

