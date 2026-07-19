/**
 * Compatibility shim — the single source of truth moved to
 * src/config/platforms.ts (owner directive). The in-page embed path
 * (hajjEmbedUrl / blocked-host logic) is retired: Nusuk always opens
 * EXTERNALLY; NEXIOS shows the showcase card instead of an embed.
 */
import { HAJJ_PLATFORM, HAJJ_INTERNAL_ROUTE, hajjPlatformUrl } from "@/config/platforms";

export { HAJJ_INTERNAL_ROUTE };
export const HAJJ_PLATFORM_LABEL_AR = HAJJ_PLATFORM.name_ar;
export const HAJJ_PLATFORM_LABEL_EN = HAJJ_PLATFORM.name_en;

/** URL for external "open in a new tab" links (any valid https host). */
export function hajjOpenUrl(): string | null {
  return hajjPlatformUrl();
}
