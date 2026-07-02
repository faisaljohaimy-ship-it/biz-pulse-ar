import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { apiError, input, z } from "@/lib/api";
import { httpJson } from "@/lib/api/http.server";
import { requirePlatformAdmin } from "@/lib/authz.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_outlook";

function outlookHeaders(): Record<string, string> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const outlookKey = process.env.MICROSOFT_OUTLOOK_API_KEY;
  if (!lovableKey || !outlookKey) {
    throw apiError("forbidden", "Outlook connector not configured", {
      details: { connector: "microsoft_outlook" },
    });
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": outlookKey,
    "Content-Type": "application/json",
  };
}

export const sendOutlookReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    input(
      z.object({
        to: z.string().email().max(254),
        subject: z.string().min(1).max(300),
        html: z.string().min(1).max(200_000),
        cc: z.string().email().max(254).optional(),
      }),
    ),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.userId);
    const message: Record<string, unknown> = {
      subject: data.subject,
      body: { contentType: "HTML", content: data.html },
      toRecipients: [{ emailAddress: { address: data.to } }],
    };
    if (data.cc) {
      message.ccRecipients = [{ emailAddress: { address: data.cc } }];
    }
    await httpJson(`${GATEWAY_URL}/me/sendMail`, {
      method: "POST",
      headers: outlookHeaders(),
      body: JSON.stringify({ message, saveToSentItems: true }),
      label: "outlook sendMail",
    });
    return { ok: true, sentAt: new Date().toISOString() };
  });

export const listOutlookInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context.userId);
    const json = await httpJson<{
      value?: Array<{
        id: string;
        subject: string;
        from?: { emailAddress?: { name?: string; address?: string } };
        receivedDateTime: string;
        isRead: boolean;
        bodyPreview: string;
      }>;
    }>(
      `${GATEWAY_URL}/me/messages?$top=10&$select=id,subject,from,receivedDateTime,isRead,bodyPreview&$orderby=receivedDateTime desc`,
      { headers: outlookHeaders(), label: "outlook list inbox" },
    );
    return { messages: json.value ?? [] };
  });
