// Server-only ARIA corpus seeding helper. Used by the runtime pulse to
// auto-seed an org's knowledge base on first activation. Idempotent.
import { embedText, toPgVector } from "./embeddings.server";

type Entry = { title: string; source: string; tags: string[]; content: string };

// Re-import the corpus from the client-safe functions module so we keep one
// source of truth. The functions module only exports the createServerFn —
// the CORPUS constant is internal — so we duplicate a thin pointer here by
// dynamically requiring the same data through a shared module if needed.
// For now we re-declare a minimal corpus reference; the canonical full
// corpus lives in seed-corpus.functions.ts and is still inserted via the
// admin button. This auto-seed path inserts a compact "starter" pack so
// ARIA has grounding immediately after first login.
const STARTER_CORPUS: Entry[] = [
  {
    title: "ميثاق إدارة الأمن الصناعي — المنطقة الغربية",
    source: "policy/charter",
    tags: ["governance", "charter", "ar"],
    content:
      "تتولى إدارة الأمن الصناعي بالمنطقة الغربية حماية الأصول والأفراد والعمليات في مواقع جدة ومكة المكرمة وينبع وفق NFPA 600 و ISO 28000 و ISPS و OSHA 1910، بمنهجية وقاية–استجابة–تحسين.",
  },
  {
    title: "Industrial Security Department — Operating Charter",
    source: "policy/charter-en",
    tags: ["governance", "charter", "en"],
    content:
      "Industrial Security (Western Region) safeguards assets, personnel and operations across Jeddah, Makkah and Yanbu, aligned to NFPA 600, ISO 28000, ISPS and OSHA 1910. Model: Prevent → Respond → Improve.",
  },
  {
    title: "Incident Severity P1–P5",
    source: "policy/incident-severity",
    tags: ["incidents", "policy"],
    content:
      "P1 life/production-threatening (15-min CEO notice), P2 high (30-min ops notice), P3 medium (4h response), P4 low (24h), P5 observation. Auto work-orders for P1/P2.",
  },
  {
    title: "Permit-to-Work essentials",
    source: "policy/ptw",
    tags: ["permits", "ptw"],
    content:
      "Hot work, confined-space and working-at-height need approved PTW with JSA, gas test (LEL<10%, O2 19.5–23.5%), fire watch and rescue plan. Max 12h validity.",
  },
  {
    title: "Visitor & contractor access",
    source: "policy/visitor-access",
    tags: ["access"],
    content:
      "Valid ID, host approval, 12-month safety induction, vehicle permit. Visitors escorted in restricted zones; contractors logged in sec_contractors with insurance and HSE certs.",
  },
  {
    title: "SOP — Control room triage",
    source: "sop/triage",
    tags: ["sop", "control-room"],
    content:
      "Within 60s: classify P1–P5, create sec_incidents record, dispatch nearest patrol, notify shift supervisor for P1/P2, open work order if asset impacted, update every 5 min.",
  },
];

type AdminClient = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        limit: (n: number) => Promise<{ data: Array<{ id?: string; title?: string }> | null }>;
      };
    };
    insert: (rows: unknown[]) => Promise<{ error: { message: string } | null }>;
  };
};

export async function autoSeedAriaCorpusForOrg(
  supabaseAdmin: AdminClient,
  orgId: string,
): Promise<{ inserted: number; skipped: number }> {
  const { data: existing } = await supabaseAdmin
    .from("aria_knowledge")
    .select("title")
    .eq("org_id", orgId)
    .limit(500);
  const have = new Set((existing ?? []).map((r) => r.title ?? ""));
  const todo = STARTER_CORPUS.filter((e) => !have.has(e.title));
  if (todo.length === 0) return { inserted: 0, skipped: STARTER_CORPUS.length };

  let inserted = 0;
  const CONCURRENCY = 3;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const slice = todo.slice(i, i + CONCURRENCY);
    const rows = await Promise.all(
      slice.map(async (e) => {
        const vec = await embedText(`${e.title}\n\n${e.content}`);
        if (!vec) return null;
        return {
          title: e.title,
          source: e.source,
          tags: e.tags,
          content: e.content,
          embedding: toPgVector(vec),
          org_id: orgId,
        };
      }),
    );
    const valid = rows.filter((r): r is NonNullable<typeof r> => r !== null);
    if (valid.length === 0) continue;
    const { error } = await supabaseAdmin.from("aria_knowledge").insert(valid);
    if (!error) inserted += valid.length;
  }
  return { inserted, skipped: STARTER_CORPUS.length - inserted };
}
