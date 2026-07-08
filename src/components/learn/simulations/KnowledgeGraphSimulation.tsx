/**
 * KnowledgeGraphSimulation — semantic memory explorer.
 *
 * Pre-seeded corpus of executive "memories" (procedures, incidents, KPIs).
 * The learner types a query; a lightweight token-overlap ranker highlights
 * matching nodes in a small force-free graph. Three queries with results
 * mark the simulation complete.
 */
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Sparkles, BookOpen, CheckCircle2 } from "lucide-react";
import { updateProgress } from "@/lib/learn/lessons.functions";
import { cn } from "@/lib/utils";

interface Memory {
  id: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  tags: string[];
  x: number;
  y: number;
}

// Pre-computed positions on a 0..100 canvas — clustered by topic.
const MEMORIES: Memory[] = [
  {
    id: "m1",
    title_ar: "بروتوكول الإخلاء الحراري",
    title_en: "Thermal evacuation protocol",
    body_ar: "خطوات إخلاء عند تجاوز الحرارة 65°C: تنبيه، إغلاق تلقائي، توجيه المسار الآمن.",
    body_en: "Evacuation steps when >65°C: alert, auto-lock, safe-path guidance.",
    tags: ["evacuation", "fire", "temperature", "emergency", "protocol", "إخلاء", "حرارة", "طوارئ"],
    x: 18,
    y: 24,
  },
  {
    id: "m2",
    title_ar: "دورة تدقيق التصاريح الأسبوعية",
    title_en: "Weekly permit audit cycle",
    body_ar: "كل يوم أحد: تدقيق كل التصاريح المفتوحة، حذف المنتهية، إشعار المخالفين.",
    body_en: "Every Sunday: audit open permits, close expired, notify violators.",
    tags: ["permit", "audit", "compliance", "weekly", "تصريح", "تدقيق", "امتثال"],
    x: 78,
    y: 20,
  },
  {
    id: "m3",
    title_ar: "معدّل الاستجابة للحوادث Q3",
    title_en: "Q3 incident response rate",
    body_ar: "المتوسط 4.2 دقيقة، تحسّن 18% مقارنة بـ Q2، أفضل في الليل.",
    body_en: "Avg 4.2 min, 18% better than Q2, best at night.",
    tags: ["kpi", "incident", "response", "quarterly", "حادث", "استجابة", "مؤشر"],
    x: 22,
    y: 76,
  },
  {
    id: "m4",
    title_ar: "قائمة المقاولين المعتمدين",
    title_en: "Approved contractor list",
    body_ar: "43 مقاولاً معتمداً، 12 خضر، 8 قيد المراجعة، 3 محظورة مؤقتاً.",
    body_en: "43 approved, 12 green-listed, 8 under review, 3 temp-banned.",
    tags: ["contractor", "vendor", "approval", "list", "مقاول", "معتمد", "قائمة"],
    x: 80,
    y: 74,
  },
  {
    id: "m5",
    title_ar: "دليل الاستدعاء التصاعدي",
    title_en: "Escalation call tree",
    body_ar: "مستوى 1: مدير الوردية. مستوى 2: مدير العمليات. مستوى 3: الرئيس التنفيذي.",
    body_en: "L1: shift manager. L2: COO. L3: CEO.",
    tags: ["escalation", "contact", "emergency", "hierarchy", "تصعيد", "طوارئ", "تسلسل"],
    x: 50,
    y: 50,
  },
  {
    id: "m6",
    title_ar: "معايير الجودة ISO 27001",
    title_en: "ISO 27001 quality baselines",
    body_ar: "متطلبات التوثيق، ضوابط الوصول، مراجعة سنوية، سجل التغييرات.",
    body_en: "Documentation, access controls, annual review, change log.",
    tags: ["iso", "compliance", "standard", "quality", "معيار", "امتثال", "جودة"],
    x: 88,
    y: 46,
  },
  {
    id: "m7",
    title_ar: "خارطة تدفّق الزوّار في الأحداث الكبرى",
    title_en: "Visitor flow map for major events",
    body_ar: "3 بوابات دخول، مسار موحّد للخروج، سعة 4200 زائر/ساعة.",
    body_en: "3 entry gates, unified exit, 4200 visitors/hr capacity.",
    tags: ["visitor", "event", "flow", "capacity", "زائر", "حدث", "تدفق"],
    x: 12,
    y: 52,
  },
];

interface Props {
  slug: string;
  lang: "ar" | "en";
  onCompleted?: () => void;
}

function tokenize(q: string) {
  return q
    .toLowerCase()
    .split(/[\s،,.;:!?]+/)
    .filter((t) => t.length > 1);
}

function score(memory: Memory, tokens: string[], lang: "ar" | "en") {
  const hay = [
    memory.tags.join(" "),
    lang === "ar" ? memory.title_ar : memory.title_en,
    lang === "ar" ? memory.body_ar : memory.body_en,
  ]
    .join(" ")
    .toLowerCase();
  let s = 0;
  for (const t of tokens) if (hay.includes(t)) s += 1;
  return s;
}

export function KnowledgeGraphSimulation({ slug, lang, onCompleted }: Props) {
  const ar = lang === "ar";
  const persist = useServerFn(updateProgress);
  const [query, setQuery] = useState("");
  const [ranAt, setRanAt] = useState<number | null>(null);
  const [completedQueries, setCompletedQueries] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [] as Array<Memory & { score: number }>;
    const tokens = tokenize(query);
    return MEMORIES.map((m) => ({ ...m, score: score(m, tokens, lang) }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [query, lang]);

  useEffect(() => {
    if (!completed && completedQueries.length >= 3) {
      setCompleted(true);
      persist({ data: { slug, simulation_completed: true } })
        .then(() => onCompleted?.())
        .catch(() => {});
    }
  }, [completedQueries, completed, persist, slug, onCompleted]);

  function runQuery() {
    if (!query.trim()) return;
    setRanAt(Date.now());
    if (results.length > 0 && !completedQueries.includes(query.trim())) {
      setCompletedQueries((c) => [...c, query.trim()]);
    }
  }

  const highlighted = new Set(results.slice(0, 3).map((r) => r.id));
  const suggestions = ar
    ? ["بروتوكول الإخلاء", "تصاريح", "معدّل الاستجابة", "المقاولون المعتمدون", "معيار ISO"]
    : ["evacuation protocol", "permits", "response rate", "approved contractors", "ISO standard"];

  return (
    <div className="space-y-4" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-center gap-2 rounded-2xl border border-cyan-400/25 bg-[#04111F]/70 p-2">
        <Search className="ms-1 h-4 w-4 text-cyan-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runQuery();
          }}
          placeholder={
            ar
              ? "اسأل الذاكرة… (مثال: بروتوكول الإخلاء)"
              : "Query the memory… (e.g. evacuation protocol)"
          }
          className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        <button
          onClick={runQuery}
          className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-[#04111F] hover:bg-cyan-300"
        >
          {ar ? "استرجع" : "Recall"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQuery(s);
              setRanAt(Date.now());
              if (!completedQueries.includes(s)) setCompletedQueries((c) => [...c, s]);
            }}
            className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[11px] text-white/70 hover:border-cyan-400/40 hover:text-cyan-200"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        {/* Graph */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#04111F] p-2">
          <svg viewBox="0 0 100 100" className="block h-[300px] w-full">
            {/* Faint links */}
            {MEMORIES.map((a, i) =>
              MEMORIES.slice(i + 1).map((b) => {
                const share = a.tags.some((t) => b.tags.includes(t));
                if (!share) return null;
                return (
                  <line
                    key={`${a.id}-${b.id}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="rgba(0,212,255,0.12)"
                    strokeWidth="0.15"
                  />
                );
              }),
            )}
            {MEMORIES.map((m) => {
              const on = highlighted.has(m.id);
              return (
                <g key={m.id}>
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={on ? 4 : 2.5}
                    fill={on ? "#22d3ee" : "rgba(255,255,255,0.35)"}
                  />
                  {on && (
                    <circle
                      cx={m.x}
                      cy={m.y}
                      r={6.5}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="0.3"
                      opacity="0.6"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Results */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/60">
            <span>{ar ? "نتائج ARIA" : "ARIA results"}</span>
            <span>
              {ar
                ? `استعلامات: ${completedQueries.length}/3`
                : `Queries: ${completedQueries.length}/3`}
            </span>
          </div>
          {ranAt === null && (
            <div className="grid h-40 place-items-center text-xs text-white/50">
              <div className="text-center">
                <Sparkles className="mx-auto mb-2 h-6 w-6 text-white/30" />
                {ar
                  ? "شغّل استعلاماً لبدء رؤية ذاكرة ARIA"
                  : "Run a query to explore ARIA's memory"}
              </div>
            </div>
          )}
          {ranAt !== null && results.length === 0 && (
            <div className="grid h-40 place-items-center text-xs text-white/50">
              {ar ? "لا مطابقات. جرّب مفردات مختلفة." : "No matches. Try different words."}
            </div>
          )}
          {results.length > 0 && (
            <ul className="space-y-2">
              {results.slice(0, 4).map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] p-2"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                      <BookOpen className="h-3.5 w-3.5 text-cyan-300" />
                      {ar ? r.title_ar : r.title_en}
                    </div>
                    <span className="rounded-full bg-cyan-400/15 px-1.5 text-[10px] text-cyan-200">
                      ×{r.score}
                    </span>
                  </div>
                  <div className="text-[11px] leading-relaxed text-white/70">
                    {ar ? r.body_ar : r.body_en}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {completed && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] px-3 py-1.5 text-xs text-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" /> {ar ? "تمّ حفظ التقدّم" : "Progress saved"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
