/**
 * حارس خريطة حالات التشغيل (UI-2 · UI-3 · UI-5).
 *
 * ما يُحرَس: تسميةٌ عربية لكل حالة بلا نصٍّ إنجليزي خام؛ الفشل أحمر بمثمّن
 * وانتظار الاعتماد كهرماني بمثلث (لا يُوحَّدان ولا يتبدّلان)؛ أحواض /execution
 * لا ترمي المجهول في «قيد التشغيل»؛ واشتقاق «بانتظار الاعتماد (N)» من
 * `audit_json.pendingApprovals` دون لمس `status` نفسه.
 */
import { describe, expect, it } from "vitest";
import {
  RUN_STATUS_BUCKETS,
  RUN_STATUS_KEYS,
  RUN_STATUS_LABELS,
  deriveRunStatus,
  pendingApprovalCount,
  runStatusBucket,
  runStatusLabel,
  runStepsLabel,
  toolFailureCount,
  excludedToolCount,
} from "./run-status-labels";

const EXPECTED_AR: Record<string, string> = {
  queued: "في الطابور",
  running: "قيد التشغيل",
  succeeded: "نجح",
  failed: "فشل",
  cancelled: "أُلغي",
  pending_approval: "بانتظار الاعتماد",
  waiting_approval: "بانتظار الاعتماد",
  rejected: "رُفض",
  expired: "انقضت المهلة دون قرار",
  superseded: "استُبدل بطلب أحدث",
  rolled_back: "استُرجع",
};

describe("UI-5 — تسمية عربية لكل حالة", () => {
  it("كل حالة في الخريطة لها التسمية المطلوبة حرفًا", () => {
    for (const key of Object.keys(EXPECTED_AR)) {
      expect(runStatusLabel(key, "ar")).toBe(EXPECTED_AR[key]);
    }
    expect(RUN_STATUS_KEYS.sort()).toEqual(Object.keys(EXPECTED_AR).sort());
  });

  it("لا تسمية عربية تحوي حرفًا لاتينيًّا — النصّ الخام لا يتسرّب", () => {
    for (const key of RUN_STATUS_KEYS) {
      expect(RUN_STATUS_LABELS[key].ar).not.toMatch(/[A-Za-z_]/);
    }
  });

  it("الحالة المجهولة تُسمّى «حالة غير معروفة» ويُلحق نصّها الخام بين قوسين", () => {
    expect(runStatusLabel("weird_state")).toBe("حالة غير معروفة (weird_state)");
    expect(runStatusLabel(null)).toBe("حالة غير معروفة");
  });
});

describe("danger أحمر بمثمّن · warning كهرماني بمثلث — لا يُوحَّدان", () => {
  it("الفشل خطرٌ بمثمّن", () => {
    expect(RUN_STATUS_LABELS.failed.tone).toBe("danger");
    expect(RUN_STATUS_LABELS.failed.shape).toBe("octagon");
  });
  it("انتظار الاعتماد (الصيغتان) تحذيرٌ بمثلث", () => {
    for (const k of ["pending_approval", "waiting_approval"] as const) {
      expect(RUN_STATUS_LABELS[k].tone).toBe("warning");
      expect(RUN_STATUS_LABELS[k].shape).toBe("triangle");
    }
  });
  it("النجاح سليمٌ بدائرة، والاسترجاع نغمةٌ ثالثة لا حمراء ولا كهرمانية", () => {
    expect(RUN_STATUS_LABELS.succeeded.tone).toBe("success");
    expect(RUN_STATUS_LABELS.succeeded.shape).toBe("circle");
    expect(["danger", "warning"]).not.toContain(RUN_STATUS_LABELS.rolled_back.tone);
  });
  it("الحيّ هو الطابور والتشغيل وحدهما (ما يقبل الإلغاء)", () => {
    const live = RUN_STATUS_KEYS.filter((k) => RUN_STATUS_LABELS[k].live).sort();
    expect(live).toEqual(["queued", "running"]);
  });
});

describe("UI-3 — أحواض /execution", () => {
  it("قائمة الأحواض تضمّ «بانتظار الاعتماد» و«استُرجع» و«غير معروف»", () => {
    expect(RUN_STATUS_BUCKETS).toContain("awaiting_approval");
    expect(RUN_STATUS_BUCKETS).toContain("rolled_back");
    expect(RUN_STATUS_BUCKETS).toContain("unknown");
  });
  it("pending_approval و waiting_approval ⇐ حوضٌ مستقلّ لا «قيد التشغيل»", () => {
    expect(runStatusBucket("pending_approval")).toBe("awaiting_approval");
    expect(runStatusBucket("waiting_approval")).toBe("awaiting_approval");
  });
  it("expired/superseded/rejected ⇐ أُلغي؛ rolled_back حوضه", () => {
    expect(runStatusBucket("expired")).toBe("cancelled");
    expect(runStatusBucket("superseded")).toBe("cancelled");
    expect(runStatusBucket("rejected")).toBe("cancelled");
    expect(runStatusBucket("cancelled")).toBe("cancelled");
    expect(runStatusBucket("rolled_back")).toBe("rolled_back");
  });
  it("المجهول ⇐ unknown لا running", () => {
    expect(runStatusBucket("something_new")).toBe("unknown");
    expect(runStatusBucket(undefined)).toBe("unknown");
    expect(runStatusBucket("")).toBe("unknown");
  });
  it("الأحواض القديمة باقية كما كانت", () => {
    expect(runStatusBucket("queued")).toBe("queued");
    expect(runStatusBucket("pending")).toBe("queued");
    expect(runStatusBucket("running")).toBe("running");
    expect(runStatusBucket("approved")).toBe("running");
    expect(runStatusBucket("succeeded")).toBe("completed");
    expect(runStatusBucket("completed")).toBe("completed");
    expect(runStatusBucket("failed")).toBe("failed");
    expect(runStatusBucket("error")).toBe("failed");
    expect(runStatusBucket("timeout")).toBe("failed");
  });
});

describe("UI-2 — الحالة المشتقّة من audit_json", () => {
  it("نجح + pendingApprovals.count>0 ⇐ «بانتظار الاعتماد (N)» كهرمانية بمثلث", () => {
    const d = deriveRunStatus({
      status: "succeeded",
      audit_json: { pendingApprovals: { count: 2, executionIds: ["a", "b"] } },
    });
    expect(d.key).toBe("waiting_approval");
    expect(d.label).toBe("بانتظار الاعتماد (2)");
    expect(d.meta.tone).toBe("warning");
    expect(d.meta.shape).toBe("triangle");
    expect(d.pendingApprovals).toBe(2);
  });
  it("نجح بعدّادٍ صفر أو بلا audit_json ⇐ «نجح» الخضراء", () => {
    expect(
      deriveRunStatus({ status: "succeeded", audit_json: { pendingApprovals: { count: 0 } } })
        .label,
    ).toBe("نجح");
    expect(deriveRunStatus({ status: "succeeded" }).meta.tone).toBe("success");
    expect(deriveRunStatus({ status: "succeeded", audit_json: null }).label).toBe("نجح");
  });
  it("الاشتقاق لا يمسّ غير «نجح»: فشلٌ مع اعتماداتٍ معلّقة يبقى فشلًا", () => {
    const d = deriveRunStatus({ status: "failed", audit_json: { pendingApprovals: { count: 1 } } });
    expect(d.key).toBe("failed");
    expect(d.label).toBe("فشل");
    expect(d.pendingApprovals).toBe(1);
  });
  it("pendingApprovalCount يقبل الكائن والرقم والمصفوفة ويرفض الهراء", () => {
    expect(pendingApprovalCount({ pendingApprovals: { count: 3 } })).toBe(3);
    expect(pendingApprovalCount({ pendingApprovals: 4 })).toBe(4);
    expect(pendingApprovalCount({ pendingApprovals: ["x"] })).toBe(1);
    expect(pendingApprovalCount({ pendingApprovals: "many" })).toBe(0);
    expect(pendingApprovalCount(undefined)).toBe(0);
    expect(pendingApprovalCount("str")).toBe(0);
  });
  it("toolFailureCount: غيابهما null «لم يُقَس»؛ وجود أحدهما يُعدّ", () => {
    expect(toolFailureCount({})).toBeNull();
    expect(toolFailureCount(undefined)).toBeNull();
    expect(toolFailureCount({ toolFailures: 2 })).toBe(2);
    // الصيغة الحقيقية من agent-runtime: failed + rejected؛ والمستبعَد لا يُحسب فشلًا.
    expect(
      toolFailureCount({
        toolFailures: { attempted: 3, succeeded: 0, failed: 2, rejected: 1, failures: [] },
        excludedTools: [{ toolId: "sql.read", reason: "unauthorized" }],
      }),
    ).toBe(3);
    expect(toolFailureCount({ excludedTools: ["a", "b", "c"] })).toBeNull();
    expect(excludedToolCount({ excludedTools: ["a", "b", "c"] })).toBe(3);
    expect(excludedToolCount({})).toBeNull();
    expect(toolFailureCount({ toolFailures: [{}] })).toBe(1);
  });
});

describe("UI-1 — عدد الخطوات رقمٌ صحيح أو «—»", () => {
  it("الرقم يُعرض كما هو، والمصفوفة (محاكاة) والفراغ «—»", () => {
    expect(runStepsLabel(7)).toBe("7");
    expect(runStepsLabel(0)).toBe("0");
    expect(runStepsLabel(2.9)).toBe("2");
    expect(runStepsLabel([])).toBe("—");
    expect(runStepsLabel([1, 2])).toBe("—");
    expect(runStepsLabel(null)).toBe("—");
    expect(runStepsLabel(undefined)).toBe("—");
    expect(runStepsLabel(-1)).toBe("—");
    expect(runStepsLabel(Number.NaN)).toBe("—");
  });
});
