#!/usr/bin/env node
/**
 * NEXIOS secret-leak guard (production-readiness §P3).
 *
 * Fails the build if the git-tracked tree contains anything that must never
 * ship: a real `.env` file, a database dump, or a hard-coded credential.
 * `.env.example` and documentation placeholders are allowed. Deterministic,
 * dependency-free, and safe to run in CI before every push.
 *
 *   node scripts/check-secrets.mjs   → exit 0 (clean) or 1 (leak found)
 */
import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const tracked = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

const findings = [];

// 1) Forbidden filenames — real env files and database DUMPS must never be
//    committed. Legitimate DDL migrations (supabase/migrations/**, seeds,
//    preflight) are ALLOWED; only a name that screams "dump/backup" is
//    forbidden by name. `.env.example` / `.env.sample` are the only allowed
//    `.env*`.
const FORBIDDEN_NAME =
  /(^|\/)\.env(\.(local|development|production|staging|test))?$|\.dump$|(^|\/)[^/]*(dump|backup)[^/]*\.(sql|gz|tar|zip)$/i;
const ALLOWED_ENV = /(^|\/)\.env\.(example|sample|template)$/i;

// A committed `.sql` is only a leak if its CONTENT is a real database dump
// (schema + data from pg_dump), not a hand-written migration.
const SQL_DUMP_SIGNATURE = /-- PostgreSQL database dump|^COPY [^\n]+ FROM stdin;|\bpg_dump\b/m;

// 2) High-confidence secret content patterns (avoid false positives — only
//    unambiguous credential shapes, not generic words).
const SECRET_CONTENT = [
  { re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, label: "private key block" },
  { re: /\bsk-[A-Za-z0-9]{32,}\b/, label: "OpenAI-style secret key (sk-…)" },
  { re: /\bghp_[A-Za-z0-9]{36}\b/, label: "GitHub personal access token (ghp_…)" },
  { re: /\bAKIA[0-9A-Z]{16}\b/, label: "AWS access key id (AKIA…)" },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, label: "Slack token (xox…)" },
  {
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
    label: "JWT / service-role-style token",
  },
];

// Scan only reasonably-sized text files; skip lockfiles, this guard itself,
// binary/asset trees, and doc placeholders directory.
const SKIP = /^(package-lock\.json|bun\.lock|scripts\/check-secrets\.mjs)$|\.(png|jpg|jpeg|webp|mp4|woff2?|ico|pdf|ttf)$/i;

for (const file of tracked) {
  if (FORBIDDEN_NAME.test(file) && !ALLOWED_ENV.test(file)) {
    findings.push(`forbidden file committed: ${file}`);
    continue;
  }
  if (SKIP.test(file)) continue;
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    continue;
  }
  if (size > 512 * 1024) continue; // skip large/binary blobs
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const { re, label } of SECRET_CONTENT) {
    if (re.test(text)) findings.push(`${label} in ${file}`);
  }
  if (/\.sql$/i.test(file) && SQL_DUMP_SIGNATURE.test(text)) {
    findings.push(`database dump content in ${file}`);
  }
}

if (findings.length) {
  console.error("✗ secret-leak guard FAILED — the tree must never contain secrets:");
  for (const f of findings) console.error(`  · ${f}`);
  console.error("\nRemove the secret, rotate it (assume it is compromised), and use .env.example.");
  process.exit(1);
}

console.log(`✓ secret-leak guard: ${tracked.length} tracked files clean (no .env, no dump, no key).`);
