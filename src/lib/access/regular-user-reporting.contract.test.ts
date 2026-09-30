/**
 * عقد «المستخدم العادي يسجّل البلاغات» (أمر المالك ٢٠٢٦/٠٩/٢٩).
 *
 * تغييرُ صلاحياتٍ جوهري بموافقة المالك الصريحة. ما يسهل كسره بلا أن يسقط
 * بناء: سياسة إدراجٍ بلا `created_by = auth.uid()` (إنشاءٌ باسم غيرك)، أو بلا
 * حصر الحالة (أمر عملٍ «معتمد» يُدرج مباشرةً — `enforce_work_order_approval`
 * غير مطبَّق على الإنتاج)، أو ترحيلٌ بلا تراجعٍ مقابل، أو دورٌ يُكتب في بيانات
 * التسجيل. السلوك نفسه قِيس على Postgres حقيقي تحت `authenticated` و`anon`
 * (١٧ حالة) — وهذا العقد يحرس النصّ من الانحراف بعده.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { signupErrorMessage, signupMetadata, validateSignup } from "@/lib/access/signup";

const MIG = readFileSync("supabase/migrations/20260929210000_regular_user_reporting.sql", "utf8");
const RB = readFileSync(
  "supabase/migrations/20260929210001_regular_user_reporting_rollback.sql",
  "utf8",
);
const sql = (s: string) => s.replace(/--.*$/gm, "");
const CODE = sql(MIG);

/** نصّ سياسةٍ بعينها حتى الفاصلة المنقوطة. */
const policy = (name: string) => {
  const at = CODE.indexOf(`create policy ${name}`);
  return at === -1 ? "" : CODE.slice(at, CODE.indexOf(";", at));
};

describe("الترحيل — إدراجٌ باسم صاحبه وفي الحالة الأولى", () => {
  const INSERTS: Array<[string, string]> = [
    ["sec_incidents_member_insert", "status = 'open'"],
    ["sec_work_orders_member_insert", "status = 'open'"],
    ["sec_permits_member_insert", "status = 'pending'"],
  ];

  it.each(INSERTS)("%s: عضوٌ مشغّل، باسمه، بحالته الأولى", (name, status) => {
    const p = policy(name);
    expect(p, `${name} غير موجودة`).not.toBe("");
    expect(p).toContain("for insert to authenticated");
    expect(p).toContain("is_org_member(org_id, 'operator'::public.org_role)");
    expect(p, "إنشاءٌ باسم غيرك").toContain("created_by = auth.uid()");
    expect(p, "حالةٌ غير الأولى").toContain(status);
  });

  // **الحقول المحجوزة فارغةٌ عند الإدراج** — نقضُ حارس الجودة: قِيس تزوير
  // المراجعة التنفيذية وزمن الاستجابة والاعتماد والإغلاق عبر إدراجٍ «مفتوح».
  const RESERVED: Array<[string, string[]]> = [
    [
      "sec_incidents_member_insert",
      [
        "resolved_at is null",
        "response_minutes is null",
        "root_cause is null",
        "ai_summary is null",
        "corrective_actions = '[]'::jsonb",
        "escalated = false",
        "aria_auto_analyzed = false",
        "executive_review is null",
        "executive_reviewed_by is null",
        "executive_reviewed_at is null",
        "reported_at between now() - interval '10 minutes'",
      ],
    ],
    [
      "sec_work_orders_member_insert",
      [
        "approved_by is null",
        "approved_at is null",
        "closed_at is null",
        "completion_notes is null",
      ],
    ],
    [
      "sec_permits_member_insert",
      ["approver is null", "approved_by is null", "approved_at is null"],
    ],
  ];
  it.each(RESERVED)("%s: كل حقلٍ محجوز فارغ، والتاريخ لا يُرجَّع", (name, conds) => {
    const p = policy(name);
    for (const c of conds) expect(p, `${name} بلا «${c}»`).toContain(c);
  });

  it("حدث السجلّ على كيانٍ أنشأه صاحبه، مرّةً واحدة، وفي وقته", () => {
    // قِيس: حدث «تسجيل» مزوّر على بلاغ غيرك بموقعٍ مختلق يعرضه الدرج للمسؤول.
    const p = policy("sec_activity_events_member_insert");
    expect(p).toContain("actor_id = auth.uid()");
    expect(p).toContain("occurred_at between now() - interval '10 minutes'");
    expect(p).toContain("public.member_creation_event_ok(entity_type, entity_id, event)");
    const fn = CODE.slice(
      CODE.indexOf("create or replace function public.member_creation_event_ok"),
    );
    for (const t of ["sec_incidents i", "sec_work_orders w", "sec_permits p"]) {
      expect(fn).toContain(t);
    }
    expect(fn.match(/created_by = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(fn).toMatch(/not exists \(\s*select 1 from public\.sec_activity_events e/);
    expect(fn).toContain("else false");
  });

  it("فحص الهجوم محفوظ ويرفض أي قاعدةٍ غير قاعدته", () => {
    const CHECK = readFileSync("supabase/preflight/regular_user_reporting_check.sql", "utf8");
    expect(CHECK).toContain("if current_database() <> 'sadeed_rls_harness'");
    expect(CHECK).toContain("ATK D registered event on A incident with fake location");
    expect(CHECK).toContain("ATK permit pre-signed");
  });

  it("لا سياسة لـanon، ولا منحٌ لدور المسؤول، ولا مساسٌ بسياسات المسؤول القائمة", () => {
    // لا **سياسة** للزائر. ومنحُ تنفيذ `staff_number_available` له مقصود: نموذج
    // التسجيل يسأل عن الرقم قبل أن يكون للمستخدم جلسة، والدالّة تعيد منطقيًّا فقط.
    expect(CODE).not.toMatch(/create policy[^;]*to anon/);
    expect(CODE).toMatch(
      /grant execute on function public\.staff_number_available\(text\) to anon, authenticated/,
    );
    expect(CODE).not.toMatch(/insert into public\.user_roles/);
    // سياسات المسؤول القائمة في الإنتاج بأسمائها المقيسة — لا تُسقط.
    expect(CODE).not.toMatch(
      /drop policy if exists (sec_\w+_admin_write|sec_\w+_select_admin|sec_\w+_insert_admin|tenant_isolation_\w+)\b/,
    );
  });

  it("الرقم الوظيفي: فريد، بصيغته، ويُكتب بالـtrigger وحده، ولا يُسقط التسجيل", () => {
    expect(CODE).toMatch(
      /staff_number text not null unique check \(staff_number ~ '\^\[0-9\]\{5,6\}\$'\)/,
    );
    expect(CODE).toContain(
      "revoke insert, update, delete on public.staff_accounts from anon, authenticated",
    );
    expect(CODE).toContain("exception when others then");
    expect(CODE).toContain("on conflict do nothing");
  });
});

describe("التراجع المقابل في الـcommit نفسه — ومتماثل", () => {
  it("كل سياسةٍ ودالّة وtrigger أضافها الترحيل يُسقطها التراجع", () => {
    // سياسة `staff_accounts` تبقى مع جدولها في التراجع — هي حارسُ بياناته الباقية.
    const created = [...CODE.matchAll(/create policy (\w+)/g)]
      .map((m) => m[1])
      .filter((n) => !n.startsWith("staff_accounts_"));
    expect(created.length).toBe(6);
    for (const name of created)
      expect(RB, `التراجع لا يُسقط ${name}`).toContain(`drop policy if exists ${name}`);
    expect(RB).toContain("drop trigger if exists on_auth_user_created_staff on auth.users");
    expect(RB).toContain("drop function if exists public.handle_new_staff_account()");
    expect(RB).toContain("drop function if exists public.staff_number_available(text)");
    expect(RB).toContain(
      "drop function if exists public.member_creation_event_ok(text, uuid, text)",
    );
  });

  it("والتراجع لا يحذف بيانات — الجدول يبقى (حذفه خلف موافقة المالك)", () => {
    expect(sql(RB)).not.toMatch(/drop table/i);
  });

  it("والترحيل idempotent", () => {
    expect(CODE).toContain("create table if not exists public.staff_accounts");
    const creates = (CODE.match(/create policy/g) ?? []).length;
    const drops = (CODE.match(/drop policy if exists/g) ?? []).length;
    expect(drops).toBe(creates);
  });
});

describe("نموذج «مستخدم جديد»", () => {
  const ok = {
    name: "فيصل الغامدي",
    staffNumber: "١٠٢٥٤",
    email: "f@example.com",
    password: "S3cure-pass",
    confirm: "S3cure-pass",
  };

  it("الصحيح يمرّ، والرقم العربي يُطبَّع إلى أرقام إنجليزية", () => {
    expect(validateSignup(ok)).toEqual({});
    expect(signupMetadata(ok)).toEqual({ name: "فيصل الغامدي", staff_number: "10254" });
  });

  it("كل حقلٍ يُرفض برسالة عربية", () => {
    const e = validateSignup({
      name: "ف",
      staffNumber: "12ab",
      email: "x@",
      password: "short",
      confirm: "no",
    });
    expect(Object.keys(e).sort()).toEqual(["confirm", "email", "name", "password", "staffNumber"]);
  });

  it("بيانات التسجيل لا تحمل دورًا — الصلاحية من القاعدة وحدها", () => {
    expect(Object.keys(signupMetadata(ok)).sort()).toEqual(["name", "staff_number"]);
    const AUTH = readFileSync("src/routes/auth.tsx", "utf8");
    expect(AUTH).toContain("supabase.auth.signUp(");
    expect(AUTH).toContain("options: { data: meta, emailRedirectTo:");
    expect(AUTH).not.toMatch(/role\s*:/);
    expect(AUTH).toContain('"staff_number_available"');
    expect(AUTH).toContain("مستخدم جديد");
    // `?mode=signup` يتخطّى بوابة العرض — كان الزائر يهبط على «شاهد النظام أولًا».
    expect(AUTH).toContain('initialMode === "signup" || hasExecutiveAcceptance');
    // التبويب المحدَّد برمزين (≥4.5) لا `bg-primary` (3.68 في الفاتح)، والحقول
    // بحلقة التركيز الصريحة.
    expect(AUTH).toContain("bg-[color:var(--tone-blue)] text-[color:var(--surface)]");
    expect(AUTH).not.toContain('"bg-primary text-primary-foreground"');
    expect(AUTH).toContain('className="nx-focus-ring mt-1.5 h-12"');
  });

  it("أخطاء Supabase تُقال بالعربية بلا عبارات مصادقة تقنية", () => {
    expect(signupErrorMessage("User already registered")).toContain("مسجَّل مسبقًا");
    for (const raw of ["User already registered", "Password should be", "rate limit", "boom"]) {
      expect(signupErrorMessage(raw)).not.toMatch(/authenticat|unauthor|token/i);
    }
  });
});

describe("النماذج الثلاثة تدلّ الزائر على «مستخدم جديد»", () => {
  const DIALOG = readFileSync("src/components/sec/oms-dialogs.tsx", "utf8");
  it("ملاحظة الزائر في البلاغ وأمر العمل والتصريح، والإرسال معطَّل بلا حساب", () => {
    for (const what of ["تسجيل البلاغ", "إنشاء أمر العمل", "طلب التصريح"]) {
      expect(DIALOG).toContain(`<GuestAccountNote what="${what}" />`);
    }
    expect(DIALOG).toContain('href="/auth?mode=signup"');
    expect(DIALOG).toMatch(/disabled=\{!reporter \|\|/);
    expect(DIALOG).toMatch(/disabled=\{!user \|\| m\.isPending/);
    expect(DIALOG).toMatch(/!requester \|\| !form\.contractor/);
  });
});
