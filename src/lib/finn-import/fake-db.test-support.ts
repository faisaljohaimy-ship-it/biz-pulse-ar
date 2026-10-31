/**
 * قاعدة بيانات وهمية في الذاكرة لجدول `finn_documents` — اختبارٌ فقط. تحاكي من PostgREST ما يلمسه
 * `ingest.server.ts` بالضبط: `insert().select().single()` · `select().eq().neq().in().order().limit()` ·
 * `update().eq()` · `delete().eq().select()`، وتدعم حقن الأعطال (إدراج/قراءة/حذف) والحذف الصامت
 * الذي تفعله RLS (بلا خطأ وبلا صفوف).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface FakeRow {
  id: string;
  org_id: string;
  user_id: string;
  created_at: string;
  status: string;
  revision_hash: string | null;
  title: string;
  tags: string[];
  error?: string | null;
  [key: string]: unknown;
}

type Op = "select" | "insert" | "update" | "delete";
export type FakeFilter = ["eq" | "neq", string, unknown] | ["in", string, unknown[]];
type Filter = FakeFilter;

export interface FakeDbOptions {
  /** مفتاح الإدراج الذي يفشل (بترتيب النداءات من 0)، أو `true` للكل. */
  failInsert?: number | true | null;
  failSelect?: boolean;
  failDelete?: boolean;
  /** الحذف يرجع بلا خطأ ولا صفوف (كما تفعل RLS حين ترفض). */
  silentDelete?: boolean;
  /** يرمي استثناءً بدل إرجاع خطأ في الإدراج. */
  throwOnInsert?: boolean;
}

export class FakeDb {
  rows: FakeRow[] = [];
  /** كل عملية (جدول:عملية) بترتيبها — لإثبات «لا كتابة». */
  ops: string[] = [];
  /** كل استعلامٍ بمرشِّحاته كما وصلت — لإثبات أن الكود الحقيقي يُرسل المرشِّحات التي يعتمد عليها. */
  queries: Array<{ table: string; op: Op; filters: FakeFilter[] }> = [];
  orgId = "00000000-0000-4000-8000-0000000000aa";
  options: FakeDbOptions = {};
  private insertCalls = 0;
  private seq = 0;
  // الساعة الوهمية خمس دقائق في الماضي وتتقدّم ثانيةً لكل صفّ: داخل نافذة «قيد الفهرسة» (٣٠ دقيقة)
  // وبترتيبٍ ثابت «الأقدم أوّلًا» الذي يعتمد عليه فحص التكرار.
  private clock = Date.now() - 5 * 60_000;

  /** رسالة خطأ مزروعة تعود من القاعدة — يجب ألّا تصل أي عمود ولا استجابة. */
  plantedErrorMessage = "PLANTED-DB-ERROR-QX7";

  constructor(options: FakeDbOptions = {}) {
    this.options = options;
  }

  nextId(): string {
    this.seq += 1;
    return `00000000-0000-4000-8000-${String(this.seq).padStart(12, "0")}`;
  }

  nextTime(): string {
    this.clock += 1000;
    return new Date(this.clock).toISOString();
  }

  seed(partial: Partial<FakeRow> & Pick<FakeRow, "user_id" | "revision_hash" | "status">): FakeRow {
    const row: FakeRow = {
      id: this.nextId(),
      org_id: this.orgId,
      created_at: this.nextTime(),
      title: "قائم",
      tags: [],
      ...partial,
    };
    this.rows.push(row);
    return row;
  }

  writes(): string[] {
    return this.ops.filter((o) => /:(insert|update|delete)$/.test(o));
  }

  client(): SupabaseClient<Database> {
    return {
      from: (table: string) => new FakeQuery(this, table),
    } as unknown as SupabaseClient<Database>;
  }

  shouldFailInsert(): boolean {
    const n = this.insertCalls++;
    const f = this.options.failInsert;
    return f === true || (typeof f === "number" && f === n);
  }
}

class FakeQuery implements PromiseLike<{ data: unknown; error: { message: string } | null }> {
  private op: Op = "select";
  private payload: Record<string, unknown> = {};
  private filters: Filter[] = [];
  private wantsRows = false;
  private single_ = false;

  constructor(
    private readonly db: FakeDb,
    private readonly table: string,
  ) {}

  insert(payload: Record<string, unknown>) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: Record<string, unknown>) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  select(_columns?: string) {
    if (this.op === "insert" || this.op === "delete" || this.op === "update") {
      this.wantsRows = true;
    } else {
      this.op = "select";
    }
    return this;
  }
  single() {
    this.single_ = true;
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push(["eq", column, value]);
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push(["neq", column, value]);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push(["in", column, values]);
    return this;
  }
  order(_column: string, _options?: unknown) {
    return this;
  }
  limit(_n: number) {
    return this;
  }

  private matches(row: FakeRow): boolean {
    return this.filters.every(([kind, column, value]) => {
      const actual = row[column];
      if (kind === "eq") return actual === value;
      if (kind === "neq") return actual !== value;
      return (value as unknown[]).includes(actual);
    });
  }

  private run(): { data: unknown; error: { message: string } | null } {
    const db = this.db;
    db.ops.push(`${this.table}:${this.op}`);
    db.queries.push({ table: this.table, op: this.op, filters: [...this.filters] });
    const fail = { data: null, error: { message: db.plantedErrorMessage } };
    if (this.op === "insert") {
      if (db.options.throwOnInsert) throw new Error(db.plantedErrorMessage);
      if (db.shouldFailInsert()) return fail;
      const row: FakeRow = {
        id: db.nextId(),
        org_id: db.orgId,
        created_at: db.nextTime(),
        error: null,
        ...(this.payload as Partial<FakeRow>),
      } as FakeRow;
      db.rows.push(row);
      return { data: this.single_ ? row : [row], error: null };
    }
    if (this.op === "select") {
      if (db.options.failSelect) return fail;
      const found = db.rows.filter((r) => this.matches(r));
      return { data: this.single_ ? (found[0] ?? null) : found, error: null };
    }
    if (this.op === "update") {
      const found = db.rows.filter((r) => this.matches(r));
      for (const row of found) Object.assign(row, this.payload);
      return { data: this.wantsRows ? found : null, error: null };
    }
    // delete
    if (db.options.failDelete) return fail;
    if (db.options.silentDelete) return { data: [], error: null };
    const found = db.rows.filter((r) => this.matches(r));
    db.rows = db.rows.filter((r) => !found.includes(r));
    return { data: this.wantsRows ? found : null, error: null };
  }

  then<R1 = { data: unknown; error: { message: string } | null }, R2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: { message: string } | null }) => R1 | PromiseLike<R1>)
      | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve()
      .then(() => this.run())
      .then(onfulfilled, onrejected);
  }
}
