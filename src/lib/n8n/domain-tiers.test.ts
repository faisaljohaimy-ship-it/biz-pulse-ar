// @vitest-environment node
/** مرشّح العناوين وجدول المراتب: يُسقط ما لا يصحّ ولا يُصلحه، والمرتبة من الكود لا من الخارج. */
import { describe, expect, it } from "vitest";
import {
  filterUrl,
  isPublicHostname,
  MAX_URL_CHARS,
  tierOfHost,
  type SafeUrl,
} from "./domain-tiers";

describe("filterUrl — يُسقط", () => {
  it.each([
    ["http بلا s", "http://example.com/a"],
    ["ftp", "ftp://example.com/a"],
    ["بلا مخطط", "example.com/a"],
    ["مخطط نسبي", "//example.com/a"],
    ["https بلا شرطتين", "https:example.com/a"],
    ["javascript", "javascript:alert(1)"],
    ["data", "data:text/html,<b>x</b>"],
    ["اسم مستخدم", "https://user@example.com/a"],
    ["اسم مستخدم وكلمة مرور", "https://user:pw@example.com/a"],
    ["كلمة مرور فقط", "https://:pw@example.com/a"],
    ["IPv4", "https://203.0.113.9/a"],
    ["loopback", "https://127.0.0.1/a"],
    ["IPv4 عشري (المحلِّل يطويه)", "https://2130706433/a"],
    ["IPv4 سداسي (المحلِّل يطويه)", "https://0x7f000001/a"],
    ["IPv4 بنقاط ناقصة", "https://127.1/a"],
    ["IPv6", "https://[2001:db8::1]/a"],
    ["IPv6 loopback", "https://[::1]/a"],
    ["localhost", "https://localhost/a"],
    ["اسم أحادي", "https://intranet/a"],
    // أسماء أحادية التسمية ليست في قائمة النطاقات غير العامة: يردّها شرط «نقطة واحدة على الأقل» وحده.
    ["اسم أحادي (خادم بناء)", "https://jenkins/"],
    ["اسم أحادي (تخزين)", "https://nas/admin"],
    ["اسم أحادي (راوتر)", "https://router/"],
    ["نطاق .local", "https://printer.local/a"],
    ["نطاق .internal", "https://svc.internal/a"],
    ["نطاق .lan", "https://nas.lan/a"],
    ["onion", "https://abc.onion/a"],
    ["منفذ غير افتراضي", "https://example.com:8443/a"],
    ["منفذ 80 على https", "https://example.com:80/a"],
    ["فراغ في العنوان", "https://example.com/a b"],
    ["سطر جديد داخل المضيف (المحلِّل يبتلعه)", "https://exa\nmple.com/a"],
    ["tab", "https://example.com/\ta"],
    ["شرطة مائلة عكسية", "https://example.com\\@evil.example/a"],
    ["علامة اقتباس", 'https://example.com/"onmouseover=x'],
    ["قوس زاوية", "https://example.com/<script>"],
    ["حرف عرض صفري", "https://exam\u200bple.com/a"],
    ["نقطة ختامية فارغة التسمية", "https://example..com/a"],
    ["تسمية تبدأ بشرطة", "https://-bad.example.com/a"],
    ["فارغ", ""],
  ])("%s", (_name, raw) => {
    expect(filterUrl(raw)).toBeNull();
  });

  it("ما ليس نصًّا", () => {
    for (const v of [null, undefined, 42, {}, ["https://example.com"], true]) {
      expect(filterUrl(v)).toBeNull();
    }
  });

  it("الطول: 300 يمرّ و301 يُسقط — ولا يُقصّ", () => {
    const base = "https://example.com/";
    const at300 = base + "a".repeat(MAX_URL_CHARS - base.length);
    const at301 = at300 + "a";
    expect(at300).toHaveLength(300);
    expect(filterUrl(at300)?.href).toBe(at300);
    expect(filterUrl(at301)).toBeNull();
  });
});

describe("filterUrl — يقبل ويُعيَّر", () => {
  it("يُنزع www من النطاق ويُخفَّض الحرف وتُزال الشظية", () => {
    const u: SafeUrl | null = filterUrl("https://WWW.Example.COM/Path?a=1&b=2#frag");
    expect(u).toEqual({
      href: "https://www.example.com/Path?a=1&b=2",
      domain: "example.com",
      tier: "unknown",
    });
  });

  it("المنفذ 443 يُطوى ويمرّ", () => {
    expect(filterUrl("https://example.com:443/x")?.href).toBe("https://example.com/x");
  });

  it("نطاق دوليّ يُحوَّل إلى punycode ويمرّ", () => {
    const u = filterUrl("https://münchen.de/a");
    expect(u?.domain).toBe("xn--mnchen-3ya.de");
  });

  it("HTTPS بحروف كبيرة يمرّ", () => {
    expect(filterUrl("HTTPS://example.com/a")?.href).toBe("https://example.com/a");
  });
});

describe("المرتبة تُحسب من اللاحقة على حدّ التسمية", () => {
  it.each([
    ["moi.gov.sa", "official"],
    ["gov.sa", "official"],
    ["www.hcis.gov.sa", "official"],
    ["data.nist.gov", "official"],
    ["docs.github.com", "official"],
    ["supabase.com", "official"],
    ["en.wikipedia.org", "reference"],
    ["developer.mozilla.org", "reference"],
    ["github.com", "community"],
    ["gist.github.com", "community"],
    ["STACKOVERFLOW.COM", "community"],
    ["old.reddit.com", "community"],
    ["random-blog.example.net", "unknown"],
  ])("%s ⇒ %s", (host, tier) => {
    expect(tierOfHost(host)).toBe(tier);
  });

  it("لاحقةٌ متشابهة لا تطابق: evilgov.sa · gov.sa.evil.com · notgithub.com", () => {
    expect(tierOfHost("evilgov.sa")).toBe("unknown");
    expect(tierOfHost("gov.sa.evil.com")).toBe("unknown");
    expect(tierOfHost("notgithub.com")).toBe("unknown");
    expect(tierOfHost("github.com.evil.example")).toBe("unknown");
  });

  it("الأطول لاحقةً يفوز: docs.github.com رسمي بينما github.com مجتمع", () => {
    expect(tierOfHost("docs.github.com")).toBe("official");
    expect(tierOfHost("github.com")).toBe("community");
  });

  it("filterUrl يحسب المرتبة من العنوان المحلَّل لا من أي ادّعاء", () => {
    expect(filterUrl("https://www.moi.gov.sa/x")?.tier).toBe("official");
    expect(filterUrl("https://evilgov.sa/x")?.tier).toBe("unknown");
    // محاولة إخفاء مضيف حقيقي خلف اسم موثوق في المسار أو الاستعلام لا تغيّر شيئًا.
    expect(filterUrl("https://evil.example/gov.sa/x?u=https://gov.sa")?.tier).toBe("unknown");
  });
});

describe("isPublicHostname", () => {
  it.each(["example.com", "a.b.c.example.org", "xn--mnchen-3ya.de", "sub-domain.example.com"])(
    "عامّ: %s",
    (h) => expect(isPublicHostname(h)).toBe(true),
  );
  it.each([
    "",
    "localhost",
    "intranet",
    "jenkins",
    "nas",
    "router",
    "1.2.3.4",
    "::1",
    "[::1]",
    "example.123",
    "a_b.example.com",
    "x.corp",
    "-a.example.com",
    "a-.example.com",
  ])("غير عامّ: %s", (h) => expect(isPublicHostname(h)).toBe(false));
  it("اسمٌ أطول من 253 حرفًا", () => {
    expect(isPublicHostname(`${"a.".repeat(130)}com`)).toBe(false);
  });
});
