/**
 * حارس درع العلامات الخارجية (أمر المالك ٢٠٢٦/٠٨/٢٠).
 *
 * ثلاث ضمانات تُصان معًا:
 * ① الدرع موجود ومركّب من الجذر — إسقاط استيراده من `__root.tsx` يعيد
 *   شارة «Edit with Lovable» بصمت، ولا يلتقطه tsc ولا أي اختبار آخر.
 * ② توقيعاته تغطي المنصّات المعروفة ونصوص «Edit/Made/Built with» —
 *   تضييقها يجعل الدرع قشرة فارغة تمرّ خضراء.
 * ③ لا سكربت منصّة بناء يدخل المصدر مستقبلًا — الحقنة الوحيدة المقبولة
 *   لأسماء هذه النطاقات هي الدرع نفسه وطبقة CSS القاتلة وهذا الحارس.
 *
 * وسلوك الدرع نفسه مُختبر تشغيليًا أدناه على DOM حقيقي (happy-dom):
 * يزيل الشارات بأنواعها الثلاثة ولا يمسّ محتوى مشروعًا يذكر منصّةً ذكرًا
 * عابرًا — قاعدة «الطفو + الانتماء معًا».
 */
import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { installExternalBadgeShield } from "./badge-shield";

const read = (p: string) => readFileSync(p, "utf8");
const SHIELD = read("src/lib/brand/badge-shield.ts");
const ROOT = read("src/routes/__root.tsx");
const CSS = read("src/styles.css");

describe("① الدرع مركّب من الجذر", () => {
  it("الجذر يستورد الدرع ويثبّته", () => {
    expect(ROOT, "سقط استيراد الدرع من الجذر — تعود شارة المنصّة بصمت").toContain("badge-shield");
    expect(ROOT).toContain("installExternalBadgeShield");
  });

  it("وطبقة CSS القاتلة حاضرة لأول رسم", () => {
    for (const sel of ["#lovable-badge", "[data-lovable-badge]", "cdn.gpteng.co"]) {
      expect(CSS, `سقط المحدِّد ${sel} من طبقة القتل`).toContain(sel);
    }
  });
});

describe("② التوقيعات كاملة", () => {
  it("نطاقات المنصّات المعروفة كلها مغطاة", () => {
    for (const host of ["lovable.dev", "lovable.app", "gptengineer.app", "bolt.new", "v0.dev"]) {
      expect(SHIELD, `نطاق ${host} خرج من قائمة الدرع`).toContain(host);
    }
  });

  it("وصيغ النصوص «Edit/Made/Built with» مغطاة", () => {
    expect(SHIELD).toMatch(/edit\|made\|built/);
  });
});

describe("③ لا سكربت منصّة بناء في المصدر", () => {
  it("لا ملف مصدر يحقن سكربت منصّة — الاستثناء الدرع وطبقته وحارسه", () => {
    // يفحص السطح الذي تُحقن فيه السكربتات تاريخيًا: جذر التطبيق وقشرته.
    for (const file of ["src/routes/__root.tsx", "src/components/app-shell.tsx", "public/sw.js"]) {
      const src = read(file);
      expect(src, `${file} يحقن سكربت منصّة بناء`).not.toMatch(/cdn\.gpteng\.co|gptengineer\.js/);
    }
  });
});

describe("سلوك الدرع على DOM حقيقي", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("يزيل شارة بهوية صريحة فور التثبيت", () => {
    const badge = document.createElement("div");
    badge.id = "lovable-badge";
    badge.textContent = "Edit with Lovable";
    document.body.appendChild(badge);
    const cleanup = installExternalBadgeShield();
    expect(document.getElementById("lovable-badge")).toBeNull();
    cleanup();
  });

  it("يزيل شارة طافية تحمل رابط منصّة ولو تبدّل اسمها", () => {
    const pill = document.createElement("div");
    pill.style.position = "fixed";
    pill.style.zIndex = "9999";
    pill.innerHTML = '<a href="https://lovable.dev/projects/x">Edit</a>';
    document.body.appendChild(pill);
    const cleanup = installExternalBadgeShield();
    expect(document.querySelector('a[href*="lovable.dev"]')).toBeNull();
    cleanup();
  });

  it("ويلتقط الحقن المتأخر عبر المراقب", async () => {
    const cleanup = installExternalBadgeShield();
    const late = document.createElement("div");
    late.className = "gpteng-badge-container";
    late.textContent = "Made with GPT Engineer";
    document.body.appendChild(late);
    // MutationObserver يسلَّم في microtask — ننتظر دورة.
    await new Promise((r) => setTimeout(r, 0));
    expect(document.querySelector(".gpteng-badge-container")).toBeNull();
    cleanup();
  });

  it("ولا يمسّ محتوى مشروعًا داخل الصفحة يذكر منصّةً ذكرًا عابرًا", () => {
    const para = document.createElement("p");
    para.textContent = "تكامل OAuth مع منصّة خارجية للنشر";
    const link = document.createElement("a");
    link.href = "https://example.com/docs";
    link.textContent = "التوثيق";
    para.appendChild(link);
    document.body.appendChild(para);
    const cleanup = installExternalBadgeShield();
    expect(document.body.contains(para)).toBe(true);
    expect(document.body.contains(link)).toBe(true);
    cleanup();
  });
});
