import { httpJson } from "@/lib/api/http.server";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber?: string;
  messagingServiceSid?: string;
  statusCallbackUrl?: string;
}

export interface TwilioMessageInput {
  to: string;
  body: string;
  mediaUrls?: readonly string[];
}

export interface TwilioMessageResult {
  sid: string;
  status?: string;
}

export interface ResendEmailInput {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}

export function normalizeE164(value: string): string {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) {
    throw new Error("Phone number must use international E.164 format, for example +9665XXXXXXXX.");
  }
  return compact;
}

export function resolveTwilioConfig(
  env: Record<string, string | undefined> = process.env,
): TwilioConfig | null {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = env.TWILIO_FROM_NUMBER?.trim();
  const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  const statusCallbackUrl = env.TWILIO_STATUS_CALLBACK_URL?.trim();
  if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) return null;
  if (statusCallbackUrl) {
    const parsed = new URL(statusCallbackUrl);
    if (parsed.protocol !== "https:") {
      throw new Error("TWILIO_STATUS_CALLBACK_URL must use HTTPS.");
    }
  }
  return { accountSid, authToken, fromNumber, messagingServiceSid, statusCallbackUrl };
}

export function buildTwilioMessageForm(
  input: TwilioMessageInput,
  config: TwilioConfig,
): URLSearchParams {
  const body = input.body.trim();
  if (!body || body.length > 1600) {
    throw new Error("SMS body must contain between 1 and 1,600 characters.");
  }
  const mediaUrls = input.mediaUrls ?? [];
  if (mediaUrls.length > 10) throw new Error("Twilio accepts at most 10 media URLs per message.");

  const form = new URLSearchParams();
  form.set("To", normalizeE164(input.to));
  form.set("Body", body);
  if (config.messagingServiceSid) form.set("MessagingServiceSid", config.messagingServiceSid);
  else if (config.fromNumber) form.set("From", normalizeE164(config.fromNumber));
  else throw new Error("Twilio requires TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID.");
  if (config.statusCallbackUrl) form.set("StatusCallback", config.statusCallbackUrl);

  for (const rawUrl of mediaUrls) {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") throw new Error("SMS media URLs must use HTTPS.");
    form.append("MediaUrl", url.toString());
  }
  return form;
}

function basicAuth(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

export async function sendTwilioSms(
  input: TwilioMessageInput,
  config: TwilioConfig,
): Promise<TwilioMessageResult> {
  const form = buildTwilioMessageForm(input, config);
  return httpJson<TwilioMessageResult>(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: basicAuth(config.accountSid, config.authToken),
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: form.toString(),
      retries: 0,
      timeoutMs: 15_000,
      label: "ARIA Twilio Messages API",
    },
  );
}

export async function sendResendEmail(
  apiKey: string,
  input: ResendEmailInput,
): Promise<{ id: string }> {
  return httpJson<{ id: string }>("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      ...(input.cc ? { cc: [input.cc] } : {}),
      subject: input.subject,
      html: input.html,
    }),
    retries: 0,
    timeoutMs: 15_000,
    label: "ARIA Resend Emails API",
  });
}
