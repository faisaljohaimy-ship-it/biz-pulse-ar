/**
 * ContextAwareness — inspects the executive context snapshot and reports
 * what ARIA can see and what is missing. Never fabricates.
 */
import type { AriaContextSnapshot, AriaIntent } from "../types/aria";
import type { ContextAwarenessReport } from "../types/executive";

const KNOWN_FACT_KEYS = [
  "kpis",
  "incidents",
  "crises",
  "assets",
  "sites",
  "widgets",
  "user",
  "role",
  "org",
];

export const contextAwareness = {
  assess(snapshot: AriaContextSnapshot, intent: AriaIntent): ContextAwarenessReport {
    const meta = snapshot.pageMeta ?? {};
    const metaKeys = Object.keys(meta);
    const widgets = Array.isArray(meta.widgets)
      ? (meta.widgets as unknown[]).filter((w): w is string => typeof w === "string")
      : [];

    const available: string[] = [];
    const missing: string[] = [];
    for (const key of KNOWN_FACT_KEYS) {
      if (meta[key] !== undefined && meta[key] !== null) available.push(key);
      else missing.push(key);
    }
    if (snapshot.permissions.length > 0) available.push("permissions");
    else missing.push("permissions");

    return {
      route: snapshot.pathname,
      module: snapshot.module,
      screen: snapshot.screen,
      locale: snapshot.locale,
      visible_widgets: widgets,
      page_meta_keys: metaKeys,
      user_intent: intent,
      available_context: available,
      missing_context: missing,
    };
  },
};
