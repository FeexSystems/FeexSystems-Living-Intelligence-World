/**
 * Shared navigation layer.
 *
 * A single barrel for the enter/return navigation primitives used across every
 * surface of the SPA:
 *
 *   - routeMap      → canonical labels, parents, titles
 *   - Breadcrumbs   → ancestor return links
 *   - BackButton    → history-aware return control
 *   - PageNav       → breadcrumbs + back chrome for standard pages
 *   - AuthNav       → top nav for guest-only auth surfaces
 *   - WorldReturnBar → exit bar for the full-screen /world runtime
 *   - ScrollToTop   → reset scroll on navigation
 */
export * from "./routeMap";
export * from "./Breadcrumbs";
export * from "./BackButton";
export * from "./PageNav";
export * from "./AuthNav";
export * from "./WorldReturnBar";
export * from "./ScrollToTop";
