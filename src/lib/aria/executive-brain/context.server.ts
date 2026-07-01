/**
 * Context Builder — normalizes the incoming BrainRequest into a compact,
 * model-friendly context block. Mirrors the block previously assembled
 * inline in `/api/public/aria-ask` so callers reuse one canonical shape.
 */
import type { BrainRequest } from "./types";

export function buildContextBlock(req: BrainRequest, memoryBlock: string): string {
  const parts: string[] = [];

  if (req.page) {
    const p = req.page;
    const line = [
      p.title ? `title=${p.title}` : null,
      p.path ? `path=${p.path}` : null,
      p.section ? `section=${p.section}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    parts.push(`# CURRENT PAGE\n${line || "(unknown)"}`);
    if (p.filters && Object.keys(p.filters).length) {
      parts.push(`# ACTIVE FILTERS\n${JSON.stringify(p.filters).slice(0, 1200)}`);
    }
    if (p.selected) {
      parts.push(`# SELECTED OBJECT\n${JSON.stringify(p.selected).slice(0, 1200)}`);
    }
  }

  if (req.widgets?.length) {
    const lines = req.widgets.slice(0, 24).map((w) => {
      const v = w.value === undefined ? "" : ` = ${JSON.stringify(w.value).slice(0, 220)}`;
      const hint = w.hint ? ` — ${w.hint}` : "";
      return `- [${w.kind}] ${w.label}${v}${hint}`;
    });
    parts.push(`# LIVE WIDGETS / KPIs ON SCREEN\n${lines.join("\n")}`);
  }

  if (req.anchors?.length) {
    parts.push(
      `# REFERENCEABLE ANCHORS (resolve "this" / "that" / "the previous X" from these)\n${req.anchors
        .map((a) => `- ${a.kind}: ${a.label ?? a.id} (${a.id})`)
        .join("\n")}`,
    );
  }

  if (req.history?.length) {
    parts.push(
      `# RECENT CONVERSATION (oldest → newest)\n${req.history
        .slice(-8)
        .map((t) => `${t.role.toUpperCase()}: ${t.text.slice(0, 400)}`)
        .join("\n")}`,
    );
  }

  if (memoryBlock) parts.push(memoryBlock);

  parts.push(
    'GROUND every claim in the sections above and the GROUNDED EVIDENCE block. If a required datum is not present, say once: "Data unavailable / بيانات غير متوفرة" and stop. Never invent numbers, names, dates, or sources.',
  );

  return parts.join("\n\n");
}
