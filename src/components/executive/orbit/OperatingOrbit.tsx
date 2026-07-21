/**
 * OperatingOrbit — the home-page system hero (constitution arts. 8, 13, 14, 21).
 *
 * ONE component, two tabs on a single data source:
 *   • «الحلقة الحية»   — concentric orbit: ARIA core, the agent ring, task
 *                        pulses, and the terminal human-approval gate.
 *   • «معمارية النظام» — four connected layers: sources → intelligence →
 *                        automations → the same human gate.
 *
 * Performance contract (production once crashed under animation weight):
 *   pure SVG + CSS · no chart/animation library · no canvas · motion ONLY on
 *   transform/opacity/stroke-dashoffset (never box-shadow/filter/blur) · the
 *   inactive tab is unmounted, so ≤ ANIMATED_ELEMENT_BUDGET elements animate
 *   at once · an IntersectionObserver freezes ALL motion off-screen ·
 *   prefers-reduced-motion renders the full static, fully-labelled state.
 *
 * Data: a single `getAgentOpsOverview` read (open showcase, resilient → never
 * empty) folded with badged reference sims via `shapeOrbitData`. A failed /
 * pending fetch keeps the reference so the hero never blanks (art. 14).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Lock, HelpCircle, X, ArrowLeft } from "lucide-react";
import { getAgentOpsOverview } from "@/lib/exec.functions";
import {
  PHASES,
  SEV_AR,
  SEV_RGB,
  WALKTHROUGH,
  shapeOrbitData,
  type OrbitAgent,
  type OrbitData,
  type Sev,
} from "./operating-orbit-model";

type Selection =
  | { kind: "agent"; agent: OrbitAgent }
  | { kind: "source"; id: string; name: string; status: string }
  | { kind: "automation"; id: string; name: string; runsToday: number; lastAr: string }
  | { kind: "gate"; pending: number }
  | null;

type Tab = "orbit" | "board";

export function OperatingOrbit({ ar = true }: { readonly ar?: boolean }) {
  const overviewFn = useServerFn(getAgentOpsOverview);
  const { data } = useQuery({
    queryKey: ["operating-orbit", "agent-ops"],
    queryFn: () => overviewFn(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 0,
  });
  const model: OrbitData = useMemo(() => shapeOrbitData(data ?? null), [data]);

  const [tab, setTab] = useState<Tab>("orbit");
  const [sel, setSel] = useState<Selection>(null);
  const [walk, setWalk] = useState<number | null>(null);

  // Motion is ON by default (so the orbit is always alive when viewed); the
  // observer only FREEZES it once the hero is confirmed off-screen. A generous
  // rootMargin keeps it running through the natural scroll past it.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [live, setLive] = useState(true);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setLive(entries[0]?.isIntersecting ?? true), {
      rootMargin: "200px 0px",
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const highlight = walk == null ? null : WALKTHROUGH[walk].key;

  return (
    <div
      ref={rootRef}
      dir={ar ? "rtl" : "ltr"}
      data-live={live ? "1" : "0"}
      className="oo-root holo-card relative overflow-hidden rounded-2xl p-3 sm:p-4"
      aria-label={ar ? "مركز سيطرة النظام" : "System control center"}
    >
      {/* Top status line — the whole system in one sentence (art. 21). */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300">
          <span className="oo-dot oo-anim inline-block h-2 w-2 rounded-full bg-emerald-400" />
          {ar ? "النظام يعمل" : "System live"}
        </span>
        <StatusStat n={model.system.agentsActive} label={ar ? "وكيلًا نشطًا" : "agents active"} />
        <StatusStat
          n={model.system.automationsRunning}
          label={ar ? "أتمتة جارية" : "automations"}
        />
        <StatusStat
          n={model.pendingApprovals}
          label={ar ? "بانتظار اعتمادك" : "awaiting you"}
          amber
        />
        <span className="ms-auto inline-flex items-center gap-2">
          {model.isSimulation && (
            <span className="rounded-full border border-amber-300/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
              {ar ? "بيانات محاكاة" : "simulation data"}
            </span>
          )}
          <button
            type="button"
            onClick={() => setWalk((w) => (w == null ? 0 : null))}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-3 py-1 text-[11px] font-semibold text-[#8ff0ff] transition hover:bg-[#3AE8FF]/20"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden />
            {ar ? "كيف يعمل النظام؟" : "How it works"}
          </button>
        </span>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label={ar ? "طرق العرض" : "Views"}
        className="mb-3 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1 text-xs"
      >
        {(
          [
            ["orbit", ar ? "الحلقة الحية" : "Living Orbit"],
            ["board", ar ? "معمارية النظام" : "System Architecture"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setSel(null);
            }}
            className={`min-h-[44px] rounded-full px-4 py-1 font-semibold transition ${
              tab === id ? "bg-[#3AE8FF]/20 text-[#8ff0ff]" : "text-white/60 hover:text-white/90"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "orbit" ? (
        <OrbitView model={model} onSelect={setSel} highlight={highlight} ar={ar} />
      ) : (
        <BoardView model={model} onSelect={setSel} highlight={highlight} ar={ar} />
      )}

      {/* Compact colour key (art. 21). */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/60">
        {(["medium", "high", "healthy", "critical", "idle"] as Sev[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: `rgb(${SEV_RGB[s]})` }}
            />
            {SEV_AR[s]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 text-emerald-300/80">
          <Lock className="h-3 w-3" aria-hidden /> {ar ? "اعتماد بشري" : "human gate"}
        </span>
      </div>

      {walk != null && (
        <Walkthrough index={walk} onStep={setWalk} onClose={() => setWalk(null)} ar={ar} />
      )}
      {sel && <DetailCard sel={sel} onClose={() => setSel(null)} ar={ar} />}
    </div>
  );
}

function StatusStat({ n, label, amber }: { n: number; label: string; amber?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1 text-white/70">
      <b className={`text-sm font-extrabold ${amber ? "text-amber-300" : "text-white"}`}>{n}</b>
      {label}
    </span>
  );
}

/* ── Living Orbit ────────────────────────────────────────────────────────── */
const W = 1000;
const H = 664;
const C = { x: W / 2, y: 286 };
const R = 182;
const GATE = { x: W / 2, y: 560 };

function OrbitView({
  model,
  onSelect,
  highlight,
  ar,
}: {
  model: OrbitData;
  onSelect: (s: Selection) => void;
  highlight: string | null;
  ar: boolean;
}) {
  const agents = model.agents.slice(0, 8);
  const n = Math.max(agents.length, 1);
  const nodes = agents.map((a, i) => {
    const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { ...a, x: C.x + R * Math.cos(ang), y: C.y + R * Math.sin(ang) };
  });
  // Bound the animated flows well under budget.
  const active = nodes.filter((nd) => nd.sev === "medium" || nd.sev === "high").slice(0, 4);
  const proposalTargets = nodes.slice(0, Math.min(model.pendingApprovals, 3));
  const dim = (key: string) => (highlight && highlight !== key ? 0.28 : 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="oo-svg h-auto w-full"
      role="img"
      aria-label={ar ? "حلقة تشغيل النظام" : "System operating orbit"}
    >
      {/* Orbit guide ring */}
      <circle
        cx={C.x}
        cy={C.y}
        r={R}
        className="oo-ring"
        style={{ opacity: dim("intelligence") }}
      />

      {/* Radial command/result flows on active agents (cyan) */}
      <g style={{ opacity: dim("intelligence") }}>
        {active.map((nd) => (
          <path
            key={`f-${nd.id}`}
            d={`M ${C.x} ${C.y} L ${nd.x} ${nd.y}`}
            className="oo-flow oo-anim"
            style={{ stroke: `rgb(${SEV_RGB[nd.sev]})` }}
          />
        ))}
      </g>

      {/* Slow orbital sweep — the ≥60s "sense of life", not a vortex */}
      <g className="oo-sweep oo-anim" style={{ opacity: dim("intelligence") }}>
        <line x1={C.x} y1={C.y} x2={C.x} y2={C.y - R} className="oo-sweep-line" />
        <circle cx={C.x} cy={C.y - R} r={5} className="oo-sweep-dot" />
      </g>

      {/* Proposal pulses that travel to the gate and STOP there (amber) */}
      <g style={{ opacity: dim("gate") }}>
        {proposalTargets.map((nd) => (
          <g key={`p-${nd.id}`}>
            <path d={`M ${nd.x} ${nd.y} L ${GATE.x} ${GATE.y}`} className="oo-base" />
            <path
              d={`M ${nd.x} ${nd.y} L ${GATE.x} ${GATE.y}`}
              className="oo-flow oo-flow-gate oo-anim"
              style={{ stroke: "rgb(251,191,36)" }}
            />
          </g>
        ))}
      </g>

      {/* Agent ring nodes */}
      {nodes.map((nd) => {
        const rgb = SEV_RGB[nd.sev];
        const breathing = nd.sev === "medium" || nd.sev === "high";
        return (
          <g
            key={nd.id}
            tabIndex={0}
            role="button"
            aria-label={nd.name}
            style={{ cursor: "pointer", opacity: dim("intelligence") }}
            onClick={() => onSelect({ kind: "agent", agent: nd })}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && onSelect({ kind: "agent", agent: nd })
            }
          >
            <circle
              cx={nd.x}
              cy={nd.y}
              r={30}
              className={breathing ? "oo-halo oo-anim" : undefined}
              style={{ fill: `rgba(${rgb},0.14)`, stroke: `rgb(${rgb})`, strokeWidth: 1.6 }}
            />
            <text x={nd.x} y={nd.y + 4} textAnchor="middle" className="oo-node-label">
              {nd.name}
            </text>
          </g>
        );
      })}

      {/* ARIA core */}
      <g style={{ cursor: "default", opacity: dim("intelligence") }} aria-label="ARIA">
        <circle
          cx={C.x}
          cy={C.y}
          r={54}
          className="oo-halo oo-anim"
          style={{ fill: "rgba(58,232,255,0.10)" }}
        />
        <circle
          cx={C.x}
          cy={C.y}
          r={42}
          style={{ fill: "rgba(6,22,40,0.95)", stroke: "rgba(58,232,255,0.9)", strokeWidth: 2 }}
        />
        <text x={C.x} y={C.y - 2} textAnchor="middle" className="oo-core-label">
          آريا
        </text>
        <text x={C.x} y={C.y + 16} textAnchor="middle" className="oo-core-sub">
          التنسيق التنفيذي
        </text>
      </g>

      {/* Terminal human-approval gate */}
      <GateGlyph
        pending={model.pendingApprovals}
        onSelect={onSelect}
        highlight={highlight}
        ar={ar}
      />

      <OrbitStyle />
    </svg>
  );
}

/* ── System Architecture board ───────────────────────────────────────────── */
function BoardView({
  model,
  onSelect,
  highlight,
  ar,
}: {
  model: OrbitData;
  onSelect: (s: Selection) => void;
  highlight: string | null;
  ar: boolean;
}) {
  // Desktop: four columns right→left (RTL). Mobile: four stacked stages.
  const colX = { sources: 850, intel: 590, autom: 320, gate: 110 };
  const dim = (key: string) => (highlight && highlight !== key ? 0.3 : 1);
  const srcY = (i: number, len: number) => 120 + (i * (H - 240)) / Math.max(len - 1, 1);
  const sources = model.sources;
  const autom = model.automations;
  const agents = model.agents.slice(0, 6);

  return (
    <>
      {/* Permanent layer labels */}
      <div className="mb-1 flex justify-between px-2 text-[10px] font-semibold text-white/55">
        {PHASES.map((p) => (
          <span key={p.key} className={highlight && highlight !== p.key ? "opacity-40" : ""}>
            {p.labelAr}
          </span>
        ))}
      </div>

      {/* Mobile: the same four layers as a vertical flow, gate terminal (art. 21). */}
      <div className="sm:hidden">
        <BoardMobile model={model} onSelect={onSelect} ar={ar} />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="oo-svg hidden h-auto w-full sm:block"
        role="img"
        aria-label={ar ? "معمارية النظام" : "System architecture"}
      >
        {/* Connectors sources → intel, intel → autom, autom → gate */}
        <g>
          {sources.map((s, i) => (
            <path
              key={`cs-${s.id}`}
              d={`M ${colX.sources} ${srcY(i, sources.length)} C ${(colX.sources + colX.intel) / 2} ${srcY(i, sources.length)}, ${(colX.sources + colX.intel) / 2} ${C.y}, ${colX.intel} ${C.y}`}
              className="oo-base"
              style={{ opacity: dim("sources") }}
            />
          ))}
          {/* intel core → automations */}
          {autom.map((a, i) => (
            <path
              key={`ca-${a.id}`}
              d={`M ${colX.intel} ${C.y} C ${(colX.intel + colX.autom) / 2} ${C.y}, ${(colX.intel + colX.autom) / 2} ${srcY(i, autom.length)}, ${colX.autom} ${srcY(i, autom.length)}`}
              className="oo-base"
              style={{ opacity: dim("automations") }}
            />
          ))}
          {/* automations → gate, with a bounded set of travelling pulses that STOP at the gate */}
          {autom.map((a, i) => (
            <g key={`cg-${a.id}`} style={{ opacity: dim("gate") }}>
              <path
                d={`M ${colX.autom} ${srcY(i, autom.length)} C ${(colX.autom + colX.gate) / 2} ${srcY(i, autom.length)}, ${(colX.autom + colX.gate) / 2} ${C.y}, ${colX.gate + 44} ${C.y}`}
                className="oo-base"
              />
              {i < 4 && (
                <path
                  d={`M ${colX.autom} ${srcY(i, autom.length)} C ${(colX.autom + colX.gate) / 2} ${srcY(i, autom.length)}, ${(colX.autom + colX.gate) / 2} ${C.y}, ${colX.gate + 44} ${C.y}`}
                  className="oo-flow oo-flow-gate oo-anim"
                  style={{ stroke: "rgb(251,191,36)" }}
                />
              )}
            </g>
          ))}
        </g>

        {/* Layer 1 — sources */}
        {sources.map((s, i) => (
          <g
            key={s.id}
            tabIndex={0}
            role="button"
            aria-label={s.name}
            style={{ cursor: "pointer", opacity: dim("sources") }}
            onClick={() => onSelect({ kind: "source", id: s.id, name: s.name, status: s.status })}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              onSelect({ kind: "source", id: s.id, name: s.name, status: s.status })
            }
          >
            <rect
              x={colX.sources - 70}
              y={srcY(i, sources.length) - 16}
              width={140}
              height={32}
              rx={8}
              style={{ fill: "rgba(34,211,238,0.08)", stroke: "rgba(34,211,238,0.5)" }}
            />
            <text
              x={colX.sources}
              y={srcY(i, sources.length) + 4}
              textAnchor="middle"
              className="oo-tag"
            >
              {s.name}
            </text>
          </g>
        ))}

        {/* Layer 2 — intelligence (ARIA + agents) */}
        <g style={{ opacity: dim("intelligence") }}>
          {agents.map((a, i) => {
            const gy = 150 + (i * (H - 300)) / Math.max(agents.length - 1, 1);
            const gx = colX.intel + (i % 2 === 0 ? -66 : 66);
            const rgb = SEV_RGB[a.sev];
            return (
              <g
                key={a.id}
                tabIndex={0}
                role="button"
                aria-label={a.name}
                style={{ cursor: "pointer" }}
                onClick={() => onSelect({ kind: "agent", agent: a })}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") && onSelect({ kind: "agent", agent: a })
                }
              >
                <circle
                  cx={gx}
                  cy={gy}
                  r={17}
                  style={{ fill: `rgba(${rgb},0.14)`, stroke: `rgb(${rgb})`, strokeWidth: 1.4 }}
                />
                <text x={gx} y={gy + 3} textAnchor="middle" className="oo-mini">
                  {a.name}
                </text>
              </g>
            );
          })}
          <circle
            cx={colX.intel}
            cy={C.y}
            r={44}
            className="oo-halo oo-anim"
            style={{ fill: "rgba(58,232,255,0.10)" }}
          />
          <circle
            cx={colX.intel}
            cy={C.y}
            r={34}
            style={{ fill: "rgba(6,22,40,0.95)", stroke: "rgba(58,232,255,0.9)", strokeWidth: 2 }}
          />
          <text x={colX.intel} y={C.y + 5} textAnchor="middle" className="oo-core-label">
            آريا
          </text>
        </g>

        {/* Layer 3 — automations */}
        {autom.map((a, i) => (
          <g
            key={a.id}
            tabIndex={0}
            role="button"
            aria-label={a.name}
            style={{ cursor: "pointer", opacity: dim("automations") }}
            onClick={() =>
              onSelect({
                kind: "automation",
                id: a.id,
                name: a.name,
                runsToday: a.runsToday,
                lastAr: a.lastAr,
              })
            }
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              onSelect({
                kind: "automation",
                id: a.id,
                name: a.name,
                runsToday: a.runsToday,
                lastAr: a.lastAr,
              })
            }
          >
            <rect
              x={colX.autom - 78}
              y={srcY(i, autom.length) - 16}
              width={156}
              height={32}
              rx={8}
              style={{ fill: "rgba(16,185,129,0.07)", stroke: "rgba(16,185,129,0.45)" }}
            />
            <text
              x={colX.autom}
              y={srcY(i, autom.length) + 4}
              textAnchor="middle"
              className="oo-tag"
            >
              {a.name}
            </text>
          </g>
        ))}

        {/* Layer 4 — the barrier gate every path stops at */}
        <line
          x1={colX.gate + 44}
          y1={70}
          x2={colX.gate + 44}
          y2={H - 70}
          className="oo-barrier"
          style={{ opacity: dim("gate") }}
        />
        <GateGlyph
          pending={model.pendingApprovals}
          onSelect={onSelect}
          highlight={highlight}
          ar={ar}
          cx={colX.gate}
          cy={C.y}
        />

        <OrbitStyle />
      </svg>
    </>
  );
}

/** Mobile board: four stacked stages in data-flow order, gate terminal and
 *  prominent. Static (no SVG motion needed at this size) but fully labelled. */
function BoardMobile({
  model,
  onSelect,
  ar,
}: {
  model: OrbitData;
  onSelect: (s: Selection) => void;
  ar: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Sources */}
      <StageBox label={ar ? "المصادر" : "Sources"} tone="cyan">
        <div className="flex flex-wrap gap-1.5">
          {model.sources.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect({ kind: "source", id: s.id, name: s.name, status: s.status })}
              className="min-h-[44px] rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-100"
            >
              {s.name}
            </button>
          ))}
        </div>
      </StageBox>
      <FlowArrow />
      {/* Intelligence */}
      <StageBox label={ar ? "الذكاء" : "Intelligence"} tone="cyan">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-[#3AE8FF]/60 bg-[#3AE8FF]/15 px-3 py-1 text-[11px] font-bold text-[#8ff0ff]">
            آريا
          </span>
          {model.agents.slice(0, 8).map((a) => (
            <button
              key={a.id}
              onClick={() => onSelect({ kind: "agent", agent: a })}
              className="min-h-[44px] rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{
                background: `rgba(${SEV_RGB[a.sev]},0.14)`,
                color: `rgb(${SEV_RGB[a.sev]})`,
              }}
            >
              {a.name}
            </button>
          ))}
        </div>
      </StageBox>
      <FlowArrow />
      {/* Automations */}
      <StageBox label={ar ? "الأتمتة" : "Automations"} tone="emerald">
        <div className="flex flex-wrap gap-1.5">
          {model.automations.map((a) => (
            <button
              key={a.id}
              onClick={() =>
                onSelect({
                  kind: "automation",
                  id: a.id,
                  name: a.name,
                  runsToday: a.runsToday,
                  lastAr: a.lastAr,
                })
              }
              className="min-h-[44px] rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-100"
            >
              {a.name}
            </button>
          ))}
        </div>
      </StageBox>
      <FlowArrow />
      {/* Human gate — terminal */}
      <button
        onClick={() => onSelect({ kind: "gate", pending: model.pendingApprovals })}
        className="flex items-center justify-between gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-4 py-3 text-start"
      >
        <span className="inline-flex items-center gap-2 font-bold text-emerald-200">
          <Lock className="h-4 w-4" aria-hidden />
          {ar ? "الاعتماد البشري" : "Human approval"}
        </span>
        <span className="text-xs font-bold text-amber-300">
          {model.pendingApprovals} {ar ? "بانتظار اعتمادك" : "awaiting you"}
        </span>
      </button>
    </div>
  );
}

function StageBox({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "cyan" | "emerald";
  children: ReactNode;
}) {
  const c = tone === "cyan" ? "border-cyan-300/25" : "border-emerald-300/25";
  return (
    <div className={`rounded-xl border ${c} bg-white/[0.02] p-2.5`}>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/50">
        {label}
      </div>
      {children}
    </div>
  );
}

function FlowArrow() {
  return (
    <div
      className="mx-auto h-3 w-px bg-gradient-to-b from-emerald-300/50 to-transparent"
      aria-hidden
    />
  );
}

function GateGlyph({
  pending,
  onSelect,
  highlight,
  ar,
  cx = GATE.x,
  cy = GATE.y,
}: {
  pending: number;
  onSelect: (s: Selection) => void;
  highlight: string | null;
  ar: boolean;
  cx?: number;
  cy?: number;
}) {
  const dim = highlight && highlight !== "gate" ? 0.35 : 1;
  return (
    <g
      tabIndex={0}
      role="button"
      aria-label={ar ? "بوابة الاعتماد البشري" : "Human approval gate"}
      style={{ cursor: "pointer", opacity: dim }}
      onClick={() => onSelect({ kind: "gate", pending })}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect({ kind: "gate", pending })}
    >
      <circle
        cx={cx}
        cy={cy}
        r={46}
        className="oo-halo oo-anim"
        style={{ fill: "rgba(16,185,129,0.14)" }}
      />
      <circle
        cx={cx}
        cy={cy}
        r={34}
        style={{ fill: "rgba(4,20,16,0.96)", stroke: "rgba(16,185,129,0.95)", strokeWidth: 2 }}
      />
      {/* lock drawn in SVG so it scales with the gate */}
      <rect
        x={cx - 9}
        y={cy - 4}
        width={18}
        height={14}
        rx={2.5}
        style={{ fill: "rgb(110,231,183)" }}
      />
      <path
        d={`M ${cx - 5.5} ${cy - 4} v -4 a 5.5 5.5 0 0 1 11 0 v 4`}
        style={{ fill: "none", stroke: "rgb(110,231,183)", strokeWidth: 2.4 }}
      />
      <text x={cx} y={cy + 58} textAnchor="middle" className="oo-gate-label">
        {ar ? "الاعتماد البشري" : "Human approval"}
      </text>
      <text x={cx} y={cy + 76} textAnchor="middle" className="oo-gate-count">
        {pending} {ar ? "بانتظار اعتمادك" : "awaiting you"}
      </text>
    </g>
  );
}

function DetailCard({
  sel,
  onClose,
  ar,
}: {
  sel: NonNullable<Selection>;
  onClose: () => void;
  ar: boolean;
}) {
  let title = "";
  let rows: Array<[string, string]> = [];
  let to: string | null = null;
  if (sel.kind === "agent") {
    title = sel.agent.name;
    rows = [
      [ar ? "الحالة" : "State", sel.agent.stateAr],
      [ar ? "المهمة" : "Task", sel.agent.goal],
      [ar ? "المصدر" : "Source", "agent_runs · command_agents"],
    ];
    to = "/agents";
  } else if (sel.kind === "source") {
    title = sel.name;
    rows = [
      [ar ? "الدور" : "Role", ar ? "مصدر تشغيل" : "Data source"],
      [ar ? "الاتصال" : "Connection", sel.status],
      [ar ? "المصدر" : "Source", "integration_connectors"],
    ];
    to = "/integrations";
  } else if (sel.kind === "automation") {
    title = sel.name;
    rows = [
      [ar ? "تشغيلات اليوم" : "Runs today", String(sel.runsToday)],
      [ar ? "آخر تشغيل" : "Last run", sel.lastAr],
      [ar ? "المصدر" : "Source", "agent_runs"],
    ];
    to = "/agents";
  } else {
    title = ar ? "بوابة الاعتماد البشري" : "Human approval gate";
    rows = [
      [ar ? "بانتظار الاعتماد" : "Pending", String(sel.pending)],
      [
        ar ? "القاعدة" : "Rule",
        ar
          ? "لا فعل يمسّ الواقع بلا اعتماد (المادة ٨)"
          : "No real-world action without approval (art. 8)",
      ],
      [ar ? "المصدر" : "Source", "approval_pipeline"],
    ];
    to = "/agents";
  }
  return (
    <div
      role="dialog"
      aria-label={title}
      className="holo-sev holo-sev-medium absolute inset-x-3 bottom-3 z-20 rounded-2xl bg-[#061A2E]/95 p-4 text-sm sm:inset-x-auto sm:end-3 sm:w-80"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold text-white">{title}</div>
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 hover:text-white"
          aria-label={ar ? "إغلاق" : "Close"}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <dl className="mt-2 space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-3 text-xs">
            <dt className="text-white/50">{k}</dt>
            <dd className="text-end font-semibold text-white/85">{v}</dd>
          </div>
        ))}
      </dl>
      {to && (
        <Link
          to={to}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-3 py-1 text-xs font-semibold text-[#8ff0ff] transition hover:bg-[#3AE8FF]/20"
        >
          {ar ? "التفاصيل" : "Details"} <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function Walkthrough({
  index,
  onStep,
  onClose,
  ar,
}: {
  index: number;
  onStep: (i: number | null) => void;
  onClose: () => void;
  ar: boolean;
}) {
  const step = WALKTHROUGH[index];
  const last = index >= WALKTHROUGH.length - 1;
  return (
    <div
      role="dialog"
      aria-label={ar ? "شرح دورة النظام" : "System walkthrough"}
      className="absolute inset-x-3 top-16 z-20 rounded-2xl border border-[#3AE8FF]/30 bg-[#061A2E]/96 p-4 text-sm sm:inset-x-auto sm:start-3 sm:w-80"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#8ff0ff]">
          {index + 1} / {WALKTHROUGH.length}
        </div>
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 hover:text-white"
          aria-label={ar ? "إغلاق" : "Close"}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="mt-1 font-bold text-white">{step.titleAr}</div>
      <p className="mt-1 text-xs leading-relaxed text-white/75">{step.bodyAr}</p>
      <div className="mt-3 flex items-center justify-between">
        <button
          disabled={index === 0}
          onClick={() => onStep(index - 1)}
          className="min-h-[44px] rounded-full px-3 py-1 text-xs font-semibold text-white/70 disabled:opacity-30"
        >
          {ar ? "السابق" : "Back"}
        </button>
        <button
          onClick={() => (last ? onClose() : onStep(index + 1))}
          className="min-h-[44px] rounded-full border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-4 py-1 text-xs font-semibold text-[#8ff0ff]"
        >
          {last ? (ar ? "تم" : "Done") : ar ? "التالي" : "Next"}
        </button>
      </div>
    </div>
  );
}

/** Shared SVG animation styles — transform / opacity / stroke-dashoffset only.
 *  Every animated node carries `.oo-anim`; when the hero is off-screen
 *  (`[data-live="0"]`) or the user prefers reduced motion, all of it stops. */
function OrbitStyle() {
  return (
    <style>{`
      .oo-ring { fill: none; stroke: rgba(120,160,200,0.16); stroke-width: 1.2; stroke-dasharray: 3 7; }
      .oo-base { fill: none; stroke: rgba(120,160,200,0.18); stroke-width: 1.3; }
      .oo-flow { fill: none; stroke-width: 2.2; stroke-linecap: round;
        stroke-dasharray: 12 130; stroke-dashoffset: 260; animation: oo-flow 2.6s linear infinite; }
      .oo-flow-gate { animation-duration: 3s; }
      @keyframes oo-flow { to { stroke-dashoffset: 0; } }
      .oo-halo { transform-box: fill-box; transform-origin: center; animation: oo-breathe 3.6s ease-in-out infinite; }
      @keyframes oo-breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
      .oo-sweep { transform-box: view-box; transform-origin: ${C.x}px ${C.y}px; animation: oo-spin 60s linear infinite; }
      .oo-sweep-line { stroke: rgba(58,232,255,0.25); stroke-width: 1.2; }
      .oo-sweep-dot { fill: rgba(58,232,255,0.9); }
      @keyframes oo-spin { to { transform: rotate(360deg); } }
      .oo-dot { animation: oo-breathe 2.4s ease-in-out infinite; }
      .oo-barrier { stroke: rgba(16,185,129,0.5); stroke-width: 2; stroke-dasharray: 2 6; }
      .oo-node-label { font-size: 12px; fill: #e6f6ff; font-weight: 700; }
      .oo-mini { font-size: 8.5px; fill: #dff3ff; font-weight: 600; }
      .oo-tag { font-size: 12px; fill: #dff3ff; font-weight: 600; }
      .oo-core-label { font-size: 20px; fill: #8ff0ff; font-weight: 800; }
      .oo-core-sub { font-size: 9px; fill: rgba(143,240,255,0.7); }
      .oo-gate-label { font-size: 12px; fill: #6ee7b7; font-weight: 700; }
      .oo-gate-count { font-size: 11px; fill: rgba(251,191,36,0.95); font-weight: 700; }
      [data-live="0"] .oo-anim { animation: none !important; }
      @media (prefers-reduced-motion: reduce) {
        .oo-anim { animation: none !important; }
        .oo-flow { stroke-dasharray: none; stroke-dashoffset: 0; opacity: 0.55; }
        .oo-halo { opacity: 0.85; }
      }
    `}</style>
  );
}

export default OperatingOrbit;
