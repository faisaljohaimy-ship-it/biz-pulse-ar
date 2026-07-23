import { describe, expect, it } from "vitest";
import {
  MAKKAH_TZ,
  MAKKAH_UTC_OFFSET_MIN,
  buildFinnRuntimeBlock,
  buildMakkahMoment,
  MAKKAH_TIME_DIRECTIVE,
} from "./makkah-clock";

// A fixed instant: 2026-07-23T11:07:33Z → 14:07:33 in Makkah (UTC+3).
const FIXED = new Date("2026-07-23T11:07:33.000Z");

describe("makkah-clock — the single time source (FINN constitution Art. 2)", () => {
  it("is anchored to Asia/Riyadh at a fixed +3 offset with no DST", () => {
    expect(MAKKAH_TZ).toBe("Asia/Riyadh");
    expect(MAKKAH_UTC_OFFSET_MIN).toBe(180);
  });

  it("renders the wall clock in Makkah time, not UTC", () => {
    const m = buildMakkahMoment(FIXED);
    expect(m.time).toBe("14:07:33");
    expect(m.epochMs).toBe(FIXED.getTime());
  });

  it("emits an ISO stamp carrying the explicit +03:00 offset (never Z)", () => {
    const m = buildMakkahMoment(FIXED);
    expect(m.iso).toBe("2026-07-23T14:07:33+03:00");
    expect(m.iso).not.toContain("Z");
  });

  it("builds the ⏱ header in the mandated shape", () => {
    const m = buildMakkahMoment(FIXED);
    expect(m.header.startsWith("⏱ 14:07:33 · ")).toBe(true);
    expect(m.header).toContain("توقيت مكة المكرمة (UTC+3)");
  });

  it("injects a complete <FINN_RUNTIME> block with role/region/simulation", () => {
    const block = buildFinnRuntimeBlock({
      now: FIXED,
      userRole: "manager",
      region: "الغربية",
      isSimulation: true,
    });
    expect(block.startsWith("<FINN_RUNTIME>")).toBe(true);
    expect(block.trimEnd().endsWith("</FINN_RUNTIME>")).toBe(true);
    expect(block).toContain("iso:        2026-07-23T14:07:33+03:00");
    expect(block).toContain("time:       14:07:33");
    expect(block).toContain("tz:         Asia/Riyadh (UTC+03:00, no DST)");
    expect(block).toContain("user_role:  manager");
    expect(block).toContain("region:     الغربية");
    expect(block).toContain("is_simulation: true");
  });

  it("ships an Article-2 directive naming the block as the sole time source", () => {
    expect(MAKKAH_TIME_DIRECTIVE).toContain("<FINN_RUNTIME>");
    expect(MAKKAH_TIME_DIRECTIVE).toContain("مصدرك الوحيد");
    expect(MAKKAH_TIME_DIRECTIVE).toContain("UTC+03:00");
  });
});
