#!/usr/bin/env node
/**
 * NEXIOS secret-leak guard (production-readiness §P3).
 *
 * Fails the build if the git-tracked tree contains anything that must never
 * ship: a real `.env` file, a database dump, or a hard-coded credential.
 * `.env.example`/`.sample`/`.template` and legitimate SQL migrations are
 * allowed. Deterministic, dependency-free, safe to run in CI before push.
 *
 * The detection logic is exported as pure functions (unit-tested in
 * src/lib/security/secret-scan.test.ts); the CLI part only runs when the file
 * is executed directly.
 *
 *   node scripts/check-secrets.mjs   → exit 0 (clean) or 1 (leak found)
 */
import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Forbidden filenames — real env files and database DUMPS/backups. Legitimate
// DDL migrations (supabase/migrations/**, seeds, preflight) are allowed; only
// a name that screams "dump/backup" is forbidden by name.
const FORBIDDEN_NAME =
  /(^|\/)\.env(\.(local|development|production|staging|test))?$|\.dump$|(^|\/)[^/]*(dump|backup)[^/]*\.(sql|gz|tar|zip)$/i;
const ALLOWED_ENV = /(^|\/)\.env\.(example|sample|template)$/i;

// A committed `.sql` is only a leak if its CONTENT is a real database dump
// (schema + data from pg_dump), not a hand-written migration.
const SQL_DUMP_SIGNATURE = /-- PostgreSQL database dump|^COPY [^\n]+ FROM stdin;|\bpg_dump\b/m;

// High-confidence credential shapes only — never generic words.
export const SECRET_CONTENT = [
  { re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, label: "private key block" },
  { re: /\bsk-[A-Za-z0-9]{32,}\b/, label: "OpenAI-style secret key (sk-…)" },
  { re: /\b(?:sk|rk)_live_[0-9A-Za-z]{20,}\b/, label: "Stripe live secret key" },
  { re: /\bghp_[A-Za-z0-9]{36}\b/, label: "GitHub personal access token (ghp_…)" },
  { re: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/, label: "GitHub fine-grained PAT" },
  { re: /\bAKIA[0-9A-Z]{16}\b/, label: "AWS access key id (AKIA…)" },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/, label: "Google API key (AIza…)" },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, label: "Slack token (xox…)" },
  { re: /-----BEGIN PRIVATE KEY-----[\s\S]*?service_account/i, label: "GCP service-account key" },
  {
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
    label: "JWT / service-role-style token",
  },
];

// Skip lockfiles, this guard, its own test, and binary/asset blobs.
const SKIP =
  /(^|\/)(package-lock\.json|bun\.lock)$|(^|\/)scripts\/check-secrets\.mjs$|(^|\/)secret-scan\.test\.ts$|\.(png|jpg|jpeg|webp|mp4|woff2?|ico|pdf|ttf)$/i;

/** True if this path must never be committed (real .env / dump / backup). */
export function isForbiddenFile(file) {
  return FORBIDDEN_NAME.test(file) && !ALLOWED_ENV.test(file);
}

/** Return the list of leak labels found in a file's text (empty = clean). */
export function scanText(file, text) {
  const hits = [];
  for (const { re, label } of SECRET_CONTENT) if (re.test(text)) hits.push(label);
  if (/\.sql$/i.test(file) && SQL_DUMP_SIGNATURE.test(text)) hits.push("database dump content");
  return hits;
}

/** Whether the scanner should skip a path for content scanning. */
export function shouldSkipContent(file) {
  return SKIP.test(file);
}

function runCli() {
  const tracked = execSync("git ls-files", { encoding: "utf8" })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const findings = [];
  for (const file of tracked) {
    if (isForbiddenFile(file)) {
      findings.push(`forbidden file committed: ${file}`);
      continue;
    }
    if (shouldSkipContent(file)) continue;
    let size = 0;
    try {
      size = statSync(file).size;
    } catch {
      continue;
    }
    if (size > 512 * 1024) continue;
    let text = "";
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const label of scanText(file, text)) findings.push(`${label} in ${file}`);
  }
  if (findings.length) {
    console.error("✗ secret-leak guard FAILED — the tree must never contain secrets:");
    for (const f of findings) console.error(`  · ${f}`);
    console.error(
      "\nRemove the secret, rotate it (assume it is compromised), and use .env.example.",
    );
    process.exit(1);
  }
  console.log(
    `✓ secret-leak guard: ${tracked.length} tracked files clean (no .env, no dump, no key).`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
