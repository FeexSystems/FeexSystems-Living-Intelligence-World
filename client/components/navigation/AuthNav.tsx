import { Link } from "react-router-dom";
import { ArrowLeft, Compass, Globe, Layers } from "lucide-react";

const SURFACES = [
  { href: "/projects", label: "Projects", icon: Layers },
  { href: "/navigator", label: "Navigator", icon: Compass },
  { href: "/world", label: "World", icon: Globe },
];

/**
 * Shared top navigation for the guest-only auth surfaces (login, register,
 * password reset, email verification).
 *
 * Gives every auth screen an "enter" path (brand + public surfaces) and a
 * "return" path back to the public landing experience, so guests are never
 * stranded on an auth form.
 */
export function AuthNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 font-mono sm:px-6">
        <Link to="/" className="group inline-flex items-center gap-2.5" aria-label="FEEXSYSTEMS home">
          <img src="/media/brand/Feexsystems_horizontal_banner_logo_transparent.png" alt="FeexSystems" className="h-7 w-auto object-contain transition-transform group-hover:scale-105" />
        </Link>

        <nav aria-label="Public surfaces" className="flex items-center gap-1">
          {SURFACES.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-white/50 transition-colors hover:bg-white/5 hover:text-white sm:inline-flex"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
          <Link
            to="/"
            className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Home</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default AuthNav;
