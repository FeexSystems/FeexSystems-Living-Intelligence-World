import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App.tsx";
import "../global.css";

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

