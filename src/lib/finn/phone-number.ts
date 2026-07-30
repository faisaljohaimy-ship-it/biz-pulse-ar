/** Normalize and validate a phone number using the international E.164 shape. */
export function normalizeE164(value: string): string {
  const raw = value.trim().replace(/[\s().-]/g, "");
  const compact = raw.startsWith("00") ? `+${raw.slice(2)}` : raw;
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) {
    throw new Error("Phone number must use international E.164 format, for example +9665XXXXXXXX.");
  }
  return compact;
}
