import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LeadSchema = z.object({
  kind: z.enum(["contact", "demo", "book"]),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  company: z.string().trim().max(200).optional().nullable(),
  role: z.string().trim().max(200).optional().nullable(),
  team_size: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  source: z.string().trim().max(200).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type LeadInput = z.infer<typeof LeadSchema>;

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LeadSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("leads").insert({
      kind: data.kind,
      name: data.name,
      email: data.email,
      company: data.company ?? null,
      role: data.role ?? null,
      team_size: data.team_size ?? null,
      notes: data.notes ?? null,
      source: data.source ?? null,
      metadata: (data.metadata ?? {}) as never,
    });
    if (error) throw new Error(error.message);

    // Best-effort email notification (no-op if NOTIFY_EMAIL_TO + RESEND/Brevo not configured).
    const to = process.env.NOTIFY_EMAIL_TO;
    const resend = process.env.RESEND_API_KEY;
    if (to && resend) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resend}`,
          },
          body: JSON.stringify({
            from: "Nexus AI OS <onboarding@resend.dev>",
            to: [to],
            subject: `New ${data.kind} lead — ${data.name}`,
            text: `Kind: ${data.kind}\nName: ${data.name}\nEmail: ${data.email}\nCompany: ${data.company ?? "-"}\nRole: ${data.role ?? "-"}\nNotes: ${data.notes ?? "-"}`,
          }),
        });
      } catch {
        /* notification failure must not break submission */
      }
    }

    return { ok: true };
  });
