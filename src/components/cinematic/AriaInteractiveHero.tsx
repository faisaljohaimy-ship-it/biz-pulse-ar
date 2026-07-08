import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowUp,
  Sparkles,
  ShieldAlert,
  Activity,
  Radio,
  BarChart3,
  Brain,
  Workflow,
  Loader2,
  Check,
} from "lucide-react";

type Demo = {
  q: string;
  qAr: string;
  tools: { name: string; nameAr: string; icon: typeof ShieldAlert }[];
  a: string;
  aAr: string;
};

const DEMOS: Demo[] = [
  {
    q: "Critical open incidents in Jeddah right now?",
    qAr: "ما الحوادث الحرجة المفتوحة في جدة الآن؟",
    tools: [
      { name: "sec_list_incidents", nameAr: "قائمة الحوادث", icon: ShieldAlert },
      { name: "sec_score_risk", nameAr: "تقييم المخاطر", icon: Activity },
    ],
    a: "3 critical incidents open at Jeddah Port — gas leak (P1, 14m), perimeter breach (P1, 41m), CCTV blackout zone C (P2). I dispatched Patrol Alpha, opened a work order for the leak sensor, and notified the duty officer. Risk index for the sector: 7.8/10 ↑.",
    aAr: "٣ حوادث حرجة مفتوحة في ميناء جدة — تسرّب غاز (P1، ١٤د)، خرق محيط (P1، ٤١د)، انقطاع كاميرات القطاع C (P2). أرسلت دورية ألفا، فتحت أمر صيانة لمستشعر التسرّب، وأبلغت ضابط النوبة. مؤشر الخطر للقطاع: ٧٫٨/١٠ ↑.",
  },
  {
    q: "Open a hot work permit for Tank 7 maintenance.",
    qAr: "افتح تصريح عمل ساخن لصيانة الخزان ٧.",
    tools: [
      { name: "sec_create_permit", nameAr: "إنشاء تصريح", icon: Workflow },
      { name: "sec_assign_patrol", nameAr: "تكليف دورية", icon: Radio },
    ],
    a: "Hot-work permit #HW-2438 issued for Tank 7, valid 08:00–14:00. Fire watch assigned to Team Bravo, gas test required every 30 min. Routed to HSE supervisor for approval.",
    aAr: "تم إصدار تصريح عمل ساخن #HW-2438 للخزان ٧، صالح من ٠٨:٠٠ إلى ١٤:٠٠. تكليف فريق برافو بحراسة الحريق، فحص الغاز كل ٣٠ دقيقة. أُحيل لمشرف HSE للموافقة.",
  },
  {
    q: "Brief me on this week's KPIs.",
    qAr: "اعرض مؤشرات الأداء لهذا الأسبوع.",
    tools: [
      { name: "sec_get_kpis", nameAr: "مؤشرات الأداء", icon: BarChart3 },
      { name: "exec_summary", nameAr: "ملخص تنفيذي", icon: Brain },
    ],
    a: "MTTR ↓ 18% (32m → 26m). Patrol compliance 96.4%. 142 incidents closed, 7 open. Permits issued 89, expired-on-time 100%. Risk trend: stable. Top driver: improved CCTV coverage in Yanbu.",
    aAr: "زمن الاستجابة ↓ ١٨٪ (٣٢د → ٢٦د). الالتزام بالدوريات ٩٦٫٤٪. ١٤٢ حادثاً مغلقاً، ٧ مفتوحة. تصاريح صادرة ٨٩، انتهت بالموعد ١٠٠٪. اتجاه المخاطر: مستقر. المحرّك الأبرز: تحسّن تغطية الكاميرات في ينبع.",
  },
];

const SUGGESTIONS_EN = [
  "List critical open incidents",
  "Schedule a patrol for the warehouse",
  "Generate this week's KPI brief",
  "Open a hot work permit",
];
const SUGGESTIONS_AR = [
  "اعرض الحوادث الحرجة المفتوحة",
  "اجدول دورية للمستودع",
  "ولّد ملخص KPI للأسبوع",
  "افتح تصريح عمل ساخن",
];

export function AriaInteractiveHero({ isAr }: { isAr: boolean }) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [demoIdx, setDemoIdx] = useState(0);
  const [phase, setPhase] = useState<"idle" | "thinking" | "tools" | "streaming" | "done">("idle");
  const [streamed, setStreamed] = useState("");
  const [toolDone, setToolDone] = useState<number[]>([]);
  const timersRef = useRef<number[]>([]);

  const demo = DEMOS[demoIdx];
  const question = isAr ? demo.qAr : demo.q;
  const answer = isAr ? demo.aAr : demo.a;

  const suggestions = useMemo(() => (isAr ? SUGGESTIONS_AR : SUGGESTIONS_EN), [isAr]);

  function clearTimers() {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }

  function runDemo(idx: number) {
    clearTimers();
    setDemoIdx(idx);
    setStreamed("");
    setToolDone([]);
    setPhase("thinking");
    const d = DEMOS[idx];
    timersRef.current.push(window.setTimeout(() => setPhase("tools"), 700));
    d.tools.forEach((_, i) => {
      timersRef.current.push(
        window.setTimeout(
          () => {
            setToolDone((p) => [...p, i]);
          },
          1100 + i * 550,
        ),
      );
    });
    const streamStart = 1100 + d.tools.length * 550 + 200;
    timersRef.current.push(window.setTimeout(() => setPhase("streaming"), streamStart));
    const text = isAr ? d.aAr : d.a;
    for (let i = 1; i <= text.length; i++) {
      timersRef.current.push(
        window.setTimeout(
          () => {
            setStreamed(text.slice(0, i));
            if (i === text.length) setPhase("done");
          },
          streamStart + i * 14,
        ),
      );
    }
  }

  // Auto-cycle demos
  useEffect(() => {
    runDemo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAr]);

  useEffect(() => {
    if (phase !== "done") return;
    const t = window.setTimeout(() => runDemo((demoIdx + 1) % DEMOS.length), 4200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, demoIdx]);

  useEffect(() => () => clearTimers(), []);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const t = input.trim();
    if (!t) return;
    // Funnel to demo entry — full ARIA requires auth
    navigate({ to: "/request-demo" });
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-3xl px-4" dir={isAr ? "rtl" : "ltr"}>
      {/* Headline */}
      <h1 className="mt-6 text-center text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
        <span
          className="block bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(135deg,#FFFFFF 0%,#D7EAF4 40%,#3AE8FF 100%)" }}
        >
          {isAr ? "تحدّث مع مؤسستك." : "Talk to your enterprise."}
        </span>
        <span
          className="mt-1 block bg-clip-text text-transparent text-2xl font-medium sm:text-3xl lg:text-4xl"
          style={{ backgroundImage: "linear-gradient(135deg,#6FFFE9 0%,#00D4FF 100%)" }}
        >
          {isAr ? "نفّذ. حلّل. قرّر — بأمر واحد." : "Act. Analyze. Decide — in one prompt."}
        </span>
      </h1>

      {/* Prompt input */}
      <form
        onSubmit={handleSubmit}
        className="group relative mt-8 overflow-hidden rounded-2xl border border-[var(--aria-cyan)]/30 bg-[#04121f]/70 p-1.5 shadow-[0_20px_80px_-20px_rgba(0,184,217,0.45)] backdrop-blur-xl transition focus-within:border-[var(--aria-aqua)]/70 focus-within:shadow-[0_25px_100px_-15px_rgba(58,232,255,0.55)]"
      >
        {/* animated gradient border */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-50"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, #3AE8FF 60deg, transparent 120deg, transparent 240deg, #00B8D9 300deg, transparent 360deg)",
            animation: "aria-spin-slow 8s linear infinite",
            mask: "linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)",
            WebkitMask: "linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            padding: 1,
          }}
        />
        <div className="relative flex items-end gap-2 rounded-xl bg-[#04121f]/80 p-3">
          <Sparkles className="mt-2 h-4 w-4 shrink-0 text-[var(--aria-aqua)]" />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            placeholder={
              isAr
                ? "اسأل ARIA… (مثال: اعرض الحوادث الحرجة في جدة)"
                : "Ask ARIA… (e.g. List critical incidents in Jeddah)"
            }
            className="flex-1 resize-none bg-transparent px-1 py-2 text-[15px] text-white outline-none placeholder:text-white/35"
          />
          <button
            type="submit"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#04121f] transition hover:scale-105"
            style={{
              backgroundImage:
                "linear-gradient(135deg,var(--aria-aqua),var(--aria-cyan-bright),var(--aria-cyan))",
              boxShadow: "0 8px 30px -8px rgba(58,232,255,0.7)",
            }}
            aria-label={isAr ? "إرسال" : "Send"}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Suggestions */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setInput(s)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/70 transition hover:border-[var(--aria-aqua)]/50 hover:bg-white/[0.08] hover:text-white"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Live demo transcript */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--aria-aqua)]" />
            {isAr ? "محادثة مباشرة" : "Live agent run"}
          </span>
          <span className="flex gap-1">
            {DEMOS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => runDemo(i)}
                aria-label={`demo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === demoIdx ? "w-6 bg-[var(--aria-aqua)]" : "w-1.5 bg-white/20 hover:bg-white/40"}`}
              />
            ))}
          </span>
        </div>

        <div className="space-y-3 px-4 py-4 text-[13px]">
          {/* user bubble */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--aria-cyan)]/15 px-3.5 py-2 text-white/90 ring-1 ring-[var(--aria-cyan)]/30">
              {question}
            </div>
          </div>

          {/* assistant */}
          <div className="flex items-start gap-2">
            <div
              className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg"
              style={{
                backgroundImage: "linear-gradient(135deg,var(--aria-aqua),var(--aria-cyan))",
              }}
            >
              <Sparkles className="h-3 w-3 text-[#04121f]" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {/* thinking */}
              {phase === "thinking" && (
                <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-white/55">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {isAr ? "ARIA تفكّر…" : "ARIA is thinking…"}
                </div>
              )}

              {/* tool chips */}
              {(phase === "tools" || phase === "streaming" || phase === "done") && (
                <div className="flex flex-wrap gap-1.5">
                  {demo.tools.map((t, i) => {
                    const done = toolDone.includes(i);
                    const Icon = t.icon;
                    return (
                      <span
                        key={t.name}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] transition ${
                          done
                            ? "border-[var(--aria-aqua)]/40 bg-[var(--aria-cyan)]/10 text-[var(--aria-aqua)]"
                            : "border-white/10 bg-white/5 text-white/50"
                        }`}
                      >
                        {done ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        <Icon className="h-3 w-3" />
                        <span className="font-mono">{isAr ? t.nameAr : t.name}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* streamed answer */}
              {(phase === "streaming" || phase === "done") && (
                <div className="rounded-xl bg-white/[0.03] px-3 py-2 leading-relaxed text-white/90">
                  {streamed}
                  {phase === "streaming" && (
                    <span className="ms-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-[var(--aria-aqua)]" />
                  )}
                  {phase === "done" && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--aria-aqua)]/80">
                      <Check className="h-3 w-3" />
                      {isAr ? "اكتمل · مُسجّل في سجل النشاط" : "Completed · audit-logged"}
                      <span className="ms-auto text-white/30">
                        {streamed.length} {isAr ? "حرف" : "chars"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
