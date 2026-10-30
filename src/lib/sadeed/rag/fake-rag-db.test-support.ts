/**
 * عميل قاعدة وهمي ومقالات تجريبية لاختبارات الاسترجاع المحكوم — مشترك بين
 * عقد التدهور (`retrieve-lexical-degrade.contract.test.ts`) واختبار الأداة
 * (`sadeed-tools.search-knowledge.test.ts`) وقياس الأدوار
 * (`retrieve-turns.measure.test.ts`). ليس اختبارًا ولا يُنفَّذ وحده.
 *
 * يحاكي: سياسة إدراج `rag_query_log` في الإنتاج (`user_id = auth.uid()` و
 * `org_id` غير فارغ)، وقراءة `sec_knowledge_articles` بالمسند الذي يكتبه
 * الكود فقط (عميل الخدمة بلا RLS)، و`rpc` يعيد thenable بلا `.catch` كمنشئ
 * postgrest-js (SEC-10). وللمنشئين `abortSignal` كمنشئ postgrest-js، فيُسجَّل
 * ما يُمرَّر إليه، ويمكن إبقاء الإدراج أو القراءة معلّقًا لاختبار المواعيد.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const ORG_A = "a0000000-0000-4000-8000-000000000001";
export const ORG_B = "b0000000-0000-4000-8000-000000000002";
export const USER_A = "11111111-1111-4111-8111-111111111111";
export const QUERY = "ما اشتراطات الأسوار الأمنية؟";

export type Row = Record<string, unknown>;

export interface FakeOptions {
  articles?: Row[];
  /** عميل JWT: سياسة الإدراج `user_id = auth.uid()`؛ بدونه عميل خدمة يتجاوز RLS. */
  jwtUid?: string | null;
  /** عميل يتجاهل كل مسند `eq` (أسوأ حالة: لا RLS ولا مسند) — لفحص الفحص على الصفوف المرتجعة. */
  ignoreEq?: boolean;
  /** صفوف RPC الهجين. */
  rpcRows?: Row[];
  rpcThrows?: boolean;
  /** عطل القراءة من الجدول. */
  articlesError?: { code: string; message: string } | null;
  /** يرمي الإدراج بدل إعادة خطأ. */
  insertThrows?: boolean;
  /** إدراج لا يردّ أبدًا (قاعدة موقوفة): لاختبار موعد السجلّ. */
  hangInsert?: boolean;
  /** قراءة الجدول لا تردّ أبدًا: لاختبار موعد القراءة المعجمية. */
  hangRead?: boolean;
}

export function makeFake(opts: FakeOptions = {}) {
  const calls = {
    rpc: [] as Array<{ name: string; args: Record<string, unknown> }>,
    reads: [] as Array<{
      table: string;
      select: string;
      eqs: Array<[string, unknown]>;
      or: string[];
    }>,
    inserts: [] as Row[],
    accepted: [] as Row[],
    rejected: [] as Array<{ row: Row; error: { code: string; message: string } }>,
    /** إشارات الإلغاء التي مرّرها الكود إلى `abortSignal` (قراءة أو إدراج). */
    signals: [] as Array<{ kind: "read" | "insert"; signal: AbortSignal }>,
  };
  const articles = opts.articles ?? [];

  const matchesOr = (row: Row, filters: string[]): boolean =>
    filters.every((f) =>
      f.split(",").some((clause) => {
        const m = /^([a-z_]+)\.ilike\.\*(.+)\*$/.exec(clause);
        if (!m) return false;
        const v = row[m[1]];
        return typeof v === "string" && v.toLowerCase().includes(m[2].toLowerCase());
      }),
    );

  const client = {
    rpc(name: string, args: Record<string, unknown>) {
      calls.rpc.push({ name, args });
      if (opts.rpcThrows) throw new Error("rpc exploded");
      // thenable بلا `.catch` — كما منشئ postgrest-js (SEC-10).
      return {
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve({ data: opts.rpcRows ?? [], error: null }).then(res, rej),
      };
    },
    from(table: string) {
      const read = { table, select: "", eqs: [] as Array<[string, unknown]>, or: [] as string[] };
      const chain: Record<string, unknown> = {
        select(s: string) {
          read.select = s;
          return chain;
        },
        eq(col: string, val: unknown) {
          read.eqs.push([col, val]);
          return chain;
        },
        or(f: string) {
          read.or.push(f);
          return chain;
        },
        limit() {
          return chain;
        },
        abortSignal(signal: AbortSignal) {
          calls.signals.push({ kind: "read", signal });
          return chain;
        },
        insert(row: Row) {
          calls.inserts.push(row);
          // منشئ thenable كـpostgrest-js: النتيجة تُحسب عند `then` فقط، وله `abortSignal`.
          const settle = (): Promise<{ error: unknown }> => {
            if (opts.hangInsert) return new Promise(() => {});
            if (opts.insertThrows) return Promise.reject(new Error("insert exploded"));
            if (!row.org_id) {
              const error = { code: "23502", message: "null value in column org_id" };
              calls.rejected.push({ row, error });
              return Promise.resolve({ error });
            }
            if (opts.jwtUid !== undefined && row.user_id !== opts.jwtUid) {
              const error = {
                code: "42501",
                message: 'new row violates row-level security policy for table "rag_query_log"',
              };
              calls.rejected.push({ row, error });
              return Promise.resolve({ error });
            }
            calls.accepted.push(row);
            return Promise.resolve({ error: null });
          };
          const builder = {
            abortSignal(signal: AbortSignal) {
              calls.signals.push({ kind: "insert", signal });
              return builder;
            },
            then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
              settle().then(res, rej),
          };
          return builder;
        },
        then(res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) {
          calls.reads.push(read);
          if (opts.hangRead) return new Promise(() => {}).then(res, rej);
          if (opts.articlesError)
            return Promise.resolve({ data: null, error: opts.articlesError }).then(res, rej);
          const rows = articles.filter((r) => {
            if (!opts.ignoreEq) {
              for (const [col, val] of read.eqs) {
                if (col === "sec_knowledge_categories.code") {
                  const cat = r.sec_knowledge_categories as { code?: string } | null | undefined;
                  if (cat?.code !== val) return false;
                } else if (r[col] !== val) return false;
              }
            }
            return matchesOr(r, read.or);
          });
          return Promise.resolve({ data: rows, error: null }).then(res, rej);
        },
      };
      return chain;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

export const article = (over: Row): Row => ({
  id: crypto.randomUUID(),
  doc_code: null,
  title_en: null,
  summary_en: null,
  purpose_ar: null,
  keywords_ar: [],
  risk_level: null,
  priority: null,
  org_id: ORG_A,
  status: "published",
  sec_knowledge_categories: null,
  ...over,
});

export const A_FENCE = article({
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  doc_code: "SEC-FEN-01",
  title_ar: "سياسة الأسوار الأمنية",
  summary_ar: "تحدد هذه السياسة اشتراطات الأسوار الأمنية ومواصفات الارتفاع حول المنشآت الحساسة",
});
export const A_GATE = article({
  id: "aaaaaaaa-0000-4000-8000-000000000002",
  doc_code: "SEC-GATE-02",
  title_ar: "إجراءات التفتيش على البوابات",
  summary_ar: "خطوات تفتيش المركبات عند البوابات الرئيسية وفق الأسوار الأمنية",
});
export const A_DRAFT = article({
  id: "aaaaaaaa-0000-4000-8000-000000000003",
  title_ar: "مسودة الأسوار الأمنية",
  summary_ar: "مسودة غير منشورة عن الأسوار الأمنية",
  status: "draft",
});
export const B_FENCE = article({
  id: "bbbbbbbb-0000-4000-8000-000000000001",
  org_id: ORG_B,
  doc_code: "B-SECRET-9",
  title_ar: "سياسة الأسوار الأمنية لمؤسسة أخرى",
  summary_ar: "تفاصيل سرّية عن الأسوار الأمنية تخص المؤسسة ب وحدها",
});
export const GLOBAL_FENCE = article({
  id: "cccccccc-0000-4000-8000-000000000001",
  org_id: null,
  title_ar: "دليل الأسوار الأمنية العام",
  summary_ar: "دليل عام عن الأسوار الأمنية",
});
export const ALL_ARTICLES = [A_FENCE, A_GATE, A_DRAFT, B_FENCE, GLOBAL_FENCE];
