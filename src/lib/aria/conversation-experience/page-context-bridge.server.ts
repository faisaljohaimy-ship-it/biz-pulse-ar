// Page context bridge — validates a PageContext snapshot and formats
// it as a compact prompt fragment for the reasoning layer.
import { PageContextSchema } from "./contracts";
import type { PageContext } from "./types";

export function validatePageContext(input: unknown): PageContext | null {
  const parsed = PageContextSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function formatPageContext(ctx: PageContext | null): string {
  if (!ctx) return "";
  const lines: string[] = [`Current route: ${ctx.route}`];
  if (ctx.title) lines.push(`Page title: ${ctx.title}`);
  if (ctx.anchors && ctx.anchors.length) lines.push(`Anchors: ${ctx.anchors.slice(0, 12).join(", ")}`);
  if (ctx.widgets && ctx.widgets.length) {
    lines.push("Visible widgets:");
    for (const w of ctx.widgets.slice(0, 12)) {
      lines.push(`  - [${w.kind}] ${w.id}${w.summary ? `: ${w.summary}` : ""}`);
    }
  }
  return lines.join("\n");
}
