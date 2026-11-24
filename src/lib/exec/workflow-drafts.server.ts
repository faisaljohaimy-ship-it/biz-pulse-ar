import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  WorkflowDraftReceipt,
  WorkflowDraftSaveInput,
  WorkflowDraftSaveResult,
} from "./workflow-drafts.functions";
import { previewWorkflowDraft } from "./workflow-draft-template";
import { WorkflowDefinitionSchema } from "./workflow-engine.server";
import { audit } from "./audit.server";

type WorkflowRow = Database["public"]["Tables"]["workflows"]["Row"];
type WorkflowInsert = Database["public"]["Tables"]["workflows"]["Insert"];
const ROW_COLUMNS =
  "id,name,description,definition_json,version,enabled,owner_id,trigger_topic,tags,org_id,created_at,updated_at";
const WRITABLE_ROLES = new Set(["operator", "manager", "admin", "owner"]);

/** JSONB object key order is irrelevant; array order and extra fields remain significant. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}

export function matchesWorkflowDraft(row: unknown, expected: WorkflowInsert): row is WorkflowRow {
  if (!row || typeof row !== "object" || Array.isArray(row)) return false;
  const value = row as Record<string, unknown>;
  if (Object.keys(value).some((key) => !ROW_COLUMNS.split(",").includes(key))) return false;
  for (const [key, entry] of Object.entries(expected))
    if (canonical(value[key]) !== canonical(entry)) return false;
  return (
    typeof value.created_at === "string" &&
    Number.isFinite(Date.parse(value.created_at)) &&
    typeof value.updated_at === "string" &&
    Number.isFinite(Date.parse(value.updated_at))
  );
}

export async function saveDisabledWorkflowDraft(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: WorkflowDraftSaveInput,
): Promise<WorkflowDraftSaveResult> {
  const fail = (
    status: Exclude<WorkflowDraftSaveResult["status"], "saved">,
  ): WorkflowDraftSaveResult => ({ status, draftId: input.draftId });
  const preview = previewWorkflowDraft(input);
  if (!preview.ok || !userId) return fail("invalid_request");
  if (!WorkflowDefinitionSchema.safeParse(preview.preview.definition).success)
    return fail("invalid_request");
  const expected: WorkflowInsert = {
    id: input.draftId,
    name: "Offline asset diagnostic draft",
    description: "Disabled diagnostic draft. No execution or activation is approved.",
    definition_json: JSON.parse(JSON.stringify(preview.preview.definition)),
    org_id: input.orgId,
    owner_id: userId,
    enabled: false,
    trigger_topic: null,
    version: 1,
    tags: ["draft", "offline-assets"],
  };
  const read = () =>
    supabase
      .from("workflows")
      .select(ROW_COLUMNS)
      .eq("id", input.draftId)
      .eq("org_id", input.orgId)
      .eq("owner_id", userId)
      .abortSignal(AbortSignal.timeout(5000))
      .maybeSingle();
  const receipt = (row: WorkflowRow, replayed: boolean): WorkflowDraftReceipt => ({
    id: row.id,
    orgId: row.org_id,
    ownerId: userId,
    enabled: false,
    version: 1,
    createdAt: row.created_at,
    replayed,
  });

  let insertAttempted = false;
  try {
    // Current caller-scoped checks mirror the existing admin + exact-organization RLS.
    const role = await supabase
      .rpc("has_role", { _user_id: userId, _role: "admin" })
      .abortSignal(AbortSignal.timeout(5000));
    if (role.error) return fail("unavailable");
    if (role.data !== true) return fail("forbidden");
    const membership = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", input.orgId)
      .eq("user_id", userId)
      .abortSignal(AbortSignal.timeout(5000))
      .maybeSingle();
    if (membership.error) return fail("unavailable");
    if (!membership.data || !WRITABLE_ROLES.has(membership.data.role)) return fail("forbidden");

    // Reusing an ID never updates a record. Even matching records must still be disabled.
    const before = await read();
    if (before.error) return fail("unavailable");
    if (before.data)
      return matchesWorkflowDraft(before.data, expected)
        ? { status: "saved", receipt: receipt(before.data, true) }
        : fail("conflict");

    insertAttempted = true;
    let insertCode: string | undefined;
    let insertUncertain = false;
    try {
      const inserted = await supabase
        .from("workflows")
        .insert(expected)
        .abortSignal(AbortSignal.timeout(5000));
      insertCode = inserted.error?.code;
      insertUncertain = Boolean(inserted.error);
    } catch {
      insertUncertain = true;
    }
    // Read back after success, uniqueness conflict or ambiguous transport failure.
    // No automatic insert retry, upsert, update, event publication or execution occurs.
    const after = await read();
    if (after.error) return fail("unconfirmed");
    if (!after.data)
      return fail(
        insertCode === "42501" ? "forbidden" : insertCode === "23505" ? "conflict" : "unconfirmed",
      );
    if (!matchesWorkflowDraft(after.data, expected)) return fail("conflict");
    // Audit is best-effort and cannot withhold a receipt for an already verified row.
    // Signal cancellation bounds the actual request; the race also protects against
    // a transport implementation that does not honor cancellation.
    const auditController = new AbortController();
    let auditTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        audit(
          supabase,
          {
            actor_id: userId,
            org_id: input.orgId,
            action: "workflow.draft.saved",
            resource_type: "workflow",
            resource_id: input.draftId,
            metadata: { enabled: false, version: 1 },
            source: "workflow-draft-composer",
          },
          { signal: auditController.signal },
        ).catch(() => undefined),
        new Promise<void>((resolve) => {
          auditTimer = setTimeout(() => {
            auditController.abort();
            resolve();
          }, 1500);
        }),
      ]);
    } finally {
      if (auditTimer) clearTimeout(auditTimer);
    }
    return { status: "saved", receipt: receipt(after.data, insertUncertain) };
  } catch {
    return fail(insertAttempted ? "unconfirmed" : "unavailable");
  }
}
