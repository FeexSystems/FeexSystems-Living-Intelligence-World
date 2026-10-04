import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BackButtonProps {
  /** Explicit fallback target used when there is no in-app history to pop. */
  to?: string;
  label?: string;
  className?: string;
  /** Render only the glyph (still announced via aria-label). */
  iconOnly?: boolean;
}

/**
 * Smart "return" control.
 *
 * Pops the previous entry when a real in-app history exists; otherwise it falls
 * back to an explicit route so the control is never a dead end (e.g. a user
 * landing directly on a deep link).
 */
export function BackButton({ to = "/", label = "Back", className, iconOnly = false }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const canPopHistory = () => {
    // react-router records the history index on window.history.state.
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    return typeof idx === "number" && idx > 0;
  };

  const handleClick = () => {
    // Never bounce a guest back into the page that redirected them here.
    const isAuthSurface = location.pathname === "/login" || location.pathname === "/register";
    if (canPopHistory() && !isAuthSurface) {
      navigate(-1);
    } else {
      navigate(to);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-white/60 transition-colors hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white",
        className
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      {!iconOnly && <span>{label}</span>}
    </button>
  );
}

export default BackButton;
