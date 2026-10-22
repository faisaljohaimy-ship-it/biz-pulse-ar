import { z } from "zod";
import { requireFnnOwner } from "@/lib/dual-agent/owner.server";
import type { CommandContext } from "@/lib/dual-agent/command.server";

// Parse the service-only RPC at the boundary; no private row or raw database error reaches UI.
export const RuntimeStatusSchema = z.object({
  enabled: z.boolean(),
  schedule: z.string().nullable(),
  last_attempt_at: z.string().nullable(),
  last_completed_at: z.string().nullable(),
  last_success_at: z.string().nullable(),
  last_status: z.string(),
  last_error: z.string().nullable(),
});
export type RuntimeStatus = z.infer<typeof RuntimeStatusSchema>;

export async function readRuntimeStatus(context: CommandContext): Promise<RuntimeStatus> {
  await requireFnnOwner(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const client = supabaseAdmin as unknown as {
    rpc(name: string): {
      abortSignal(signal: AbortSignal): Promise<{ data: unknown; error: unknown }>;
    };
  };
  const { data, error } = await client
    .rpc("sadeed_runtime_status")
    .abortSignal(AbortSignal.timeout(3500));
  if (error) throw new Error("تعذّرت قراءة مراقبة التشغيل. أعد المحاولة.");
  const result = RuntimeStatusSchema.safeParse(data);
  if (!result.success) throw new Error("لم تصل حالة تشغيل صالحة. أعد المحاولة.");
  // Error details may contain identifiers; expose a neutral status only.
  return {
    ...result.data,
    last_error: result.data.last_error ? "تعذّرت دورة المراقبة الأخيرة." : null,
  };
}
