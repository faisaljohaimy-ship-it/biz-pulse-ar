/**
 * Route → glossy photographic backdrop map. Rendered once in the app shell so
 * authenticated pages get a themed, position-appropriate backdrop without each
 * page wiring it individually. Pages that own a full-bleed opaque layout
 * (command-center, mission-control, boardroom, integrations, fabric) set their
 * own backdrop and are intentionally NOT listed here.
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
  "/executive": "/strategy-map-bg.jpeg",
  "/governance": "/strategy-map-bg.jpeg",
  "/sec/exec": "/strategy-map-bg.jpeg",
  // Maps → smart-city map imagery.
  "/executive-map": "/smart-city-map-bg.jpeg",
};

/** The backdrop image for a route (exact match), or undefined. */
export function pageBackdropFor(pathname: string): string | undefined {
  return PAGE_BACKDROPS[pathname];
}
