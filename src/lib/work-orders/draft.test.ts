/**
 * مسوّدة أمر العمل — البنود الإلزامية ١ و٢ و٤ و٥ من أمر المالك ٢٠٢٦/٠٩/١٣.
 *
 * تُختبر الدالّة الخالصة لا نصّ JSX: «الموكَّل يُرسَل فعلًا» و«الإرجاع يوجب
 * سببًا» قولان عن **ما يصل الخادم**، وحارسٌ يقرأ الترميز يمرّ عليهما وهما
 * مكسوران.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_ASSIGNEE_TEAM, DEFAULT_CONTRACTOR, FAULT_TYPES } from "./constants";
import {
  buildWorkOrderPayload,
  createButtonLabel,
  validateWorkOrderDraft,
  ERR_FAULT_TYPE_REQUIRED,
  ERR_RETURN_REASON_REQUIRED,
  ERR_TITLE_REQUIRED,
  RETURN_REASON_MIN,
  type WorkOrderDraft,
} from "./draft";

const base: WorkOrderDraft = {
  title_ar: "عطل في مضخة الحريق",
  kind: "corrective",
  priority: "medium",
  fault_type: "electrical",
  due_at: "",
  notes: "",
  decision: "none",
};

describe("① «نوع العطل» إلزامي — الإنشاء يفشل بدونه برسالة عربية", () => {
  it("مسوّدة بلا نوع عطل ترجع رسالة عربية", () => {
    const err = validateWorkOrderDraft({ ...base, fault_type: "" });
    expect(err).toBe(ERR_FAULT_TYPE_REQUIRED);
    expect(err).toMatch(/[؀-ۿ]/);
  });

  it("ونوعٌ خارج القائمة يُرفض كما يُرفض الفارغ — القائمة هي القيد", () => {
    expect(validateWorkOrderDraft({ ...base, fault_type: "hydraulics" })).toBe(
      ERR_FAULT_TYPE_REQUIRED,
    );
  });

  it("وكل مفتاحٍ من القائمة الإحدى عشرة يمرّ", () => {
    expect(FAULT_TYPES).toHaveLength(11);
    for (const fault of FAULT_TYPES) {
      expect(validateWorkOrderDraft({ ...base, fault_type: fault.key }), fault.key).toBeNull();
    }
  });

  it("والعنوان يبقى إلزاميًّا كما كان", () => {
    expect(validateWorkOrderDraft({ ...base, title_ar: "  " })).toBe(ERR_TITLE_REQUIRED);
  });
});

describe("② الموكَّل والمقاول قيمتان مؤسسيتان تُرسَلان فعلًا", () => {
  it("الحمولة تحمل القيمتين الثابتتين", () => {
    const payload = buildWorkOrderPayload(base);
    expect(payload.assignee_team).toBe(DEFAULT_ASSIGNEE_TEAM);
    expect(payload.contractor_name).toBe(DEFAULT_CONTRACTOR);
    expect(payload.assignee_team).toBe("فريق الصيانة");
    expect(payload.contractor_name).toBe("شركة الجيل الحديث");
  });

  it("ولا تُقرآن من المسوّدة — فحقلا الواجهة معطَّلان ولا يُبنى عليهما", () => {
    // المسوّدة لا تحمل الحقلين أصلًا: لا مدخل في النوع يمكن أن يحمل قيمة
    // أخرى. ولو أُقحمت قيمة من الخارج لم تصل الحمولة.
    const tampered = { ...base, assignee_team: "فريق آخر", contractor_name: "مقاول آخر" };
    const payload = buildWorkOrderPayload(tampered as WorkOrderDraft);
    expect(payload.assignee_team).toBe(DEFAULT_ASSIGNEE_TEAM);
    expect(payload.contractor_name).toBe(DEFAULT_CONTRACTOR);
  });

  it("والمفتاح الإنجليزي هو ما يُخزَّن لا التسمية العربية", () => {
    expect(buildWorkOrderPayload({ ...base, fault_type: "hvac" }).fault_type).toBe("hvac");
    expect(buildWorkOrderPayload({ ...base, fault_type: "hvac" }).fault_type).not.toBe(
      "تكييف وتبريد",
    );
  });
});

describe("④ «إرجاع» بلا ملاحظات يسقط، ومعها يمرّ", () => {
  it("إرجاعٌ بملاحظات فارغة ⇒ فشل تحقّق برسالة السبب", () => {
    expect(validateWorkOrderDraft({ ...base, decision: "return", notes: "" })).toBe(
      ERR_RETURN_REASON_REQUIRED,
    );
  });

  it("وملاحظةٌ أقصر من الحدّ تسقط أيضًا — «مرفوض» ليست سببًا", () => {
    const short = "قصير".padEnd(RETURN_REASON_MIN - 1, "ـ");
    expect(short.length).toBeLessThan(RETURN_REASON_MIN);
    expect(validateWorkOrderDraft({ ...base, decision: "return", notes: short })).toBe(
      ERR_RETURN_REASON_REQUIRED,
    );
  });

  it("ومع سببٍ كافٍ يمرّ، ويُحمل القرار في الحمولة", () => {
    const draft: WorkOrderDraft = {
      ...base,
      decision: "return",
      notes: "الوصف ناقص ولا يحدّد الموقع بدقّة",
    };
    expect(validateWorkOrderDraft(draft)).toBeNull();
    expect(buildWorkOrderPayload(draft).decision).toBe("return");
    expect(buildWorkOrderPayload(draft).notes).toBe("الوصف ناقص ولا يحدّد الموقع بدقّة");
  });

  it("والاعتماد لا يوجب ملاحظات — القيد على الإرجاع وحده", () => {
    expect(validateWorkOrderDraft({ ...base, decision: "approve", notes: "" })).toBeNull();
  });
});

describe("⑤ القرار يُحمل إلى الخادم، وتسمية الزرّ تتبعه", () => {
  it("الافتراض `none` — يُنشأ بانتظار الاعتماد", () => {
    expect(base.decision).toBe("none");
    expect(buildWorkOrderPayload(base).decision).toBe("none");
  });

  it("و«اعتماد» يصل قرارًا صريحًا في الحمولة", () => {
    expect(buildWorkOrderPayload({ ...base, decision: "approve" }).decision).toBe("approve");
  });

  it("وتسمية الزرّ تتغيّر بالقرار — وضوحٌ قبل الضغط لا بعده", () => {
    expect(createButtonLabel("none")).toBe("إنشاء");
    expect(createButtonLabel("approve")).toBe("إنشاء واعتماد");
    expect(createButtonLabel("return")).toBe("إنشاء وإرجاع");
  });

  it("والاستحقاق يبقى نهاية اليوم المحلي — عقد `due_at` كما هو", () => {
    const payload = buildWorkOrderPayload({ ...base, due_at: "2026-10-01" });
    expect(payload.due_at).toBe(new Date("2026-10-01T23:59:59").toISOString());
  });

  it("وبلا تاريخ لا يُرسل نصٌّ فارغ — يسقط الحقل كليًّا", () => {
    // نصٌّ فارغ في عمود timestamptz يرفضه Postgres (عطل ٢٠٢٦/٠٨/٢٠).
    expect(buildWorkOrderPayload(base).due_at).toBeUndefined();
  });
});
