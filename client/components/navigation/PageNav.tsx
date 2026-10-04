import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "./Breadcrumbs";
import { BackButton } from "./BackButton";
import { resolveReturnTarget } from "./routeMap";

export interface PageNavProps {
  /** Explicit return target. Defaults to the route parent (or home). */
  backTo?: string;
  backLabel?: string;
  className?: string;
  showBreadcrumbs?: boolean;
  showBack?: boolean;
}

/**
 * Standard page chrome: a breadcrumb trail (ancestor "return" links) plus a
 * smart back control. Mount at the top of any non-fullscreen page to guarantee
 * both enter and return affordances.
 */
export function PageNav({
  backTo,
  backLabel = "Back",
  className,
  showBreadcrumbs = true,
  showBack = true,
}: PageNavProps) {
  const location = useLocation();
  const target = backTo ?? resolveReturnTarget(location.pathname);

  return (
    <nav
      aria-label="Page navigation"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 backdrop-blur-md",
        className
      )}
    >
      {showBreadcrumbs ? <Breadcrumbs /> : <span aria-hidden="true" />}
      {showBack ? <BackButton to={target} label={backLabel} /> : null}
    </nav>
  );
}

export default PageNav;
