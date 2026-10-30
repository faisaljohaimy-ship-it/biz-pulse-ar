// @vitest-environment node
/** الإعداد: غياب أي متغيّر ⇒ غير مهيّأ بلا استثناء؛ سرّان منفصلان ≥ 32؛ ومفاتيح التحكّم تفشل مغلقة. */
import { describe, expect, it } from "vitest";
import {
  type N8nConfig,
  configuredSurfaces,
  isConfigured,
  parseBaseUrl,
  parseMode,
  parseWebDisabled,
  readN8nConfig,
  SECRET_ENV,
} from "./config.server";

const S1 = "a".repeat(32);
const S2 = "b".repeat(32);
const BASE = "https://n8n.example.com";

describe("parseBaseUrl", () => {
  it.each([
    [BASE, BASE],
    [`${BASE}/`, BASE],
    ["  https://n8n.example.com  ", BASE],
    ["HTTPS://N8N.EXAMPLE.COM", BASE],
    ["https://n8n.example.com:5678", "https://n8n.example.com:5678"],
  ])("يقبل %j", (raw, origin) => {
    expect(parseBaseUrl(raw)).toBe(origin);
  });

  it.each([
    undefined,
    "",
    "   ",
    "http://n8n.example.com",
    "n8n.example.com",
    "ftp://n8n.example.com",
    "https://n8n.example.com/webhook",
    "https://n8n.example.com/webhook/",
    "https://n8n.example.com/?x=1",
    "https://n8n.example.com/#x",
    "https://user:pw@n8n.example.com",
    "https://user@n8n.example.com",
    "https://127.0.0.1",
    "https://localhost:5678",
    "https://n8n.local",
    "https://n8n", // اسم أحادي التسمية: داخلي (لا يردّه إلا شرط النقطة الواحدة على الأقل)
    "https://jenkins",
    "https://[::1]",
    "https://n8n .example.com",
    "https://n8n.example.com\\evil",
  ])("يرفض %j", (raw) => {
    expect(parseBaseUrl(raw)).toBeNull();
  });
});

describe("readN8nConfig", () => {
  it("بيئة فارغة ⇒ لا شيء مهيّأ، ولا استثناء", () => {
    const cfg: N8nConfig = readN8nConfig({});
    expect(cfg).toEqual({
      baseUrl: null,
      secrets: { sadeed: null, fnn: null },
      mode: "off",
      webDisabled: false,
    });
    expect(isConfigured(cfg, "sadeed")).toBe(false);
    expect(isConfigured(cfg, "fnn")).toBe(false);
    expect(configuredSurfaces(cfg)).toEqual([]);
  });

  it("أسماء المتغيّرات كما في العقد", () => {
    expect(SECRET_ENV).toEqual({ sadeed: "SADEED_N8N_SECRET", fnn: "FINN_N8N_SECRET" });
  });

  it("سطحٌ مهيّأ يحتاج الأصل وسرّه هو: سرّ سَدِيد لا يهيّئ FNN", () => {
    const cfg = readN8nConfig({ SADEED_N8N_BASE_URL: BASE, SADEED_N8N_SECRET: S1 });
    expect(isConfigured(cfg, "sadeed")).toBe(true);
    expect(isConfigured(cfg, "fnn")).toBe(false);
    expect(configuredSurfaces(cfg)).toEqual(["sadeed"]);
  });

  it("سرٌّ بـ31 حرفًا لا يكفي، و32 يكفي؛ والمسافات المحيطة تُقصّ قبل العدّ", () => {
    expect(
      isConfigured(
        readN8nConfig({ SADEED_N8N_BASE_URL: BASE, SADEED_N8N_SECRET: "a".repeat(31) }),
        "sadeed",
      ),
    ).toBe(false);
    expect(
      isConfigured(
        readN8nConfig({ SADEED_N8N_BASE_URL: BASE, SADEED_N8N_SECRET: "a".repeat(32) }),
        "sadeed",
      ),
    ).toBe(true);
    expect(
      isConfigured(
        readN8nConfig({ SADEED_N8N_BASE_URL: BASE, SADEED_N8N_SECRET: ` ${"a".repeat(31)} \n` }),
        "sadeed",
      ),
    ).toBe(false);
  });

  it("أصلٌ فاسد ⇒ لا تهيئة لأي سطح ولو صحّ السرّان", () => {
    const cfg = readN8nConfig({
      SADEED_N8N_BASE_URL: "http://n8n.example.com",
      SADEED_N8N_SECRET: S1,
      FINN_N8N_SECRET: S2,
    });
    expect(configuredSurfaces(cfg)).toEqual([]);
  });

  it("السرّان المنفصلان يهيّئان السطحين", () => {
    const cfg = readN8nConfig({
      SADEED_N8N_BASE_URL: BASE,
      SADEED_N8N_SECRET: S1,
      FINN_N8N_SECRET: S2,
    });
    expect(configuredSurfaces(cfg)).toEqual(["sadeed", "fnn"]);
  });

  it("سرٌّ واحد مكرّر عبر السطحين ⇒ لا تهيئة لأيٍّ منهما (فصل النطاق قيد)", () => {
    const cfg = readN8nConfig({
      SADEED_N8N_BASE_URL: BASE,
      SADEED_N8N_SECRET: S1,
      FINN_N8N_SECRET: S1,
    });
    expect(cfg.secrets).toEqual({ sadeed: null, fnn: null });
    expect(configuredSurfaces(cfg)).toEqual([]);
  });
});

describe("مفاتيح التحكّم تفشل مغلقة", () => {
  it.each([
    ["members", "members"],
    ["ALL", "all"],
    [" all ", "all"],
    ["off", "off"],
    ["", "off"],
    [undefined, "off"],
    ["true", "off"],
    ["1", "off"],
    ["everyone", "off"],
  ])("SADEED_WEB_RESEARCH=%j ⇒ %s", (raw, mode) => {
    expect(parseMode(raw)).toBe(mode);
  });

  it.each([
    ["1", true],
    ["on", true],
    ["TRUE", true],
    [" true ", true],
    ["0", false],
    ["off", false],
    ["", false],
    [undefined, false],
    ["yes", false],
  ])("SADEED_WEB_DISABLED=%j ⇒ %s (صيغة مفتاح الإيقاف القائم)", (raw, disabled) => {
    expect(parseWebDisabled(raw)).toBe(disabled);
  });
});
