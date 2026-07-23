import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ApprovalInput = z.object({
  ledgerId: z.string().uuid(),
  approvalToken: z.string().min(40).max(4_000),
});

/**
 * Human approval boundary for FINN email/SMS.
 *
 * The handler validates the authenticated actor, signed short-lived token,
 * content hash, expiry, role, rate limit and one-time ledger transition before
 * the provider is ever called. Server implementation is loaded only inside the
 * handler so no provider or crypto code is included in the browser bundle.
 */
export const approveFinnOutboundMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ApprovalInput.parse(input))
  .handler(async ({ data, context }) => {
    const { approveFinnOutboundMessageInternal } =
      await import("@/lib/aria/outbound-messaging.server");
    return approveFinnOutboundMessageInternal({
      userId: context.userId,
      ledgerId: data.ledgerId,
      approvalToken: data.approvalToken,
    });
  });

export const cancelFinnOutboundMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ApprovalInput.parse(input))
  .handler(async ({ data, context }) => {
    const { cancelFinnOutboundMessageInternal } =
      await import("@/lib/aria/outbound-messaging.server");
    return cancelFinnOutboundMessageInternal({
      userId: context.userId,
      ledgerId: data.ledgerId,
      approvalToken: data.approvalToken,
    });
  });
