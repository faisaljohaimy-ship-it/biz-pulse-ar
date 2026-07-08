/**
 * ContextManager — resolves the current executive context.
 *
 * Reads the live page context from the store and enriches it with route
 * decomposition (module/screen) and a permissions placeholder. Phase 2 will
 * wire real RBAC + module metadata.
 */
import type { AriaContextSnapshot, AriaPageContext } from "../types/aria";
import { useAriaStore } from "../state/aria-store";

function decomposePath(pathname: string): { module: string; screen: string } {
  const clean = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!clean) return { module: "home", screen: "index" };
  const parts = clean.split("/").filter(Boolean);
  return {
    module: parts[0] ?? "home",
    screen: parts[parts.length - 1] ?? parts[0] ?? "index",
  };
}

export const contextManager = {
  snapshot(): AriaContextSnapshot {
    const page: AriaPageContext = useAriaStore.getState().pageContext ?? {
      pathname: typeof window !== "undefined" ? window.location.pathname : "/",
      label: "UNKNOWN",
      locale: "en",
    };
    const { module, screen } = decomposePath(page.pathname);
    return {
      ...page,
      module,
      screen,
      permissions: [],
      pageMeta: (page.facts as Record<string, unknown>) ?? {},
      capturedAt: new Date().toISOString(),
    };
  },
};
