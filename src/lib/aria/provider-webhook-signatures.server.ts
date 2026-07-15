function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + 0x8000)));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function constantTimeTextEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

async function sign(
  algorithm: "SHA-1" | "SHA-256",
  secret: Uint8Array,
  content: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    asArrayBuffer(secret),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(content));
  return bytesToBase64(new Uint8Array(digest));
}

/** Twilio form signature: exact callback URL + alphabetically sorted POST fields. */
export async function verifyTwilioSignature(input: {
  authToken: string;
  callbackUrl: string;
  params: URLSearchParams;
  signature: string;
}): Promise<boolean> {
  const keys = Array.from(new Set(input.params.keys())).sort();
  let signed = input.callbackUrl;
  for (const key of keys) {
    for (const value of input.params.getAll(key)) signed += `${key}${value}`;
  }
  const expected = await sign("SHA-1", new TextEncoder().encode(input.authToken), signed);
  return constantTimeTextEqual(expected, input.signature.trim());
}

/**
 * Resend uses Svix signatures: HMAC-SHA256("id.timestamp.rawBody").
 * Multiple `v1,` signatures may be present during secret rotation.
 */
export async function verifyResendSignature(input: {
  webhookSecret: string;
  messageId: string;
  timestamp: string;
  signatureHeader: string;
  rawBody: string;
  nowMs?: number;
  toleranceSeconds?: number;
}): Promise<boolean> {
  const timestampSeconds = Number(input.timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  const nowMs = input.nowMs ?? Date.now();
  const tolerance = (input.toleranceSeconds ?? 300) * 1_000;
  if (Math.abs(nowMs - timestampSeconds * 1_000) > tolerance) return false;

  const encodedSecret = input.webhookSecret.startsWith("whsec_")
    ? input.webhookSecret.slice(6)
    : input.webhookSecret;
  let secret: Uint8Array;
  try {
    secret = base64ToBytes(encodedSecret);
  } catch {
    return false;
  }
  if (secret.length < 16) return false;

  const content = `${input.messageId}.${input.timestamp}.${input.rawBody}`;
  const expected = await sign("SHA-256", secret, content);
  const signatures = input.signatureHeader
    .trim()
    .split(/\s+/)
    .map((entry) => entry.split(",", 2))
    .filter(([version, value]) => version === "v1" && Boolean(value))
    .map(([, value]) => value!);
  return signatures.some((candidate) => constantTimeTextEqual(expected, candidate));
}
