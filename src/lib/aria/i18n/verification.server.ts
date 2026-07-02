// Verification — checks translation completeness and direction integrity.
import type { VerificationResult, Lang } from "./types";
import { missingKeys, translate } from "./translation.server";
import { directionOf } from "./language.server";

export function verifyKeys(required: readonly string[]): VerificationResult {
  const missing = missingKeys(required);
  const rtlSafe = directionOf("ar") === "rtl";
  const ltrSafe = directionOf("en") === "ltr";
  const ok = missing.length === 0 && rtlSafe && ltrSafe;
  return {
    ok,
    missingKeys: missing,
    rtlSafe,
    ltrSafe,
    evidence: [{ kind: "i18n.registry", id: "translation.server", label: "translation registry" }],
  };
}

export function verifyBilingualPair(key: string): VerificationResult {
  const ar = translate(key, "ar" as Lang);
  const en = translate(key, "en" as Lang);
  const ok = !!ar && !!en;
  return {
    ok,
    missingKeys: ok ? [] : [key],
    rtlSafe: true,
    ltrSafe: true,
    evidence: [{ kind: "i18n.pair", id: key }],
  };
}
