import { describe, expect, it } from "vitest";
import {
  MAKKAH_TZ,
  MAKKAH_UTC_OFFSET_MIN,
  buildFinnGreetingClockSpeech,
  buildFinnRuntimeBlock,
  buildMakkahMoment,
  MAKKAH_TIME_DIRECTIVE,
} from "./makkah-clock";
import { arabicNumberWords } from "./pronunciation";

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

  it("greeting opener speaks the Gregorian date then Makkah time once — never Hijri", () => {
    const speech = buildFinnGreetingClockSpeech(FIXED, arabicNumberWords);
    // 2026-07-23 14:07 Makkah → 23 يوليو 2026 · 2:07 مساءً
    expect(speech).toContain("التاريخ ثلاثة وعشرون يوليو ألفان وستة وعشرون ميلادي");
    expect(speech).toContain("والساعة الآن اثنان وسبعة دقائق مساءً بتوقيت مكة المكرمة.");
    // Hijri must never leak into speech (display-only per the directive).
    expect(speech).not.toContain("هـ");
    expect(speech).not.toContain("صفر 1448");
    expect(speech).not.toMatch(/[0-9]/);
  });

  it("greeting opener handles the exact hour and morning period", () => {
    // 2026-07-23T06:00:00Z → 09:00 Makkah.
    const speech = buildFinnGreetingClockSpeech(
      new Date("2026-07-23T06:00:00.000Z"),
      arabicNumberWords,
    );
    expect(speech).toContain("والساعة الآن تسعة تمامًا صباحًا بتوقيت مكة المكرمة.");
  });

  it("directive forbids repeating date and mandates complete in-scope answers", () => {
    expect(MAKKAH_TIME_DIRECTIVE).toContain("قاعدة عدم تكرار التاريخ");
    expect(MAKKAH_TIME_DIRECTIVE).toContain("لا يُنطق في القناة الصوتية أبدًا");
    expect(MAKKAH_TIME_DIRECTIVE).toContain("اكتمال الإجابة داخل إطار النظام");
    expect(MAKKAH_TIME_DIRECTIVE).toContain("داخل إطار النظام حصريًا");
  });

  it("runtime block carries the datetime_spoken guard flag", () => {
    const first = buildFinnRuntimeBlock({
      now: FIXED,
      userRole: "manager",
      region: "الغربية",
      isSimulation: true,
      datetimeSpoken: false,
    });
    expect(first).toContain("datetime_spoken: false");

    const later = buildFinnRuntimeBlock({
      now: FIXED,
      userRole: "manager",
      region: "الغربية",
      isSimulation: true,
      datetimeSpoken: true,
    });
    expect(later).toContain("datetime_spoken: true");

    // Defaults to false (first turn) when omitted.
    const dflt = buildFinnRuntimeBlock({
      now: FIXED,
      userRole: "manager",
      region: "الغربية",
      isSimulation: true,
    });
    expect(dflt).toContain("datetime_spoken: false");
  });
});
