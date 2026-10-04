import { Link } from "react-router-dom";
import { ArrowLeft, Compass, Layers, ShieldCheck, Terminal } from "lucide-react";

const SURFACES = [
  { href: "/projects", label: "Projects", icon: Layers },
  { href: "/navigator", label: "Navigator", icon: Compass },
  { href: "/omni", label: "Omni", icon: Terminal },
  { href: "/evidence", label: "Evidence", icon: ShieldCheck },
];

/**
 * Exit / re-entry navigation for the full-screen `/world` Sovereign runtime.
 *
 * The spatial galaxy has no page chrome of its own, so this floating bar gives
 * users a guaranteed way back to the World Model overview plus lateral links to
 * the sibling public surfaces.
 */
export function WorldReturnBar() {
  return (
    <div className="pointer-events-auto fixed bottom-6 left-4 z-40 sm:left-6">
      <div className="flex flex-col gap-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/70 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-white/70 backdrop-blur-xl transition-colors hover:border-white/40 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Return to Overview</span>
        </Link>

        <nav
          aria-label="World Model surfaces"
          className="hidden items-center gap-1 rounded-lg border border-white/10 bg-black/60 p-1 backdrop-blur-xl sm:flex"
        >
          {SURFACES.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default WorldReturnBar;
