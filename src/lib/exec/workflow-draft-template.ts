/** A deterministic, unsaved preview. This module never reads assets or runs a tool. */
export const WORKFLOW_DRAFT_REQUESTS = {
  ar: "مسودة تشخيص الأصول غير المتصلة",
  en: "offline asset diagnostic draft",
} as const;

export type WorkflowDraftPreviewError = "request" | "unsupported" | "organization" | "limit";
export type WorkflowDraftPreview = ReturnType<typeof previewOf>;
export type WorkflowDraftPreviewResult =
  { ok: true; preview: WorkflowDraftPreview } | { ok: false; reason: WorkflowDraftPreviewError };

function normalizeRequest(request: string): string {
  return request
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function previewOf(orgId: string, limit: number) {
  return {
    orgId,
    saved: false,
    enabled: false,
    triggerTopic: null,
    version: 1,
    definition: {
      start: "read_offline_assets",
      steps: [
        {
          id: "read_offline_assets",
          kind: "tool",
          toolId: "sql.read",
          input: {
            table: "sec_assets",
            columns: ["id", "code", "name_ar", "name_en", "health", "status", "last_seen_at"],
            filters: { status: "offline" },
            order_by: { column: "last_seen_at", ascending: true },
            limit,
            count_only: false,
          },
        },
      ],
    },
  } as const;
}

/** Exact whole-intent matching: unsupported requests never become another workflow. */
export function previewWorkflowDraft(input: {
  request: string;
  orgId: string;
  limit: number;
}): WorkflowDraftPreviewResult {
  if (typeof input.request !== "string" || input.request.length === 0 || input.request.length > 160)
    return { ok: false, reason: "request" };
  const intent = normalizeRequest(input.request);
  if (
    !Object.values(WORKFLOW_DRAFT_REQUESTS).some((request) => normalizeRequest(request) === intent)
  )
    return { ok: false, reason: "unsupported" };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.orgId))
    return { ok: false, reason: "organization" };
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 50)
    return { ok: false, reason: "limit" };
  return { ok: true, preview: previewOf(input.orgId, input.limit) };
}
