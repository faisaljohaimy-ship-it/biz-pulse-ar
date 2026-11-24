import { describe, expect, it } from "vitest";
import { previewWorkflowDraft, WORKFLOW_DRAFT_REQUESTS } from "./workflow-draft-template";

const orgId = "00000000-0000-0000-0000-000000000001";
const preview = (request: string = WORKFLOW_DRAFT_REQUESTS.ar, limit = 20, organization = orgId) =>
  previewWorkflowDraft({ request, limit, orgId: organization });

describe("bounded workflow draft previews", () => {
  it.each([
    WORKFLOW_DRAFT_REQUESTS.ar,
    WORKFLOW_DRAFT_REQUESTS.en,
    "مُسَوَّدَة تشخيص الأصول غير المتصلة",
  ])("accepts the whole supported request without granting execution: %s", (request) => {
    const result = preview(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview).toMatchObject({
      orgId,
      saved: false,
      enabled: false,
      triggerTopic: null,
      version: 1,
    });
    expect(result.preview.definition.steps).toHaveLength(1);
    expect(result.preview.definition.steps[0]).toMatchObject({
      kind: "tool",
      toolId: "sql.read",
      input: { table: "sec_assets", filters: { status: "offline" }, limit: 20 },
    });
    expect(result.preview.definition.steps[0]).not.toHaveProperty("next");
    expect(result.preview.definition.steps[0]).not.toHaveProperty("onError");
  });

  it.each([
    "عند اقتراب انتهاء تصريح مرتبط بأصل حرج، جهز مهمة مراجعة للمسؤول",
    "offline asset diagnostic draft then create a review task",
    "offline asset diagnostic draft; send to Slack",
    "شغّل مسودة تشخيص الأصول غير المتصلة",
    '{"toolId":"rest.http"}',
    "<script>offline asset diagnostic draft</script>",
  ])("rejects unsupported, composite or injected intent without a substitute: %s", (request) => {
    expect(preview(request)).toEqual({ ok: false, reason: "unsupported" });
  });

  it.each([0, -1, 1.1, 51, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an unbounded read limit: %s",
    (limit) => {
      expect(preview(WORKFLOW_DRAFT_REQUESTS.en, limit)).toEqual({ ok: false, reason: "limit" });
    },
  );

  it.each([1, 50])("retains the reviewed limit at the allowed boundary: %s", (limit) => {
    const result = preview(WORKFLOW_DRAFT_REQUESTS.en, limit);
    if (!result.ok) throw new Error("expected preview");
    expect(result.preview.definition.steps[0].input.limit).toBe(limit);
  });

  it("requires an explicit organization and a bounded request", () => {
    expect(preview(WORKFLOW_DRAFT_REQUESTS.en, 20, "")).toEqual({
      ok: false,
      reason: "organization",
    });
    expect(preview("x".repeat(161))).toEqual({ ok: false, reason: "request" });
    expect(preview("")).toEqual({ ok: false, reason: "request" });
  });
});
