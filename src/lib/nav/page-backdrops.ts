/**
 * Route → glossy photographic backdrop map. Rendered once in the app shell so
 * authenticated pages get a themed, position-appropriate backdrop without each
 * page wiring it individually. Pages that own a full-bleed opaque layout
 * (mission-control, boardroom, integrations, fabric) set their own backdrop
 * and are intentionally NOT listed here.
 */
const PAGE_BACKDROPS: Record<string, string> = {
  // Operations & live rooms → smart-city / command-wall imagery.
  "/situation-room": "/smart-city-bg.jpeg",
  "/operations": "/smart-city-bg.jpeg",
  "/crisis": "/command-wall-bg.jpeg",
  "/sec/emergency": "/command-wall-bg.jpeg",
  "/sec": "/command-wall-bg.jpeg",
  // Intelligence & analytics → AI/analytics imagery.
  "/intelligence": "/ai-analytics-bg.jpeg",
  "/observability": "/ai-analytics-bg.jpeg",
  "/sec/kpi": "/ai-analytics-bg.jpeg",
  "/agents": "/ai-assistant-bg.webp",
  // Decisions & risk → decision-intelligence imagery.
  "/analytics": "/decision-intel-bg.jpeg",
  "/decisions": "/decision-intel-bg.jpeg",
  "/risk": "/decision-intel-bg.jpeg",
  // Strategy & governance → strategy-map imagery.
  "/executive": "/strategy-map-bg.webp",
  "/governance": "/strategy-map-bg.webp",
  "/sec/exec": "/strategy-map-bg.webp",
  // Maps → smart-city map imagery.
  "/executive-map": "/smart-city-map-bg.webp",
  // Smart command center — a pure map plate (never a dashboard screenshot:
  // its text bleeds through as "ghost cards"). Registered here so the shell
  // renders ONE photo backdrop instead of the aurora + a page-level copy.
  "/command-center": "/smart-city-map-bg.webp",
};

/** The backdrop image for a route (exact match), or undefined. */
export function pageBackdropFor(pathname: string): string | undefined {
  return PAGE_BACKDROPS[pathname];
}
