import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Reset scroll position on route change so every navigation starts at the top
 * of the destination surface. In-page anchor links (URL hashes) are respected.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    if (typeof window === "undefined") return;
    try {
      window.scrollTo(0, 0);
    } catch {
      // jsdom / restricted environments do not implement scrollTo — ignore.
    }
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
