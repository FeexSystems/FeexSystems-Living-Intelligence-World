import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { buildBreadcrumbTrail } from "./routeMap";

export interface BreadcrumbsProps {
  /** Override the pathname to derive the trail from (defaults to the location). */
  pathname?: string;
  className?: string;
  /** Render a home glyph on the first crumb. */
  showHomeIcon?: boolean;
  /** Accessible label for the wrapping <nav>. */
  ariaLabel?: string;
}

/**
 * Route-aware breadcrumb trail.
 *
 * Every ancestor is an anchor (the "return" path) and the final crumb is the
 * current page. Renders nothing for the site root so it can be mounted
 * unconditionally on shared layouts.
 */
export function Breadcrumbs({
  pathname,
  className,
  showHomeIcon = true,
  ariaLabel = "Breadcrumb",
}: BreadcrumbsProps) {
  const location = useLocation();
  const crumbs = buildBreadcrumbTrail(pathname ?? `${location.pathname}${location.search}`);
  const hasCollapsedAncestors = crumbs.length > 2;

  if (crumbs.length <= 1) return null;

  return (
    <Breadcrumb aria-label={ariaLabel} className={cn("font-mono", className)}>
      <BreadcrumbList className="gap-1.5 text-[11px] uppercase tracking-wider sm:gap-2">
        {crumbs.map((crumb, index) => (
          <Fragment key={`${crumb.href}-${index}`}>
            {index === 1 && hasCollapsedAncestors ? (
              <>
                <li className="sm:hidden">
                  <BreadcrumbEllipsis />
                </li>
                <BreadcrumbSeparator className="sm:hidden text-white/25" />
              </>
            ) : null}
            <BreadcrumbItem
              className={
                index > 0 && !crumb.isCurrent && hasCollapsedAncestors
                  ? "sr-only sm:not-sr-only sm:inline-flex"
                  : undefined
              }
            >
              {crumb.isCurrent ? (
                <BreadcrumbPage className="text-white/80">{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link
                    to={crumb.href}
                    className="inline-flex items-center gap-1.5 text-white/40 transition-colors hover:text-white focus-visible:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white"
                  >
                    {index === 0 && showHomeIcon && <Home className="h-3 w-3" aria-hidden="true" />}
                    <span>{crumb.label}</span>
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < crumbs.length - 1 && (
              <BreadcrumbSeparator
                className={
                  hasCollapsedAncestors ? "hidden text-white/25 sm:block" : "text-white/25"
                }
              />
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default Breadcrumbs;
