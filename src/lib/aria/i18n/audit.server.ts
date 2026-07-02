// Append-only audit log of language switches.
import type { I18nAuditEntry, Lang, LanguagePreference } from "./types";
import { assertLang } from "./contracts";

const LOG: I18nAuditEntry[] = [];
const MAX = 500;

export function recordSwitch(
  userId: string, from: Lang | null, to: Lang,
  source: LanguagePreference["source"] = "explicit",
): I18nAuditEntry {
  assertLang(to);
  const entry: I18nAuditEntry = { at: Date.now(), userId, from, to, source };
  LOG.push(entry);
  if (LOG.length > MAX) LOG.shift();
  return entry;
}

export function auditHistory(userId?: string, n = 50): readonly I18nAuditEntry[] {
  const src = userId ? LOG.filter((e) => e.userId === userId) : LOG;
  return src.slice(-n);
}

export function clearAudit(): void { LOG.length = 0; }
