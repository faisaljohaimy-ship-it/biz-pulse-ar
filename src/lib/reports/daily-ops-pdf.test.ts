import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDailyOpsSimulation } from "@/lib/exec/showcase-simulation.server";
import { buildDailyOpsPdf } from "./daily-ops-pdf";

describe("buildDailyOpsPdf — live Arabic report engine", () => {
  it("renders a multi-section Arabic PDF with the embedded font", async () => {
    const fontBytes = await readFile(resolve(process.cwd(), "public/fonts/nexios-arabic.ttf"));
    const data = buildDailyOpsSimulation("2026-07-19");
    const bytes = await buildDailyOpsPdf(data, fontBytes);

    // A real PDF, non-trivial in size (cover + tables + chart + font subset).
    expect(bytes.length).toBeGreaterThan(10_000);
    const head = new TextDecoder("latin1").decode(bytes.slice(0, 5));
    expect(head).toBe("%PDF-");
    const tail = new TextDecoder("latin1").decode(bytes.slice(-32));
    expect(tail).toContain("%%EOF");
  });

  it("is deterministic for the same date (registry rows regenerate identically)", () => {
    const a = buildDailyOpsSimulation("2026-07-15");
    const b = buildDailyOpsSimulation("2026-07-15");
    expect(a).toEqual(b);
    const c = buildDailyOpsSimulation("2026-07-16");
    expect(c.incidents.map((i) => i.ref)).not.toEqual(a.incidents.map((i) => i.ref));
  });
});
