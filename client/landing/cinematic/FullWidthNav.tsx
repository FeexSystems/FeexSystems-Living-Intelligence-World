import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Globe, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  Terminal, 
  Cpu, 
  Menu, 
  X, 
  ChevronDown,
  ArrowUpRight,
  Lock,
  Activity,
  CreditCard,
  Users,
  LogOut,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

export interface NavItem {
  label: string;
  href: string;
  badge?: string;
  dropdown?: {
    title: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    requiresAuth?: boolean;
  }[];
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { 
    label: "Spatial Galaxy", 
    href: "/world", 
    badge: "3D",
    dropdown: [
      { title: "Spatial Knowledge Galaxy", description: "3D interactive topology & neural conduit graph", href: "/world", icon: Globe },
      { title: "Evidence Fabric", description: "Cryptographic commit SHAs & artifact ledger", href: "/evidence", icon: ShieldCheck },
      { title: "Projects Explorer", description: "Synchronized GitHub repositories & stacks", href: "/projects", icon: Layers },
    ]
  },
  { 
    label: "Omni Command", 
    href: "/omni", 
    badge: "AGENT",
    dropdown: [
      { title: "Omni Stage", description: "Autonomous multi-agent execution & live trace", href: "/omni", icon: Terminal },
      { title: "AI Navigator", description: "Evidence-grounded engineering search & reasoning", href: "/navigator", icon: Cpu },
    ]
  },
  { 
    label: "AI Services", 
    href: "/dashboard/ai-services", 
    badge: "NEURAL",
    dropdown: [
      { title: "AI Model Orchestration", description: "Multi-provider neural routing & FanDNA profiling", href: "/dashboard/ai-services", icon: Cpu, requiresAuth: true },
      { title: "Grounded Navigator", description: "Topological code retrieval with live provenance", href: "/navigator", icon: Sparkles },
    ]
  },
];

export interface FullWidthNavProps {
  items?: NavItem[];
  className?: string;
  showStatusIndicator?: boolean;
}

export function FullWidthNav({
  items = DEFAULT_NAV_ITEMS,
  className,
  showStatusIndicator = true,
}: FullWidthNavProps) {
  const location = useLocation();
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);
  const [hoveredDropdown, setHoveredDropdown] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const { user, logout, isLoggedIn } = useAuthStore();
  const isAuthenticated = isLoggedIn ? isLoggedIn() : !!user;

  // Update sliding pill position
  const updatePill = (index: number | null) => {
    if (index === null || !itemRefs.current[index]) {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    const target = itemRefs.current[index];
    if (target && navContainerRef.current) {
      const containerRect = navContainerRef.current.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      setPillStyle({
        left: targetRect.left - containerRect.left,
        width: targetRect.width,
        opacity: 1,
      });
    }
  };

  useEffect(() => {
    const currentIndex = items.findIndex((it) => it.href === location.pathname);
    if (currentIndex !== -1) {
      updatePill(currentIndex);
    } else {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [location.pathname, items]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-black/90 backdrop-blur-xl border-b border-white/10 transition-all duration-300",
        className
      )}
    >
      <div className="relative flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 pl-2 group">
          <div className="relative w-8 h-8 rounded-none bg-white p-[1px] shadow-sm transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-black rounded-none flex items-center justify-center">
              <span className="font-mono font-black text-sm tracking-tighter bg-clip-text text-white">
                FX
              </span>
            </div>
          </div>
          <span className="font-mono font-bold tracking-wider text-sm text-white transition-colors">
            FEEX<span className="text-gray-400 group-hover:text-white transition-colors">SYSTEMS</span>
          </span>
        </Link>

        {/* Desktop Nav Items with Sliding Pill */}
        <nav
          ref={navContainerRef}
          className="relative hidden md:flex items-center gap-1"
          onMouseLeave={() => {
            setActiveHoverIndex(null);
            setHoveredDropdown(null);
            const activeIdx = items.findIndex((it) => it.href === location.pathname);
            updatePill(activeIdx !== -1 ? activeIdx : null);
          }}
        >
          {/* Active / Hover Background Pill */}
          <div
            className="absolute top-1 bottom-1 rounded-none bg-white/10 border border-white/20 pointer-events-none transition-all duration-200 ease-out"
            style={{
              transform: `translateX(${pillStyle.left}px)`,
              width: `${pillStyle.width}px`,
              opacity: pillStyle.opacity,
            }}
          />

          {items.map((item, idx) => {
            const isActive = location.pathname === item.href;
            return (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => {
                  setActiveHoverIndex(idx);
                  updatePill(idx);
                  if (item.dropdown) setHoveredDropdown(idx);
                  else setHoveredDropdown(null);
                }}
              >
                <Link
                  to={item.href}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  className={cn(
                    "relative z-10 px-3.5 py-1.5 rounded-none text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5",
                    isActive ? "text-white font-bold" : "text-gray-400 hover:text-white"
                  )}
                >
                  {item.label}
                  {item.badge && (
                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-none bg-white/10 text-white border border-white/20">
                      {item.badge}
                    </span>
                  )}
                  {item.dropdown && (
                    <ChevronDown className="w-3 h-3 opacity-60 transition-transform group-hover:rotate-180" />
                  )}
                </Link>

                {/* Dropdown Mega-Menu */}
                {item.dropdown && hoveredDropdown === idx && (
                  <div 
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 p-2 rounded-none bg-black border border-white/20 backdrop-blur-2xl shadow-[0_0_30px_rgba(255,255,255,0.05)] animate-in fade-in zoom-in-95 duration-150 z-50"
                    onMouseLeave={() => setHoveredDropdown(null)}
                  >
                    <div className="space-y-1">
                      {item.dropdown.map((sub) => {
                        const SubIcon = sub.icon;
                        const isLocked = sub.requiresAuth && !isAuthenticated;
                        const targetHref = isLocked ? `/login?redirect=${encodeURIComponent(sub.href)}` : sub.href;

                        return (
                          <Link
                            key={sub.href}
                            to={targetHref}
                            className="flex items-start gap-3 p-2 rounded-none hover:bg-white/10 transition-colors group/sub"
                          >
                            <div className="p-1.5 rounded-none bg-white/5 text-white group-hover/sub:bg-white group-hover/sub:text-black transition-colors shrink-0 border border-white/10">
                              <SubIcon className="w-4 h-4" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <div className="text-xs font-mono font-medium text-white flex items-center justify-between">
                                <span className="flex items-center gap-1 truncate">
                                  {sub.title}
                                </span>
                                {isLocked ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-black bg-white border border-white/30 px-1.5 py-0.5 rounded-none shrink-0">
                                    <Lock className="w-2.5 h-2.5" /> AUTH
                                  </span>
                                ) : (
                                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0" />
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500 leading-tight truncate font-mono">
                                {sub.description}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right Status & Action Controls */}
        <div className="flex items-center gap-2.5 pr-1">
          {showStatusIndicator && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-none bg-white/5 border border-white/20 text-[10px] font-mono text-white">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-white opacity-75" />
                <span className="relative inline-flex rounded-none h-2 w-2 bg-white" />
              </span>
              WORLD MODEL LIVE
            </div>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-mono font-bold bg-white text-black hover:bg-gray-200 border border-white transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
              <button
                onClick={() => logout()}
                title="Sign Out"
                className="p-1.5 rounded-none text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/20"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-none text-xs font-mono text-gray-400 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-none text-xs font-mono font-bold bg-white text-black hover:bg-gray-200 border border-white transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Get Access
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-none text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/20"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-4 rounded-none bg-black border border-white/20 backdrop-blur-2xl shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-1">
            {items.map((item) => (
              <div key={item.href} className="space-y-1">
                <Link
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-3 py-2 rounded-none text-xs font-mono uppercase tracking-wider flex items-center justify-between",
                    location.pathname === item.href
                      ? "bg-white/10 text-white font-bold border-l-2 border-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                  )}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] rounded-none bg-white/10 text-white border border-white/20">
                      {item.badge}
                    </span>
                  )}
                </Link>
                {item.dropdown && (
                  <div className="pl-4 space-y-1">
                    {item.dropdown.map((sub) => {
                      const isLocked = sub.requiresAuth && !isAuthenticated;
                      const targetHref = isLocked ? `/login?redirect=${encodeURIComponent(sub.href)}` : sub.href;
                      return (
                        <Link
                          key={sub.href}
                          to={targetHref}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-between py-1 px-2 text-[11px] font-mono text-gray-400 hover:text-white"
                        >
                          <span>{sub.title}</span>
                          {isLocked && (
                            <span className="text-[9px] text-black bg-white font-bold px-1 rounded-none">AUTH</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 mt-2 border-t border-white/20 flex items-center justify-between">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 w-full text-center text-xs font-mono font-bold bg-white text-black rounded-none border border-white"
              >
                Go to Dashboard
              </Link>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 w-full text-center text-xs font-mono text-white bg-black border border-white/30 hover:bg-white/10"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 w-full text-center text-xs font-mono font-bold bg-white text-black border border-white"
                >
                  Get Access
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default FullWidthNav;

