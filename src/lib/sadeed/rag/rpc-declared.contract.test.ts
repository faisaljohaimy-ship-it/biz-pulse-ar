// @vitest-environment node
/**
 * عقد RPC مسار الاسترجاع (O4، المادة ٣٠) — كل اسم RPC تناديه ملفات مسار الدردشة
 * والاسترجاع **مُعلَن في `supabase/migrations/**`**، وأسماء معاملات النداء توافق
 * التوقيع المُعلَن.
 *
 * لماذا: PostgREST يحلّ الدالّة **بالاسم وأسماء المعاملات معًا**؛ نداءٌ لاسم
 * غير موجود أو بمعاملٍ منحرف يعود `PGRST202` في وقت التشغيل لا وقت البناء — وهذا
 * بالضبط عطل `aria_match_*` الذي ظلّ مخفيًّا (الراية مغلقة فلا أحد ينادي). نسخة
 * الإنتاج لا تُستنتج من الملفات (CLAUDE.md «مصدر الحقيقة»)؛ هذا الحارس يمنع ما
 * يمكن منعه: **نداءً لا يعلنه المستودع نفسه**.
 *
 * حدوده (معلنة): لا يرى نداءً بمعاملات غير حرفية (يُسجَّل «لم يُفحص») ولا
 * اسمًا مبنيًّا ديناميكيًّا إلا ما في قائمة الاستثناء الصريحة؛ والهوية عنده
 * (الاسم، عدد المعاملات) فتحميلات متساوية العدد مختلفة الأنواع تُعامل واحدة.
 * وكل قاعدة هنا لها حالة حمراء مزروعة في آخر الملف.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// ── استخراج الإعلانات من الترحيلات ──────────────────────────────────────────

type Param = { name: string | null; required: boolean };
type Decl = { name: string; params: Param[] };

function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

/** يقسم نصًّا على الفواصل العليا (خارج الأقواس والاقتباس). */
function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = "";
  for (const ch of text) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      cur += ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      cur += ch;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      cur += ch;
    } else if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim() !== "") out.push(cur);
  return out;
}

/** النصّ بين القوس الذي عند `openAt` ومقابله المتوازن. */
function balanced(text: string, openAt: number, open = "(", close = ")"): string | null {
  let depth = 0;
  let quote: string | null = null;
  for (let i = openAt; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") quote = ch;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) return text.slice(openAt + 1, i);
  }
  return null;
}

function parseParams(inner: string): Param[] {
  const params: Param[] = [];
  for (const raw of splitTopLevel(inner)) {
    let piece = raw.trim();
    if (!piece) continue;
    if (/^out\s/i.test(piece)) continue; // معاملات الإخراج لا تُرسَل
    piece = piece.replace(/^(?:in|inout|variadic)\s+/i, "");
    const tokens = piece.split(/\s+/);
    const required = !/\bdefault\b|(?:^|\s)=\s/i.test(piece);
    // معامل بلا اسم (نوع فقط): لا يمكن فحص مفاتيحه.
    const name = tokens.length >= 2 ? tokens[0].replace(/^"|"$/g, "") : null;
    params.push({ name, required });
  }
  return params;
}

/** يطبّق الترحيلات بالترتيب: آخر عمليةٍ تحسم (create يضيف/يستبدل، drop يزيل بحسب العدد). */
function declaredFunctions(files: { file: string; sql: string }[]): Map<string, Decl[]> {
  const map = new Map<string, Decl[]>();
  const re =
    /\b(create\s+(?:or\s+replace\s+)?function|drop\s+function(?:\s+if\s+exists)?)\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s*\(/gi;
  for (const { sql } of files) {
    const clean = stripSqlComments(sql);
    let m: RegExpExecArray | null;
    while ((m = re.exec(clean))) {
      const isCreate = /^create/i.test(m[1]);
      const name = m[2].toLowerCase();
      const inner = balanced(clean, m.index + m[0].length - 1) ?? "";
      const params = isCreate ? parseParams(inner) : null;
      const arity = isCreate ? params!.length : splitTopLevel(inner).length;
      const list = (map.get(name) ?? []).filter((d) => d.params.length !== arity);
      if (isCreate) list.push({ name, params: params! });
      if (list.length) map.set(name, list);
      else map.delete(name);
    }
  }
  return map;
}

// ── استخراج النداءات من المصادر ─────────────────────────────────────────────

type Call = { name: string; keys: string[] | null };

function stripTsComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, "");
}

function objectKeys(objectInner: string): string[] | null {
  const keys: string[] = [];
  for (const prop of splitTopLevel(objectInner)) {
    const p = prop.trim();
    if (!p) continue;
    if (p.startsWith("...")) return null; // نشر: مفاتيح غير معلومة
    const m = /^(?:["'`]([A-Za-z_]\w*)["'`]|([A-Za-z_]\w*))\s*(?::|$)/.exec(p);
    if (!m) return null;
    keys.push(m[1] ?? m[2]);
  }
  return keys;
}

function extractRpc(src: string): { calls: Call[]; dynamic: string[] } {
  const clean = stripTsComments(src);
  const calls: Call[] = [];
  const dynamic: string[] = [];
  const lit = /\brpc\(\s*(["'`])([A-Za-z0-9_]+)\1\s*(,)?/g;
  let m: RegExpExecArray | null;
  while ((m = lit.exec(clean))) {
    let keys: string[] | null = [];
    if (m[3]) {
      const after = clean.slice(lit.lastIndex).trimStart();
      if (after.startsWith("{")) {
        const at = clean.indexOf("{", lit.lastIndex);
        keys = objectKeys(balanced(clean, at, "{", "}") ?? "");
      } else keys = null; // وسيط غير حرفي
    }
    calls.push({ name: m[2], keys });
  }
  const dyn = /\brpc\(\s*([A-Za-z_$][\w$.]*)\s*[,)]/g;
  while ((m = dyn.exec(clean))) dynamic.push(m[1]);
  return { calls, dynamic };
}

// ── الحكم ──────────────────────────────────────────────────────────────────

function undeclaredNames(calls: Call[], declared: Map<string, Decl[]>): string[] {
  return [...new Set(calls.map((c) => c.name))]
    .filter((n) => !declared.has(n.toLowerCase()))
    .sort();
}

/** نداءٌ لا يوافق أي توقيع مُعلَن: مفتاح مجهول أو معامل مطلوب غائب. */
function signatureMismatches(calls: Call[], declared: Map<string, Decl[]>): string[] {
  const bad: string[] = [];
  for (const c of calls) {
    const decls = declared.get(c.name.toLowerCase());
    if (!decls || c.keys === null) continue;
    if (decls.some((d) => d.params.some((p) => p.name === null))) continue; // أسماء مجهولة
    const ok = decls.some((d) => {
      const names = new Set(d.params.map((p) => p.name));
      return (
        c.keys!.every((k) => names.has(k)) &&
        d.params.filter((p) => p.required).every((p) => c.keys!.includes(p.name!))
      );
    });
    if (!ok) bad.push(`${c.name}({${c.keys.join(", ")}})`);
  }
  return bad.sort();
}

// ── الواقع ─────────────────────────────────────────────────────────────────

const MIGRATIONS = "supabase/migrations";

function listTs(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) return listTs(p);
    return /\.(ts|tsx)$/.test(f) && !/\.(test|spec)\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts")
      ? [p]
      : [];
  });
}

/** ملفات مسار الدردشة والاسترجاع: الذراع والمجمِّع والأدوات وبحث المستندات وراسم الدردشة. */
const RETRIEVAL_PATH_FILES = [
  ...listTs("src/lib/sadeed/rag"),
  ...listTs("src/lib/retrieval"),
  "src/lib/sadeed/rag.server.ts",
  "src/lib/sadeed/documents.functions.ts",
  "src/lib/sadeed/documents-search.server.ts",
  "src/lib/exec/tool-registry.server.ts",
  "src/lib/sadeed-tools.server.ts",
  "src/routes/api/chat.ts",
];

/** الاستثناء الوحيد للاسم الديناميكي: غلاف الذراع المتّجهية (أسماؤه حرفية عند نقاط النداء). */
const DYNAMIC_ALLOWED: ReadonlyArray<{ file: string; ident: string }> = [
  { file: "src/lib/sadeed/rag/vector-arm.server.ts", ident: "name" },
];

const forwardMigrations = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql") && !f.endsWith("_rollback.sql"))
  .sort()
  .map((f) => ({ file: f, sql: readFileSync(path.join(MIGRATIONS, f), "utf8") }));
const DECLARED = declaredFunctions(forwardMigrations);

const scanned = RETRIEVAL_PATH_FILES.filter((f) => existsSync(f)).map((f) => ({
  file: f,
  ...extractRpc(readFileSync(f, "utf8")),
}));
const ALL_CALLS = scanned.flatMap((s) => s.calls);

describe("① كل RPC في مسار الاسترجاع مُعلَن في الترحيلات", () => {
  it("ملفات المسار كلها موجودة — إعادة تسمية ملف لا تُسقطه من الفحص بصمت", () => {
    const missing = RETRIEVAL_PATH_FILES.filter((f) => !existsSync(f));
    expect(missing, `ملفات مسار الاسترجاع غير موجودة (حدّث العقد): ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("المُكتشَف ليس فارغًا ويضمّ الدوالّ الثلاث الجديدة (وإلا فالمستخرِج أعمى)", () => {
    const names = new Set(ALL_CALLS.map((c) => c.name));
    expect(names.size).toBeGreaterThanOrEqual(4);
    for (const n of ["sadeed_match_documents", "sadeed_match_knowledge", "sadeed_match_memory"])
      expect(names.has(n), `${n} لا يُنادى في أي ملف مسح`).toBe(true);
  });

  it("لا اسم غير مُعلَن: كل RPC تناديها هذه الملفات مُنشأة في ترحيلٍ أمامي ولم تُسقَط بعده", () => {
    expect(undeclaredNames(ALL_CALLS, DECLARED)).toEqual([]);
  });

  it("أسماء معاملات كل نداء توافق توقيعًا مُعلَنًا (لا مفتاح مجهول ولا معامل مطلوب غائب)", () => {
    expect(signatureMismatches(ALL_CALLS, DECLARED)).toEqual([]);
  });

  it("لا اسم RPC ديناميكي إلا الغلاف المسمّى", () => {
    const stray = scanned.flatMap((s) =>
      s.dynamic
        .filter((id) => !DYNAMIC_ALLOWED.some((a) => a.file === s.file && a.ident === id))
        .map((id) => `${s.file}: rpc(${id}, …)`),
    );
    expect(stray).toEqual([]);
  });

  it("الدوالّ القديمة aria_match_* بلا مُنادٍ واحد في مسار الدردشة (تبقى مُعلَنة في القاعدة للتراجع فقط)", () => {
    expect(ALL_CALLS.filter((c) => /^aria_match_/.test(c.name))).toEqual([]);
    // وهي ما زالت مُعلَنة: لا drop لها (التراجع يحتاجها).
    for (const n of ["aria_match_documents", "aria_match_knowledge", "aria_match_memory"])
      expect(DECLARED.has(n), `${n} أُسقطت من الترحيلات`).toBe(true);
  });

  it("الدوالّ الثلاث الجديدة مُعلَنة بتوقيعاتها المتّفق عليها", () => {
    const sig = (n: string) =>
      DECLARED.get(n)?.[0]
        ?.params.map((p) => p.name)
        .join(",");
    expect(sig("sadeed_match_documents")).toBe("_org_id,_query,_limit");
    expect(sig("sadeed_match_knowledge")).toBe("_org_id,_query,_tags,_limit");
    expect(sig("sadeed_match_memory")).toBe("_org_id,_query,_scope,_limit");
  });
});

// ── حالات حمراء مزروعة (المادة ٣٠): كل قاعدة أعلاه تسقط على انتهاكها ───────────────

describe("② حالات حمراء مزروعة — المُستخرِج والحكم يلتقطان الانتهاك", () => {
  const sql = (s: string) => [{ file: "x.sql", sql: s }];
  const declaredOf = (s: string) => declaredFunctions(sql(s));
  const callsOf = (ts: string) => extractRpc(ts).calls;

  it("مزروع: نداء لاسم لا يعلنه أي ترحيل ⇐ غير مُعلَن", () => {
    const declared = declaredOf(
      "create function public.known_fn(_a uuid) returns int as $$ select 1 $$ language sql;",
    );
    const calls = callsOf(
      'await supabase.rpc("ghost_fn_v2", { _a: 1 });\nawait supabase.rpc("known_fn", { _a: 1 });',
    );
    expect(undeclaredNames(calls, declared)).toEqual(["ghost_fn_v2"]);
  });

  it("مزروع: اسم أُعلن ثم أُسقط في ترحيلٍ لاحق ⇐ غير مُعلَن؛ وإسقاط توقيعٍ آخر بعدد مختلف لا يمحوه", () => {
    const created =
      "create or replace function public.gone_fn(_a uuid) returns int as $$ select 1 $$ language sql;";
    const dropped = declaredFunctions([
      { file: "1.sql", sql: created },
      { file: "2.sql", sql: "drop function if exists public.gone_fn(uuid);" },
    ]);
    expect(undeclaredNames(callsOf('rpc("gone_fn", { _a: 1 })'), dropped)).toEqual(["gone_fn"]);
    const otherArity = declaredFunctions([
      { file: "1.sql", sql: created },
      { file: "2.sql", sql: "drop function if exists public.gone_fn(uuid, uuid);" },
    ]);
    expect(undeclaredNames(callsOf('rpc("gone_fn", { _a: 1 })'), otherArity)).toEqual([]);
  });

  it("مزروع: اسم يذكره تعليق SQL فقط (create function داخل -- أو /* */) لا يُعدّ مُعلَنًا", () => {
    const declared = declaredOf(
      "-- create function public.only_in_comment(_a uuid)\n/* create or replace function public.also_comment(_a uuid) */\nselect 1;",
    );
    expect(declared.size).toBe(0);
  });

  it("مزروع: مفتاح مجهول (انحراف اسم معامل: _user_id بدل _org_id) ⇐ عدم توافق التوقيع", () => {
    const declared = declaredOf(
      "create or replace function public.sadeed_match_memory(_org_id uuid, _query vector(768), _scope text default null, _limit int default 6) returns int as $$ select 1 $$ language sql;",
    );
    const bad = callsOf(
      'rpc("sadeed_match_memory", { _user_id: u, _query: q, _scope: null, _limit: 6 })',
    );
    expect(signatureMismatches(bad, declared)).toEqual([
      "sadeed_match_memory({_user_id, _query, _scope, _limit})",
    ]);
  });

  it("مزروع: معامل مطلوب غائب (_org_id) ⇐ عدم توافق؛ وغياب الاختياري (_scope/_limit) مقبول", () => {
    const declared = declaredOf(
      "create or replace function public.sadeed_match_memory(_org_id uuid, _query vector(768), _scope text default null, _limit int default 6) returns int as $$ select 1 $$ language sql;",
    );
    expect(
      signatureMismatches(callsOf('rpc("sadeed_match_memory", { _query: q })'), declared),
    ).toHaveLength(1);
    expect(
      signatureMismatches(
        callsOf('rpc("sadeed_match_memory", { _org_id: o, _query: q })'),
        declared,
      ),
    ).toEqual([]);
  });

  it("مزروع: نداء متعدّد الأسطر وشكل مختصر shorthand يُلتقطان؛ والنشر (...args) يُسجَّل «لم يُفحص» لا مطابقة", () => {
    const multi = callsOf(
      'await client\n  .rpc(\n    "fn_a",\n    {\n      _x: 1,\n      shorthand,\n      "_quoted": 2,\n    },\n  );',
    );
    expect(multi).toEqual([{ name: "fn_a", keys: ["_x", "shorthand", "_quoted"] }]);
    expect(callsOf('rpc("fn_b", { ...args })')).toEqual([{ name: "fn_b", keys: null }]);
    expect(callsOf('rpc("fn_c", args)')).toEqual([{ name: "fn_c", keys: null }]);
    expect(callsOf('rpc("fn_d")')).toEqual([{ name: "fn_d", keys: [] }]);
  });

  it("مزروع: اسم RPC ديناميكي (متغيّر) يُلتقط؛ وتعليق أو تعريف نوع لا يُلتقطان", () => {
    expect(extractRpc("await db.rpc(fnName, { a: 1 });").dynamic).toEqual(["fnName"]);
    expect(
      extractRpc("// db.rpc(\"commented_out\", {})\n/* rpc('block_comment') */").calls,
    ).toEqual([]);
    expect(extractRpc("type X = { rpc: (name: string, args: object) => void };").dynamic).toEqual(
      [],
    );
  });

  it("مزروع: مُنادٍ لدالّة قديمة aria_match_* يُلتقط بمرشّح القاعدة نفسه", () => {
    const calls = callsOf('rpc("aria_match_documents", { _user_id: u, _query: q })');
    expect(calls.filter((c) => /^aria_match_/.test(c.name))).toHaveLength(1);
  });

  it("مزروع: معاملات بلا أسماء (توقيع بالأنواع فقط) لا تُفحص مفاتيحها بدل أن تُرفض ظلمًا", () => {
    const declared = declaredOf(
      "create function public.typed_only(uuid, text) returns int as $$ select 1 $$ language sql;",
    );
    expect(signatureMismatches(callsOf('rpc("typed_only", { anything: 1 })'), declared)).toEqual(
      [],
    );
  });
});
