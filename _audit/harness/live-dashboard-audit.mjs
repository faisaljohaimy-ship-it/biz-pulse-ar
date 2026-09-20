import { chromium } from "playwright";
const B = "http://127.0.0.1:5199/lb-harness.html";
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
let fail = [];
for (const vp of [
  { n: "390", w: 390, h: 844, t: true },
  { n: "1280", w: 1280, h: 800, t: false },
])
  for (const lang of ["ar", "en"])
    for (const state of ["measured", "unmeasured", "zero"]) {
      const p = await b.newPage({
        viewport: { width: vp.w, height: vp.h },
        hasTouch: vp.t,
        isMobile: vp.t,
        deviceScaleFactor: vp.t ? 3 : 1,
      });
      await p.goto(`${B}?lang=${lang}&state=${state}`, { waitUntil: "networkidle" });
      await p.waitForTimeout(600);
      const r = await p.evaluate(() => {
        // **تُقرأ عقدةُ الثقة نفسها** لا نافذةٌ نصّية حولها: النافذة تلتقط
        // قيمةَ الشريحة المجاورة (99%) فتُبلّغ عن نسبةٍ ليست الثقة — عطلٌ
        // في أداة الفحص يُقرأ عطلًا في المنتج.
        const label = [...document.querySelectorAll("div")].find((d) =>
          /^confidence$/i.test((d.textContent || "").trim()),
        );
        const node = label?.nextElementSibling;
        const t = document.body.innerText;
        return {
          shown: (node?.textContent || "").trim(),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          hasDash: /(^|\s)—(\s|$)/.test(t),
          hasNaN: /NaN/.test(t),
        };
      });
      const id = `${vp.n}/${lang}/${state}`;
      if (r.overflow > 0) fail.push(`${id}: overflow ${r.overflow}`);
      if (r.hasNaN) fail.push(`${id}: NaN rendered`);
      if (state === "unmeasured") {
        if (r.hasDash) fail.push(`${id}: DASH rendered for absence`);
        const want = lang === "ar" ? "لم يُقَس" : "Not measured";
        if (!r.shown.includes(want)) fail.push(`${id}: missing "${want}" -> ${r.shown}`);
        if (/\d+%/.test(r.shown)) fail.push(`${id}: PERCENT shown while unmeasured`);
      }
      if (state === "zero" && !r.shown.includes("0%"))
        fail.push(`${id}: zero not shown as 0% -> ${r.shown}`);
      if (state === "measured" && !r.shown.includes("87%"))
        fail.push(`${id}: measured not shown -> ${r.shown}`);
      console.log(`${id.padEnd(22)} → ${r.shown}`);
      await p.close();
    }
await b.close();
console.log("\n=== RESULT ===");
if (fail.length) {
  fail.forEach((f) => console.log("  ✗ " + f));
  process.exit(1);
}
console.log("PASS — 12 combinations, zero violations");
