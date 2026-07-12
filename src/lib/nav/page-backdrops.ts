/**
 * Route → glossy photographic backdrop map. Rendered once in the app shell so
 * authenticated pages get a themed, position-appropriate backdrop without each
 * page wiring it individually. Pages that own a full-bleed opaque layout
 * (command-center, mission-control, boardroom, integrations, fabric) set their
 * own backdrop and are intentionally NOT listed here.
 */
const PAGE_BACKDROPS: Record<string, string> = {
  "/situation-room": "/smart-city-bg.jpeg",
  "/intelligence": "/ai-analytics-bg.jpeg",
  "/analytics": "/decision-intel-bg.jpeg",
  "/executive-map": "/smart-city-map-bg.jpeg",
  "/agents": "/ai-assistant-bg.png",
  "/sec/exec": "/strategy-map-bg.jpeg",
  "/sec": "/command-wall-bg.jpeg",
};

/** The backdrop image for a route (exact match), or undefined. */
export function pageBackdropFor(pathname: string): string | undefined {
  return PAGE_BACKDROPS[pathname];
}
