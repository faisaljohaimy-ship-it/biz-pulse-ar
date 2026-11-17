#!/usr/bin/env node
/**
 * معرّف البناء — `public/build-info.json`.
 *
 * لماذا: لم يكن في المنتج أيّ ختمٍ يقول أيَّ commit يخدمه الموقع، ففحص الإنتاج
 * كان يشهد «أخضر» على بناءٍ قد يسبق الدفعة (درس ٢٠٢٦/٠٩/١٩: المزامنة ليست نشرًا).
 * يُكتب قبل كل `npm run build` (‏`prebuild`) ويُقدَّم ملفًّا ثابتًا على
 * `/build-info.json`، ويُدمج في `/api/public/health` وقت البناء.
 *
 * المصدر بالترتيب: متغيّر بيئةٍ صريح، ثم ما تعطيه منصّة البناء، ثم `git`.
 * الغياب يُكتب «unknown» صراحةً — لا رقمًا مختلَقًا (المادة ٢٧).
 * الملفّ خارج git (‏.gitignore) لأنه يتغيّر مع كل بناء.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function git(args) {
  try {
    return execSync(`git ${args}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const env = process.env;
// A Vercel build can inherit GitHub metadata from an unrelated process.
// Its platform-owned commit must win to avoid publishing a misleading SHA.
const isVercelBuild = env.VERCEL === "1" || env.VERCEL === "true";
const platformCandidates = isVercelBuild
  ? [
      ["VERCEL_GIT_COMMIT_SHA", env.VERCEL_GIT_COMMIT_SHA],
      ["GITHUB_SHA", env.GITHUB_SHA],
      ["CF_PAGES_COMMIT_SHA", env.CF_PAGES_COMMIT_SHA],
    ]
  : [
      ["GITHUB_SHA", env.GITHUB_SHA],
      ["CF_PAGES_COMMIT_SHA", env.CF_PAGES_COMMIT_SHA],
      ["VERCEL_GIT_COMMIT_SHA", env.VERCEL_GIT_COMMIT_SHA],
    ];
const candidates = [
  ["SADEED_BUILD_SHA", env.SADEED_BUILD_SHA],
  ...platformCandidates,
  ["COMMIT_SHA", env.COMMIT_SHA],
  ["git", git("rev-parse HEAD")],
];
const [source, sha] = candidates.find(([, v]) => v && /^[0-9a-f]{7,40}$/i.test(v)) ?? [
  "none",
  "unknown",
];
// A ref override belongs to its explicitly overridden SHA. Without the
// corresponding SHA, a stale ref must not mislabel a platform-identified build.
const matchingRefs = {
  SADEED_BUILD_SHA: env.SADEED_BUILD_REF,
  VERCEL_GIT_COMMIT_SHA: env.VERCEL_GIT_COMMIT_REF,
  GITHUB_SHA: env.GITHUB_REF_NAME,
  CF_PAGES_COMMIT_SHA: env.CF_PAGES_BRANCH,
};
const refValue = source === "git" ? git("rev-parse --abbrev-ref HEAD") : matchingRefs[source];
const ref = refValue?.trim() || "unknown";
// «معدَّل» يعني تغييرًا في ملفٍّ متعقَّب؛ الملفّات غير المتعقَّبة (مسودّة، ناتج أداة)
// لا تجعل البناء مختلفًا عن الـcommit (ملاحظة الحارس على 5fd7fd122).
const porcelain = source === "git" ? git("status --porcelain --untracked-files=no") : "";

const info = {
  sha,
  short: sha === "unknown" ? "unknown" : sha.slice(0, 9),
  ref,
  source,
  dirty: source === "git" ? porcelain.length > 0 : null,
  builtAt: new Date().toISOString(),
};

const out = resolve(process.cwd(), "public", "build-info.json");
mkdirSync(resolve(process.cwd(), "public"), { recursive: true });
writeFileSync(out, JSON.stringify(info, null, 2) + "\n");
console.log(`build-info: ${info.short} (${info.ref}, source=${info.source}) → ${out}`);
