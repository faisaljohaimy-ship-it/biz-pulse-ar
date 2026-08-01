import { normalizeE164 } from "./phone-number";

/**
 * Direct-send owner policy.
 *
 * Destinations are deployment configuration and must never be embedded in
 * source code. Direct FINN sends are deliberately restricted to the
 * registered owner; other recipients use the reviewed approval flow.
 */
export type OwnerRecipients = {
  email: string;
  sms: string;
};

/** Owner-only direct send is the product default. Operators retain a hard
 * kill switch, and missing/invalid values fail closed. Legacy ARIA_* variables
 * remain read-only aliases during migration. */
export function isFinnOwnerDirectSendEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const configured =
    env.FINN_DIRECT_SEND_ENABLED ??
    env.FINN_OUTBOUND_AUTO_APPROVE ??
    env.ARIA_DIRECT_SEND_ENABLED ??
    env.ARIA_OUTBOUND_AUTO_APPROVE;
  if (configured === undefined || configured.trim() === "") return false;
  const normalized = configured.trim().toLowerCase();
  if (normalized === "true") return true;
  return false;
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("FINN owner email is invalid.");
  }
  return email;
}

export function getFinnOwnerRecipients(
  env: Record<string, string | undefined> = process.env,
): OwnerRecipients {
  const email = env.FINN_OWNER_EMAIL?.trim() || env.ARIA_OWNER_EMAIL?.trim();
  const sms = env.FINN_OWNER_SMS?.trim() || env.ARIA_OWNER_SMS?.trim();
  if (!email || !sms) {
    throw new Error("FINN owner recipients are not configured.");
  }
  return {
    email: normalizeEmail(email),
    sms: normalizeE164(sms),
  };
}

export function resolveOwnerEmail(requested?: string): string {
  const owner = getFinnOwnerRecipients().email;
  if (!requested) return owner;
  if (normalizeEmail(requested) !== owner) {
    throw new Error(
      "Direct email is restricted to the registered FINN owner. Use the reviewed approval flow for another recipient.",
    );
  }
  return owner;
}

export function resolveOwnerSms(requested?: string): string {
  const owner = getFinnOwnerRecipients().sms;
  if (!requested) return owner;
  if (normalizeE164(requested) !== owner) {
    throw new Error(
      "Direct SMS is restricted to the registered FINN owner. Use the reviewed approval flow for another recipient.",
    );
  }
  return owner;
}

/** Non-throwing predicates: is the requested recipient the registered owner?
 * Used by outbound tool wrappers to decide between direct-send and the
 * reviewed approval flow. Invalid or unrecognized input returns false. */
export function isOwnerEmail(requested?: string): boolean {
  try {
    const owner = getFinnOwnerRecipients().email;
    if (!requested) return true;
    return normalizeEmail(requested) === owner;
  } catch {
    return false;
  }
}

export function isOwnerSms(requested?: string): boolean {
  try {
    const owner = getFinnOwnerRecipients().sms;
    if (!requested) return true;
    return normalizeE164(requested) === owner;
  } catch {
    return false;
  }
}

function normalizedIntent(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function hasExplicitOutboundIntent(text: string, channel: "email" | "sms"): boolean {
  const value = normalizedIntent(text);
  if (!value) return false;

  const reportedInstruction =
    /(?:المستند|الملف|النص|المحتوى|الاقتباس|document|file|text|quote)\s+(?:يقول|يطلب|يتضمن|ورد|says|asks|contains)/i;
  const explicitOverride = /(?:نفذ|طبق|قم بذلك|proceed|do it|execute it)/i;
  if (reportedInstruction.test(value) && !explicitOverride.test(value)) return false;

  const negatedInstruction =
    /(?:^|\s)(?:لا|لاتقم ب|لا تقم ب|عدم|dont|don't|do not|never)\s+(?:[اأإآ]رسل(?:ي)?|ابعث(?:ي)?|send|dispatch)(?:\s|$)/i;
  if (negatedInstruction.test(value)) return false;

  const sendVerb = /(?:^|\s)(?:[اأإآ]رسل(?:ي)?|ابعث(?:ي)?|send|dispatch)(?:\s|$)/i;
  const channelWord =
    channel === "email"
      ? /(?:بريد|[اإآ]يميل|email|e-mail|mail)/i
      : /(?:رساله نصيه|رسالة نصية|sms|text message|اس ام اس)/i;

  return sendVerb.test(value) && channelWord.test(value);
}

export function assertExplicitOwnerDirectSend(input: {
  intentText: string;
  channel: "email" | "sms";
  recipient: string;
}): void {
  if (!hasExplicitOutboundIntent(input.intentText, input.channel)) {
    throw new Error(
      input.channel === "email"
        ? "Direct email requires an explicit email send instruction in the current user message."
        : "Direct SMS requires an explicit SMS send instruction in the current user message.",
    );
  }

  if (input.channel === "email") resolveOwnerEmail(input.recipient);
  else resolveOwnerSms(input.recipient);
}
