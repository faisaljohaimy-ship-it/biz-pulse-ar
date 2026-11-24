import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const WorkflowDraftSaveSchema = z
  .object({
    draftId: z.string().regex(UUID),
    orgId: z.string().regex(UUID),
    request: z.string().min(1).max(160),
    limit: z.number().int().min(1).max(50),
  })
  .strict();
export type WorkflowDraftSaveInput = z.infer<typeof WorkflowDraftSaveSchema>;
export type WorkflowDraftReceipt = {
  id: string;
  orgId: string;
  ownerId: string;
  enabled: false;
  version: 1;
  createdAt: string;
  replayed: boolean;
};
export type WorkflowDraftSaveResult =
  | { status: "saved"; receipt: WorkflowDraftReceipt }
  | {
      status: "invalid_request" | "forbidden" | "conflict" | "unavailable" | "unconfirmed";
      draftId: string;
    };

const privateResponse = createMiddleware({ type: "function" }).server(async ({ next }) => {
  setResponseHeader("Cache-Control", "private, no-store, max-age=0");
  setResponseHeader("Vary", "Authorization");
  return next();
});

/** Only disabled insertion + exact receipt reads; this API never runs or activates anything. */
export const saveWorkflowDraft = createServerFn({ method: "POST" })
  .middleware([privateResponse, requireSupabaseAuth])
  .validator(WorkflowDraftSaveSchema)
  .handler(async ({ data, context }): Promise<WorkflowDraftSaveResult> => {
    const { saveDisabledWorkflowDraft } = await import("./workflow-drafts.server");
    return saveDisabledWorkflowDraft(context.supabase, context.userId, data);
  });
