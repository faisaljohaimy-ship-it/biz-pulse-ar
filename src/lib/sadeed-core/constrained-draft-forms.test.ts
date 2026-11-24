import { describe, expect, it } from "vitest";
import {
  buildConstrainedDraft,
  ConstrainedDraftFormSchema,
  CONSTRAINED_DRAFT_KINDS,
  CONSTRAINED_DRAFT_MAX_CHARS,
} from "./constrained-draft-forms";

const valid = {
  kind: "summarize",
  locale: "en",
  topic: "Shift handover",
  details: "The team supplied these notes.",
};

describe("constrained review draft forms", () => {
  it.each(["open_route", "request_approval", "prepare_email", "run", "__proto__"])(
    "rejects action kinds outside the three review forms: %s",
    (kind) => {
      expect(ConstrainedDraftFormSchema.safeParse({ ...valid, kind }).success).toBe(false);
    },
  );

  it.each(["execute", "approved", "actorId", "recipient", "definition"])(
    "rejects extra instruction/authority fields: %s",
    (key) => {
      expect(ConstrainedDraftFormSchema.safeParse({ ...valid, [key]: true }).success).toBe(false);
      expect(() => buildConstrainedDraft({ ...valid, [key]: true })).toThrow();
    },
  );

  it.each([
    { locale: "fr" },
    { topic: "ab" },
    { topic: " a " },
    { topic: "x".repeat(161) },
    { details: "" },
    { details: " " },
    { details: "x".repeat(1201) },
  ])("rejects invalid locale or unbounded/empty text: %s", (change) => {
    expect(ConstrainedDraftFormSchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });

  it.each(["ar", "en"] as const)(
    "keeps every supported form bounded and explicitly review-only: %s",
    (locale) => {
      for (const kind of CONSTRAINED_DRAFT_KINDS) {
        const topic = "ع".repeat(160);
        const details = "ن".repeat(1200);
        const draft = buildConstrainedDraft({ kind, locale, topic, details });
        expect(draft.length).toBeLessThanOrEqual(CONSTRAINED_DRAFT_MAX_CHARS);
        expect(draft).toContain(topic);
        expect(draft).toContain(details);
        expect(draft).toContain(locale === "ar" ? "مسودة للمراجعة فقط" : "Review draft only");
        expect(draft).toContain(locale === "ar" ? "وليست حقائق متحققة" : "not verified facts");
        expect(draft).toContain(locale === "ar" ? "لا ترسل أو تنشر" : "Do not send or publish");
      }
    },
  );

  it("retains supplied markup as text rather than interpreting or trusting it", () => {
    const details = '<img src=x onerror="alert(1)"> <script>doSomething()</script>';
    const draft = buildConstrainedDraft({ ...valid, details });
    expect(draft).toContain(details);
    expect(draft).toContain("not verified facts");
    expect(draft).toContain("approve actions or run tools");
  });
});
