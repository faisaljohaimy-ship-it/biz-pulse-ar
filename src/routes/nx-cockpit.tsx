/**
 * /nx-cockpit · قمرة القيادة التنفيذية — route definition only.
 * The page implementation lives in the colocated non-route helper
 * (-nx-cockpit-page.tsx) so the router can code-split it out of the
 * entry bundle. No named page export here — that would defeat the split.
 */
import { createFileRoute } from "@tanstack/react-router";
import { DOMAIN_URL } from "@/lib/domain";
import { NxCockpitPage } from "./-nx-cockpit-page";

export interface NxCockpitSearch {
  region?: string;
  level?: string;
}

export const Route = createFileRoute("/nx-cockpit")({
  validateSearch: (search: Record<string, unknown>): NxCockpitSearch => ({
    region: typeof search.region === "string" ? search.region : undefined,
    level: typeof search.level === "string" ? search.level : undefined,
  }),
  head: () => ({
    meta: [
      { title: "قمرة القيادة التنفيذية · NX Cockpit — NEXIOS AI OS" },
      {
        name: "description",
        content: "عرض لغة التصميم التنفيذية الموحّدة لنظام نكسيوس — محاكاة مرجعية.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/nx-cockpit` }],
  }),
  component: NxCockpitPage,
});
