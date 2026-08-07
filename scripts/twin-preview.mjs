/**
 * معاينة مشهد التوأم — تُصيّر المكوّن الحقيقي وتصوّره في متصفّح حقيقي.
 *
 * ليست اختبارًا بل أداة نظر: «صُيِّر» ليست «صحيح»، والحكم على مشهدٍ
 * بصريّ لا يُنتزع من شجرة DOM. تُخرج ثماني لقطات (أربع مناطق × وضعان).
 *
 * التشغيل: node scripts/twin-preview.mjs <out-dir>
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const outDir = process.argv[2] ?? ".twin-preview";
mkdirSync(outDir, { recursive: true });

// نبني نسخة قابلة للتشغيل في node من المكوّن نفسه — لا نسخة يدوية منه.
const entry = join(outDir, "entry.jsx");
writeFileSync(
  entry,
  `import { renderToStaticMarkup } from "react-dom/server";
import { RegionTwinScene } from "@/components/sec/RegionTwinScene";
import { REGIONS } from "@/lib/regions";
const tones = ["ok", "warn", "danger", "ok", "ok", "warn", "ok", "danger", "ok", "ok"];
export function render() {
  return REGIONS.map((r) => ({
    id: r.id,
    label: r.shortAr,
    html: renderToStaticMarkup(
      <RegionTwinScene
        regionId={r.id}
        assets={tones.map((t, i) => ({ id: r.id + i, labelAr: "أصل " + (i + 1), tone: t }))}
      />,
    ),
  }));
}
`,
);

writeFileSync(
  "vite.twin-preview.config.mjs",
  `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve("src") } },
  ssr: { external: ["react", "react-dom"] },
  build: {
    ssr: true,
    minify: false,
    rollupOptions: { external: [/^react($|\\/)/, /^react-dom($|\\/)/], output: { format: "esm" } },
  },
});
`,
);

execSync(
  `npx vite build --config vite.twin-preview.config.mjs --ssr ${entry} --outDir ${outDir}/dist --logLevel error`,
  { stdio: "inherit" },
);

const { render } = await import(pathToFileURL(resolve(outDir, "dist", "entry.js")).href);
const scenes = render();

// نستخرج رموز المشهد من styles.css كما هي — لا نعيد كتابتها هنا، وإلّا
// صوّرنا لوحةً غير التي تُشحن.
const css = readFileSync("src/styles.css", "utf8");
const TONE_DARK_ANCHOR = "  --tone-cyan: #22d3ee;";
const TONE_LIGHT_ANCHOR = "  --tone-cyan: #0e7490;";
/** من مطلع الكتلة إلى قوس إغلاقها. */
const grab = (anchor) => {
  const at = css.indexOf(anchor);
  if (at === -1) throw new Error(`لم يُعثر على الكتلة: ${anchor}`);
  const from = anchor.includes("{") ? css.indexOf("{", at) + 1 : at;
  return css.slice(from, css.indexOf("\n}", from));
};
// رموز المشهد **ورموز اللهجة معًا**. أوّل نسخة من هذه الأداة حقنت
// `--twin-*` وحدها، فسقطت `--tone-amber`/`--tone-emerald`/`--tone-rose`
// إلى غير معرَّف — فظهرت الشعلة ومرابط الحالة **سوداء**، وكِدت أُصلح
// المشهد من عطلٍ في المصوِّر لا فيه. اللقطة التي لا تُحمّل كل ما تُحمّله
// الصفحة تصوّر شيئًا آخر.
const darkVars = grab(":root {\n  --twin-sky-1") + grab(TONE_DARK_ANCHOR);
const lightVars = grab("html.light {\n  --twin-sky-1") + grab(TONE_LIGHT_ANCHOR);

const page = (mode) => `<!doctype html><html class="${mode}" dir="rtl"><head><meta charset="utf-8">
<style>
:root {${darkVars}}
html.light {${lightVars}}
body { margin:0; background:${mode === "dark" ? "#041e2c" : "#ffffff"}; font-family: system-ui; }
.nx-twin-scene { display:block; inline-size:100%; aspect-ratio:1200/560; border-radius:.75rem; }
figure { margin:0 0 18px; }
figcaption { color:${mode === "dark" ? "#e9f6ff" : "#0b1526"}; font-size:15px; padding:6px 4px; }
</style></head><body>
${scenes.map((s) => `<figure id="fig-${s.id}"><figcaption>${s.label}</figcaption>${s.html}</figure>`).join("")}
</body></html>`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const mode of ["dark", "light"]) {
  const p = await browser.newPage({ viewport: { width: 1240, height: 700 } });
  await p.setContent(page(mode));
  for (const s of scenes) {
    await p.locator(`#fig-${s.id}`).screenshot({ path: join(outDir, `${s.id}-${mode}.png`) });
  }
  await p.close();
}
await browser.close();
console.log(`لقطات في ${outDir}/ — ${scenes.length * 2} صورة`);
