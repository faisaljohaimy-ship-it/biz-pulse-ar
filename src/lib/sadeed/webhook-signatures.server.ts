function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index++) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

async function hmac(
  algorithm: "SHA-1" | "SHA-256",
  secret: Uint8Array,
  value: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(secret).buffer,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(signature));
}

export async function verifyResendWebhook(input: {
  rawBody: string;
  webhookSecret: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  nowMs?: number;
  toleranceSeconds?: number;
}): Promise<boolean> {
  const timestamp = Number(input.svixTimestamp);
  const toleranceSeconds = input.toleranceSeconds ?? 300;
  if (
    !input.svixId ||
    !Number.isInteger(timestamp) ||
    Math.abs((input.nowMs ?? Date.now()) - timestamp * 1_000) > toleranceSeconds * 1_000
  ) {
    return false;
  }
  const encodedSecret = input.webhookSecret.trim().replace(/^whsec_/, "");
  let secret: Uint8Array;
  try {
    secret = base64ToBytes(encodedSecret);
  } catch {
    return false;
  }
  if (secret.length < 16) return false;
  const expected = await hmac(
    "SHA-256",
    secret,
    `${input.svixId}.${input.svixTimestamp}.${input.rawBody}`,
  );
  return input.svixSignature
    .trim()
    .split(/\s+/)
    .some((candidate) => {
      const [version, signature] = candidate.split(",", 2);
      return (
        version === "v1" && typeof signature === "string" && constantTimeEqual(signature, expected)
      );
    });
}

export async function verifyTwilioWebhook(input: {
  publicUrl: string;
  rawFormBody: string;
  signature: string;
  authToken: string;
}): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(input.publicUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || !input.signature || !input.authToken) return false;

  const entries = [...new URLSearchParams(input.rawFormBody).entries()].sort(
    ([leftName, leftValue], [rightName, rightValue]) => {
      if (leftName !== rightName) return leftName < rightName ? -1 : 1;
      if (leftValue === rightValue) return 0;
      return leftValue < rightValue ? -1 : 1;
    },
  );
  let signed = input.publicUrl;
  for (const [name, value] of entries) signed += `${name}${value}`;
  const expected = await hmac("SHA-1", new TextEncoder().encode(input.authToken), signed);
  return constantTimeEqual(input.signature.trim(), expected);
}
