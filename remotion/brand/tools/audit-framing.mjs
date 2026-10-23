/**
 * تدقيق تأطير لقطات المونتاج بلا تصيير (R6): يجمّع `film/Montage.tsx` بـesbuild ويستدعي `auditFraming()`؛ يُنهي
 * بخروجٍ غير صفريّ لو دخلت نافذةُ أيّ إطارٍ منطقةً محجوبة (`Source.avoid`)، ويطبع نافذة أوّل كل لقطةٍ وآخرها
 * (بكسلات المصدر). يُشغَّل من مجلّد التصيير الذي فيه node_modules:  node audit-framing.mjs <مسار remotion/brand>
 */
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const brand = resolve(process.argv[2] ?? "brand");
const out = resolve("audit.bundle.mjs");
await build({
  entryPoints: [resolve(brand, "film/Montage.tsx")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: out,
  external: ["react", "react-dom", "remotion"],
  jsx: "automatic",
  logLevel: "error",
});
const { auditFraming } = await import(pathToFileURL(out).href);
const r = auditFraming();
console.log("violations", r.violations.length);
r.violations.slice(0, 20).forEach((v) => console.log(v));
for (const w of r.windows) {
  console.log(
    w.shot,
    w.file,
    w.first.map(Math.round).join(","),
    "->",
    w.last.map(Math.round).join(","),
  );
}
process.exit(r.violations.length ? 1 : 0);
