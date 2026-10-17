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
const candidates = [
  ["SADEED_BUILD_SHA", env.SADEED_BUILD_SHA],
  ["GITHUB_SHA", env.GITHUB_SHA],
  ["CF_PAGES_COMMIT_SHA", env.CF_PAGES_COMMIT_SHA],
  ["VERCEL_GIT_COMMIT_SHA", env.VERCEL_GIT_COMMIT_SHA],
  ["COMMIT_SHA", env.COMMIT_SHA],
  ["git", git("rev-parse HEAD")],
];
const [source, sha] = candidates.find(([, v]) => v && /^[0-9a-f]{7,40}$/i.test(v)) ?? [
  "none",
  "unknown",
];
const ref =
  env.SADEED_BUILD_REF ||
  env.GITHUB_REF_NAME ||
  env.CF_PAGES_BRANCH ||
  env.VERCEL_GIT_COMMIT_REF ||
  git("rev-parse --abbrev-ref HEAD") ||
  "unknown";
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
