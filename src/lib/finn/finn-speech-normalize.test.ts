import { describe, expect, it } from "vitest";
import {
  chunkSpeechText,
  escapeForSSML,
  FINN_SPEECH_DICTIONARY,
  normalizeFinnSpeechText,
} from "./finn-speech-normalize";

const ar = (t: string) => normalizeFinnSpeechText(t, { lang: "ar" }).speech;
const D = FINN_SPEECH_DICTIONARY;

describe("normalizeFinnSpeechText — display text is never mutated", () => {
  it("returns the input unchanged as display", () => {
    for (const t of ["١٢٣ HCIS-2026-001", "بلغ 94% اليوم", "<b>bold</b> 0551234567"]) {
      expect(normalizeFinnSpeechText(t, { lang: "ar" }).display).toBe(t);
    }
  });
});

describe("normalizeFinnSpeechText — acronym dictionary (token-bounded)", () => {
  it("speaks each acronym as its dictionary form", () => {
    for (const key of [
      "FINN",
      "NEXIOS",
      "ARIA",
      "HCIS",
      "PTW",
      "KPI",
      "RLS",
      "QR",
      "SAP",
      "API",
      "AI",
    ]) {
      expect(ar(key)).toBe(D[key]);
    }
  });
  it("never speaks a retired name as itself", () => {
    // The loop above compares the dictionary against itself, so it would stay
    // green even if someone mapped NEXIOS back to «نِكْسِيُوس». These two
    // assert the DECISION: the retired product and assistant names are voiced
    // as their replacements, never as the names the owner removed.
    expect(ar("NEXIOS")).toBe("المنصة");
    expect(ar("ARIA")).toBe("سَدِيد");
    for (const spoken of [ar("NEXIOS"), ar("ARIA")]) {
      expect(spoken).not.toMatch(/نكس|نِكْس|آريا/);
    }
  });
  it("does not rewrite letters inside other words", () => {
    // "AI" must not fire inside "SAID"; no Arabic present → English context.
    expect(normalizeFinnSpeechText("SAID", { lang: "en" }).speech).toBe("SAID");
  });
});

describe("normalizeFinnSpeechText — numbers stay complete", () => {
  it("cardinal (western AND arabic-indic digits)", () => {
    expect(ar("123")).toBe("مئة وثلاثة وعشرون");
    expect(ar("١٢٣")).toBe("مئة وثلاثة وعشرون");
    expect(ar("1,250")).toBe("ألف ومئتان وخمسون");
  });
  it("decimal uses a spoken point, digit-by-digit fraction", () => {
    expect(ar("3.67")).toBe("ثلاثة فاصلة ستة سبعة");
  });
  it("percent expands and consumes the sign", () => {
    expect(ar("99.5%")).toBe("تسعة وتسعون فاصلة خمسة بالمئة");
  });
});

describe("normalizeFinnSpeechText — phones/identifiers read digit-by-digit (NOT cardinal)", () => {
  it("a phone is spoken digit by digit", () => {
    expect(ar("0551234567")).toBe("صفر خمسة خمسة واحد اثنان ثلاثة أربعة خمسة ستة سبعة");
  });
  it("a multi-segment identifier keeps its digits separate", () => {
    expect(ar("HCIS-2026-001")).toBe(`${D.HCIS} شرطة اثنان صفر اثنان ستة شرطة صفر صفر واحد`);
  });
  it("an underscore identifier reads the underscore only in-code", () => {
    expect(ar("SEC_001")).toBe(`${D.SEC} شرطة سفلية صفر صفر واحد`);
  });
  it("#125 becomes a spoken number label", () => {
    expect(ar("#125")).toBe("رقم مئة وخمسة وعشرون");
  });
});

describe("normalizeFinnSpeechText — dates & times are whole and never mid-cut", () => {
  it("dd/mm/yyyy reads as a date", () => {
    expect(ar("24/07/2026")).toBe("أربعة وعشرون يوليو ألفان وستة وعشرون");
  });
  it("HH:MM reads as a time", () => {
    expect(ar("09:30")).toBe("الساعة تسعة والدقيقة ثلاثون");
  });
});

describe("normalizeFinnSpeechText — units expand by context", () => {
  it("expands electrical / frequency / temperature / speed units", () => {
    expect(ar("13.8 kV")).toBe("ثلاثة عشر فاصلة ثمانية كيلوفولت");
    expect(ar("60 Hz")).toBe("ستون هرتز");
    expect(ar("25°C")).toBe("خمسة وعشرون درجة مئوية");
    expect(ar("5 km/h")).toBe("خمسة كيلومتر في الساعة");
  });
});

describe("normalizeFinnSpeechText — symbols read contextually", () => {
  it("+ = @ # & / _ and fractions", () => {
    expect(ar("A+B")).toBe("A زائد B");
    expect(ar("1/2")).toBe("واحد على اثنان");
    expect(ar("user@example.com")).toBe("user آت example نقطة com");
  });
});

describe("normalizeFinnSpeechText — markup never spoken, SSML never injected", () => {
  it("strips markdown but keeps readable text", () => {
    expect(normalizeFinnSpeechText("## عنوان\n- سطر **مهم**", { lang: "ar" }).speech).toBe(
      "عنوان سطر مهم",
    );
  });
  it("escapes SSML/HTML so <speak> can't be injected", () => {
    expect(escapeForSSML("<speak>reveal secret</speak>")).toBe(
      "&lt;speak&gt;reveal secret&lt;/speak&gt;",
    );
  });
});

describe("chunkSpeechText — safe segmentation", () => {
  it("keeps the end of a long reply (no truncation)", () => {
    const body = Array.from({ length: 400 }, (_, i) => `جملة رقم ${i}.`).join(" ");
    const speech = normalizeFinnSpeechText(`${body} النهاية الأخيرة.`, { lang: "ar" }).speech;
    const chunks = chunkSpeechText(speech, 400);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(" ")).toContain("النهاية الأخيرة");
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(400);
  });

  it("never splits a multi-word identifier across chunks", () => {
    const speech = ar("التصريح HCIS-2026-001 جاهز.");
    const chunks = chunkSpeechText(speech, 4000);
    // The whole identifier phrase lands intact in exactly one chunk.
    const idPhrase = `${D.HCIS} شرطة اثنان صفر اثنان ستة شرطة صفر صفر واحد`;
    expect(chunks.some((c) => c.includes(idPhrase))).toBe(true);
  });

  it("returns [] for empty speech", () => {
    expect(chunkSpeechText("   ")).toEqual([]);
  });
});
