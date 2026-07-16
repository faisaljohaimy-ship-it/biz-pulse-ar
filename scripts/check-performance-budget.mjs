import { readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ROOT = join(process.cwd(), ".output", "public");
const MiB = 1024 * 1024;

const budgets = {
  totalOutput: 52 * MiB,
  totalJavaScript: 10 * MiB,
  largestJavaScript: 1.4 * MiB,
  totalCss: 0.6 * MiB,
  largestMedia: 14 * MiB,
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.isFile()) files.push({ absolute, size: (await stat(absolute)).size });
  }
  return files;
}

function mib(bytes) {
  return `${(bytes / MiB).toFixed(2)} MiB`;
}

function assertBudget(label, actual, limit, offenders = []) {
  const line = `${label}: ${mib(actual)} / ${mib(limit)}`;
  if (actual <= limit) {
    console.log(`✓ ${line}`);
    return;
  }
  console.error(`✗ ${line}`);
  for (const offender of offenders.slice(0, 8)) console.error(`  - ${offender}`);
  process.exitCode = 1;
}

let files;
try {
  files = await walk(ROOT);
} catch (error) {
  console.error("Performance budget requires a completed production build in .output/public.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const js = files.filter((file) => [".js", ".mjs"].includes(extname(file.absolute)));
const css = files.filter((file) => extname(file.absolute) === ".css");
const media = files.filter((file) =>
  [".mp4", ".webm", ".mov", ".mp3", ".wav", ".ogg"].includes(extname(file.absolute)),
);
const total = files.reduce((sum, file) => sum + file.size, 0);
const jsTotal = js.reduce((sum, file) => sum + file.size, 0);
const cssTotal = css.reduce((sum, file) => sum + file.size, 0);
const largestJs = [...js].sort((a, b) => b.size - a.size)[0];
const largestMedia = [...media].sort((a, b) => b.size - a.size)[0];
const describe = (file) => `${mib(file.size)} ${relative(ROOT, file.absolute)}`;

console.log("NEXIOS production performance budget");
assertBudget("Total public output", total, budgets.totalOutput);
assertBudget("Total JavaScript", jsTotal, budgets.totalJavaScript);
assertBudget(
  "Largest JavaScript asset",
  largestJs?.size ?? 0,
  budgets.largestJavaScript,
  [...js].sort((a, b) => b.size - a.size).map(describe),
);
assertBudget("Total CSS", cssTotal, budgets.totalCss);
assertBudget(
  "Largest media asset",
  largestMedia?.size ?? 0,
  budgets.largestMedia,
  [...media].sort((a, b) => b.size - a.size).map(describe),
);

if (process.exitCode) {
  console.error(
    "Performance regression blocked. Optimize assets or make a reviewed budget change.",
  );
} else {
  console.log(`✓ ${files.length} emitted files remain inside every release ceiling.`);
}
