#!/usr/bin/env node
// Validates preserveAspectRatio values across src/. Fails build on invalid values.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ALIGN = new Set([
  "none",
  "xMinYMin", "xMidYMin", "xMaxYMin",
  "xMinYMid", "xMidYMid", "xMaxYMid",
  "xMinYMax", "xMidYMax", "xMaxYMax",
]);
const MEET_OR_SLICE = new Set(["meet", "slice"]);

const EXTS = new Set([".tsx", ".ts", ".jsx", ".js", ".html", ".svg"]);
const ROOT = "src";

const errors = [];

function isValid(value) {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 0 || parts.length > 2) return false;
  if (!ALIGN.has(parts[0])) return false;
  if (parts[0] === "none" && parts.length > 1) return false;
  if (parts.length === 2 && !MEET_OR_SLICE.has(parts[1])) return false;
  return true;
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full);
    } else if (EXTS.has(extname(entry))) {
      const text = readFileSync(full, "utf8");
      const re = /preserveAspectRatio\s*=\s*["'`]([^"'`]+)["'`]/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        if (!isValid(m[1])) {
          const line = text.slice(0, m.index).split("\n").length;
          errors.push(`${full}:${line}  invalid preserveAspectRatio="${m[1]}"`);
        }
      }
    }
  }
}

walk(ROOT);

if (errors.length) {
  console.error("\n❌ Invalid SVG preserveAspectRatio values found:\n");
  for (const e of errors) console.error("  " + e);
  console.error(
    `\nAllowed align: ${[...ALIGN].join(", ")}\nOptional suffix: meet | slice\n`,
  );
  process.exit(1);
}

console.log("✅ All preserveAspectRatio values are valid.");
