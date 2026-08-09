/**
 * RagSearchPage — phase-③ wiring surface for hybrid retrieval, colocated as
 * a non-route helper so the router code-splits it out.
 *
 * Ships DARK behind VITE_RAG_RETRIEVAL_ENABLED (NOT_GLOBAL, default OFF).
 * Auth-gated by design (same posture as finn_knowledge): a guest sees a
 * sign-in gate state, never an Unauthorized error. Renders chunks +
 * citations ONLY — no generation, no streaming, and the Gemini/SADEED path
 * is untouched by this surface.
 *
 * insufficient_evidence is rendered as a SUCCESSFUL, honest outcome
 * (session constant): a calm gold notice — never an error state.
 * Mandatory states: loading · empty(idle) · error · success (art. 14).
 */
import * as React from "react";
import { FileSearch, LockKeyhole, Search, ShieldQuestion } from "lucide-react";
import { NxEmptyState, NxErrorState, NxSkeleton } from "@/components/nx";
import { HoloVideoEngine } from "@/components/home/HoloVideoEngine";
import { useAuth } from "@/lib/auth-context";
import { isRagRetrievalEnabled, RAG_FLAG_NAME } from "@/lib/rag/flags";
import { RAG_DISPLAY_COUNT, ragRetrieve, type RagRetrieveResponse } from "@/lib/rag/client";

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; errorAr: string }
  | { kind: "done"; data: RagRetrieveResponse };

function pathsWord(n: number): string {
  if (n >= 3) return "ثلاثة مسارات متوافقة";
  if (n === 2) return "مساران متوافقان";
  return "مسار واحد";
}

export function RagSearchPage() {
  const { user, loading: authLoading } = useAuth();
  const enabled = isRagRetrievalEnabled();
  const [query, setQuery] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>({ kind: "idle" });
  const lastQueryRef = React.useRef("");

  const runSearch = React.useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    lastQueryRef.current = trimmed;
    setPhase({ kind: "loading" });
    const outcome = await ragRetrieve(trimmed);
    if (!outcome.ok) {
      setPhase({ kind: "error", errorAr: outcome.errorAr });
      return;
    }
    setPhase({ kind: "done", data: outcome.data });
  }, []);

  return (
    <div dir="rtl" className="min-h-dvh bg-nx-obsidian text-nx-pearl">
      {/* الخلفية الحية (قرار المالك ٢٠٢٦/٠٨/٠٥) — سطح داكن مثبَّت للغطاء. */}
      <div
        style={{
          ["--surface" as string]: "#04070d",
          ["--live" as string]: "rgb(var(--live-rgb, 34 211 238))",
        }}
      >
        <HoloVideoEngine />
      </div>
      <main className="relative mx-auto flex w-full max-w-4xl flex-col gap-4 px-3 py-6 md:px-6">
        <header>
          <h1 className="text-xl font-black md:text-2xl">البحث المعرفي — استرجاع بالاستشهاد</h1>
          <p className="mt-1 text-xs text-nx-pearl/64 md:text-sm">
            استرجاع هجين (دلالي + نصي عربي + مطبعي) من وثائق مؤسستك — مقاطع واستشهادات فقط، بلا
            توليد نص.
          </p>
        </header>

        {!enabled ? (
          <NxEmptyState
            icon={<ShieldQuestion aria-hidden className="size-8 text-nx-pearl/38" />}
            title="الميزة غير مفعّلة في هذه البيئة"
            description={`تُفعَّل لكل بيئة على حدة عبر متغير البيئة ${RAG_FLAG_NAME} — القرار للمشغّل.`}
          />
        ) : authLoading ? (
          <div aria-label="جارٍ التحقق من الجلسة" className="flex flex-col gap-3">
            <NxSkeleton className="h-12 w-full" />
            <NxSkeleton className="h-28 w-full" />
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center gap-3">
            <NxEmptyState
              icon={<LockKeyhole aria-hidden className="size-8 text-nx-pearl/38" />}
              title="تسجيل الدخول مطلوب"
              description="المعرفة معزولة لكل مؤسسة — يلزم حساب عضو لعرض وثائق مؤسستك."
            />
            <a
              href="/auth"
              className="rounded-nx-12 inline-flex min-h-11 items-center border border-nx-cyan/50 px-5 text-sm font-semibold text-nx-cyan hover:bg-nx-cyan/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
            >
              تسجيل الدخول
            </a>
          </div>
        ) : (
          <>
            <form
              className="nx-glass-e1 rounded-nx-16 flex items-center gap-2 border border-white/10 p-2"
              onSubmit={(e) => {
                e.preventDefault();
                void runSearch(query);
              }}
            >
              <Search aria-hidden className="ms-2 size-4 shrink-0 text-nx-pearl/48" />
              <label htmlFor="rag-query" className="sr-only">
                نص البحث
              </label>
              <input
                id="rag-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="مثال: ما نطاق توجيه محطات التحويل الكهربائية؟"
                className="min-h-11 w-full bg-transparent text-sm text-nx-pearl outline-none placeholder:text-nx-pearl/38"
              />
              <button
                type="submit"
                disabled={phase.kind === "loading" || query.trim().length === 0}
                className="rounded-nx-12 inline-flex min-h-11 shrink-0 items-center bg-nx-cyan px-5 text-sm font-bold text-nx-obsidian disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                بحث
              </button>
            </form>

            {phase.kind === "idle" ? (
              <NxEmptyState
                icon={<FileSearch aria-hidden className="size-8 text-nx-pearl/38" />}
                title="اسأل عن توجيه أو تصريح"
                description="كل نتيجة تصل باستشهادها: رمز الوثيقة، عنوانها، مصدرها، ورقم المقطع."
              />
            ) : null}

            {phase.kind === "loading" ? (
              <div aria-label="جارٍ الاسترجاع" className="flex flex-col gap-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <NxSkeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : null}

            {phase.kind === "error" ? (
              <NxErrorState
                title="تعذّر الاسترجاع"
                description={phase.errorAr}
                onRetry={() => void runSearch(lastQueryRef.current)}
              />
            ) : null}

            {phase.kind === "done" ? (
              <>
                {phase.data.degraded ? (
                  <p className="rounded-nx-12 border border-nx-info/40 px-3 py-2 text-xs text-nx-info">
                    المسار الدلالي غير متاح مؤقتًا — النتائج من البحث النصي والمطبعي فقط.
                  </p>
                ) : null}

                {phase.data.insufficient_evidence ? (
                  <p
                    role="status"
                    data-testid="rag-insufficient"
                    className="rounded-nx-12 border border-nx-gold/50 bg-nx-gold/5 px-3 py-2 text-sm text-nx-gold"
                  >
                    لا أدلة كافية للاستشهاد بثقة — هذه نتيجة صحيحة لا خطأ. جرّب صياغة أدق أو رمز
                    التوجيه مباشرة.
                  </p>
                ) : null}

                {phase.data.results.length === 0 && !phase.data.insufficient_evidence ? (
                  <NxEmptyState
                    icon={<FileSearch aria-hidden className="size-8 text-nx-pearl/38" />}
                    title="لا نتائج"
                    description="لا مقاطع مطابقة في وثائق مؤسستك لهذا الاستعلام."
                  />
                ) : null}

                <ul className="flex flex-col gap-3" aria-label="نتائج الاسترجاع">
                  {phase.data.results.slice(0, RAG_DISPLAY_COUNT).map((r) => (
                    <li
                      key={r.chunk_id}
                      className="nx-glass-e1 rounded-nx-12 flex flex-col gap-2 border border-white/10 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="rounded-full border border-nx-cyan/50 px-2 py-0.5 font-semibold text-nx-cyan">
                          {r.citation.code ?? r.citation.title}
                        </span>
                        <span className="text-nx-pearl/64">{r.citation.title}</span>
                        <bdi dir="ltr" className="text-nx-pearl/56">
                          {r.citation.source}
                        </bdi>
                        <span className="text-nx-pearl/56">
                          · مقطع {r.citation.chunk_index + 1}
                        </span>
                        <span className="text-nx-pearl/56">· {pathsWord(r.matched_paths)}</span>
                        {r.is_simulation ? (
                          <span className="rounded-full border border-nx-gold/50 px-2 py-0.5 text-nx-gold">
                            محاكاة مرجعية
                          </span>
                        ) : null}
                      </div>
                      <p className="line-clamp-4 text-sm leading-relaxed text-nx-pearl/88">
                        {r.content}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
