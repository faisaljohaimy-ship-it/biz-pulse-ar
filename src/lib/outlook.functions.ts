import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_outlook";

type SendInput = {
  to: string;
  subject: string;
  html: string;
  cc?: string;
};

export const sendOutlookReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SendInput) => {
    if (!d?.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.to)) throw new Error("Invalid recipient");
    if (!d.subject || d.subject.length > 300) throw new Error("Invalid subject");
    if (!d.html || d.html.length > 200000) throw new Error("Invalid body");
    return d;
  })
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const outlookKey = process.env.MICROSOFT_OUTLOOK_API_KEY;
    if (!lovableKey || !outlookKey) throw new Error("Outlook connector not configured");

    const message: Record<string, unknown> = {
      subject: data.subject,
      body: { contentType: "HTML", content: data.html },
      toRecipients: [{ emailAddress: { address: data.to } }],
    };
    if (data.cc) {
      message.ccRecipients = [{ emailAddress: { address: data.cc } }];
    }

    const res = await fetch(`${GATEWAY_URL}/me/sendMail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": outlookKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, saveToSentItems: true }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Outlook send failed (${res.status}): ${txt.slice(0, 300)}`);
    }
    return { ok: true, sentAt: new Date().toISOString() };
  });

export const listOutlookInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const outlookKey = process.env.MICROSOFT_OUTLOOK_API_KEY;
    if (!lovableKey || !outlookKey) throw new Error("Outlook connector not configured");

    const res = await fetch(
      `${GATEWAY_URL}/me/messages?$top=10&$select=id,subject,from,receivedDateTime,isRead,bodyPreview&$orderby=receivedDateTime desc`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": outlookKey,
        },
      },
    );
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Outlook inbox failed (${res.status}): ${txt.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      value?: Array<{
        id: string;
        subject: string;
        from?: { emailAddress?: { name?: string; address?: string } };
        receivedDateTime: string;
        isRead: boolean;
        bodyPreview: string;
      }>;
    };
    return { messages: json.value ?? [] };
  });
