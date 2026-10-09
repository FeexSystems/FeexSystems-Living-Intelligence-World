import React, { useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { Lock, ArrowRight, X, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export function useGitHubAuthGuard() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isAuthenticated = typeof isLoggedIn === "function" ? isLoggedIn() : Boolean(user);
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);

  const handleGitHubClick = useCallback(
    (url: string, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (isAuthenticated) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setBlockedUrl(url);
      }
    },
    [isAuthenticated]
  );

  const closeAuthModal = useCallback(() => {
    setBlockedUrl(null);
  }, []);

  const GitHubAuthModal = blockedUrl ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none"
    >
      <div className="relative w-full max-w-md border border-white/20 bg-[#09090b] p-6 text-white font-mono shadow-[0_0_50px_rgba(0,0,0,0.9)] rounded-2xl">
        <button
          onClick={closeAuthModal}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-full bg-white text-black flex items-center justify-center font-bold shrink-0">
            <Lock className="size-5" />
          </div>
          <div>
            <div className="text-[10px] text-white/50 uppercase tracking-widest">
              AUTHENTICATION REQUIRED
            </div>
            <h3 id="auth-modal-title" className="text-sm font-bold text-white">
              RESTRICTED REPOSITORY ACCESS
            </h3>
          </div>
        </div>

        <p className="text-xs text-white/70 leading-relaxed mb-6 font-mono">
          Direct access to FeexSystems GitHub repositories and cryptographic artifact source code is
          restricted to authenticated engineering personnel. Public visitors must authenticate before
          inspecting source repositories.
        </p>

        <div className="space-y-2.5">
          <Link
            to="/login"
            onClick={closeAuthModal}
            className="w-full h-10 bg-white text-black font-semibold flex items-center justify-center gap-2 text-xs rounded-xl hover:bg-zinc-200 transition-colors font-mono"
          >
            Sign In to Access GitHub <ArrowRight className="size-3.5" />
          </Link>
          <Link
            to="/register"
            onClick={closeAuthModal}
            className="w-full h-10 border border-white/20 bg-zinc-900 text-white flex items-center justify-center gap-2 text-xs rounded-xl hover:bg-zinc-800 transition-colors font-mono"
          >
            Create Engineering Account
          </Link>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[9px] text-white/50 uppercase tracking-wider font-mono">
          <span>FEEXSYSTEMS SECURITY POLICY</span>
          <span className="flex items-center gap-1 text-white/60">
            <ShieldAlert className="size-3" /> ZERO-TRUST
          </span>
        </div>
      </div>
    </div>
  ) : null;

  return {
    handleGitHubClick,
    GitHubAuthModal,
    isAuthModalOpen: Boolean(blockedUrl),
  };
}

export function GitHubGuardLink({
  href,
  children,
  className,
  title,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const { handleGitHubClick, GitHubAuthModal } = useGitHubAuthGuard();
  return (
    <>
      <a
        href={href}
        onClick={(e) => handleGitHubClick(href, e)}
        className={className}
        title={title}
      >
        {children}
      </a>
      {GitHubAuthModal}
    </>
  );
}
