import { chromium } from "playwright";
const BASE = "http://127.0.0.1:5199/bs-harness.html";
const VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "desktop-1280", width: 1280, height: 800 },
];
const CASES = [
  { lang: "ar", state: "measured" },
  { lang: "ar", state: "unmeasured" },
  { lang: "en", state: "measured" },
  { lang: "en", state: "unmeasured" },
];
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
let failures = [];
for (const vp of VIEWPORTS) {
  for (const c of CASES) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(`${BASE}?lang=${c.lang}&state=${c.state}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const hOverflow = de.scrollWidth - de.clientWidth;
      const tiny = [...document.querySelectorAll("*")]
        .filter((e) => e.children.length === 0 && (e.textContent || "").trim())
        .map((e) => ({
          t: (e.textContent || "").trim().slice(0, 28),
          fs: parseFloat(getComputedStyle(e).fontSize),
        }))
        .filter((x) => x.fs > 0 && x.fs < 12);
      const conf = [...document.querySelectorAll("div")]
        .filter((d) => /الثقة|Confidence/.test(d.textContent || "") && d.children.length <= 3)
        .slice(-1)[0];
      const txt = document.body.innerText;
      return {
        hOverflow,
        tiny,
        confBlock: conf ? conf.innerText.replace(/\n/g, " | ").slice(0, 120) : null,
        hasUnmeasuredAr: /لم يُقَس/.test(txt),
        hasNotMeasuredEn: /Not measured/.test(txt),
        hasRawTable: /sec_incidents|sec_patrols|sec_permits/.test(txt),
        hasPercent: /\d+\s*[%٪]/.test(txt),
      };
    });
    const id = `${vp.name}/${c.lang}/${c.state}`;
    if (r.hOverflow > 0) failures.push(`${id}: horizontal overflow ${r.hOverflow}px`);
    if (r.tiny.length) failures.push(`${id}: text <12px -> ${JSON.stringify(r.tiny.slice(0, 3))}`);
    if (r.hasRawTable) failures.push(`${id}: RAW TABLE NAMES rendered`);
    if (c.state === "unmeasured" && c.lang === "ar" && !r.hasUnmeasuredAr)
      failures.push(`${id}: missing «لم يُقَس»`);
    if (c.state === "unmeasured" && c.lang === "en" && !r.hasNotMeasuredEn)
      failures.push(`${id}: missing "Not measured"`);
    if (c.state === "unmeasured" && r.hasPercent)
      failures.push(`${id}: percentage shown while unmeasured`);
    console.log(
      `${id.padEnd(34)} overflow=${r.hOverflow} tiny=${r.tiny.length} conf="${r.confBlock}"`,
    );
    await page.close();
  }
}
await browser.close();
console.log("\n=== RESULT ===");
if (failures.length) {
  console.log("FAIL:");
  failures.forEach((f) => console.log("  ✗ " + f));
  process.exit(1);
} else console.log("PASS — 8 combinations measured, zero violations");
