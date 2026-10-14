import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Default to dark if no saved theme
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  if (!mounted) return null;

  return (
    <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
      {/* Light Mode */}
      <button
        onClick={() => handleThemeChange("light")}
        className={`p-2 rounded-md transition-all duration-200 ${theme === "light"
            ? "bg-white text-black shadow-xs font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        aria-label="Light mode"
        title="Light mode"
      >
        <Sun className="w-4 h-4" />
      </button>

      {/* Dark Mode */}
      <button
        onClick={() => handleThemeChange("dark")}
        className={`p-2 rounded-md transition-all duration-200 ${theme === "dark"
            ? "bg-white text-black shadow-xs font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        aria-label="Dark mode"
        title="Dark mode"
      >
        <Moon className="w-4 h-4" />
      </button>

      {/* System Mode */}
      <button
        onClick={() => handleThemeChange("system")}
        className={`p-2 rounded-md transition-all duration-200 ${theme === "system"
            ? "bg-white text-black shadow-xs font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        aria-label="System mode"
        title="System mode"
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
}
