import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "light" | "dark" | "high-contrast";

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null);

export const useTheme = (): { theme: Theme; setTheme: (t: Theme) => void } => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // fallback when used outside provider â€“ default to light
    return { theme: "light", setTheme: () => {} };
  }
  return ctx;
};

/** Puts the theme context at the root of the app. On mount it reads the URL query parameter `theme` (if present) and persists the choice in localStorage so the page reload keeps the selection. */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // 1) try localStorage
    const stored = localStorage.getItem("feex-theme") as Theme | null;
    if (stored) return stored;

    // 2) try URL query
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get("theme") as Theme | null;
    if (q) {
      localStorage.setItem("feex-theme", q);
      return q;
    }

    // 3) default
    return "light";
  });

  // sync the data-attribute on <html>
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = theme;
  }, [theme]);

  // persist change to localStorage
  useEffect(() => {
    localStorage.setItem("feex-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/** Simple UI button (very minimal) that cycles through light -> dark -> high-contrast. Can be placed anywhere; the `setTheme` function is taken from context. */
export const ThemeToggleButton = () => {
  const { theme, setTheme } = useTheme();
  const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "high-contrast" : "light";

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      className="rounded-md p-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <svg className="h-4 w-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.5 14.5A8.5 8.5 0 0 1 9.5 2.5a8.5 8.5 0 1 0 12 12Z" />
      </svg>
    </button>
  );
};

