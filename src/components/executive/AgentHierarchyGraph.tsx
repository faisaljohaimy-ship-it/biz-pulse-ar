/**
 * AgentHierarchyGraph — the holographic command tree (constitution art. 13):
 * ARIA at the apex, the specialist fleet beneath her, each agent's current
 * task as a child node, and a single emerald HUMAN-APPROVAL node at the
 * foot that every path flows into (art. 8 made visual). Light pulses run
 * DOWN the connectors — command intent descending, results converging on
 * the human gate.
 *
 * Pure SVG + CSS. Node halos animate on opacity/transform only; connector
 * "flow" is a travelling stroke-dash (the same idiom the peninsula uses),
 * paused wholesale under prefers-reduced-motion. A Replay button restarts
 * the flow so the last 24h of runs sweep the tree on demand. No chart
 * library, no new dependency.
 */
import { useMemo, useState } from "react";
import { Lock, RefreshCw } from "lucide-react";

type Sev = "critical" | "high" | "medium" | "healthy" | "idle";
const SEV_RGB: Record<Sev, string> = {
  critical: "248, 113, 113",
  high: "251, 191, 36",
  medium: "34, 211, 238",
  healthy: "16, 185, 129",
  idle: "100, 140, 190",
};

export type GraphAgent = {
  id: string;
  name: string;
  goal?: string | null;
  state?: string | null;
};
export type GraphRun = {
  agent_id: string;
  status: string;
  summary?: string | null;
  started_at?: string | null;
};

const stateToSev = (s?: string | null): Sev =>
  s === "failed"
    ? "critical"
    : s === "running"
      ? "medium"
      : s === "queued"
        ? "high"
        : s === "ready" || s === "succeeded"
          ? "healthy"
          : "idle";

const stateAr = (s?: string | null): string =>
  ({
    running: "قيد التشغيل",
    queued: "في الطابور",
    ready: "جاهز",
    idle: "خامل",
    failed: "متعثّر",
    succeeded: "منجز",
  })[s ?? ""] ?? "خامل";

/** Smooth cubic connector between two points (vertical control handles). */
function link(x1: number, y1: number, x2: number, y2: number): string {
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

export function AgentHierarchyGraph({
  agents,
  runs,
  ar = true,
}: {
  agents: GraphAgent[];
  runs: GraphRun[];
  ar?: boolean;
}) {
  const [replayKey, setReplayKey] = useState(0);
  const [sel, setSel] = useState<string | null>(null);

  const fleet = useMemo(() => agents.slice(0, 8), [agents]);
  const latestByAgent = useMemo(() => {
    const m = new Map<string, GraphRun>();
    for (const r of runs) {
      const prev = m.get(r.agent_id);
      if (!prev || (r.started_at ?? "") > (prev.started_at ?? "")) m.set(r.agent_id, r);
    }
    return m;
  }, [runs]);

  const W = 1000;
  const ARIA = { x: W / 2, y: 66 };
  const rowY = 250;
  const taskY = 402;
  const GATE = { x: W / 2, y: 556 };
  const n = Math.max(fleet.length, 1);
  const nodes = fleet.map((a, i) => {
    const x = n === 1 ? W / 2 : 96 + (i / (n - 1)) * (W - 192);
    return { ...a, x, y: rowY, run: latestByAgent.get(a.id) };
  });

  const selNode = nodes.find((nd) => nd.id === sel);
  const selRun = selNode?.run;

  return (
    <div dir={ar ? "rtl" : "ltr"} className="holo-card relative overflow-hidden rounded-2xl p-3">
      <div className="mb-1 flex items-center justify-between gap-2 px-1">
        <div className="text-sm font-semibold text-white/90">
          {ar ? "شجرة القيادة الهولوغرامية" : "Holographic command tree"}
        </div>
        <button
          type="button"
          onClick={() => setReplayKey((k) => k + 1)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-3 py-1 text-xs font-semibold text-[#8ff0ff] transition hover:bg-[#3AE8FF]/20"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          {ar ? "إعادة عرض التدفّق" : "Replay flow"}
        </button>
      </div>

      <svg
        key={replayKey}
        viewBox={`0 0 ${W} 620`}
        className="agraph h-auto w-full"
        role="img"
        aria-label={ar ? "شجرة الوكلاء الهرمية" : "Agent hierarchy"}
      >
        {/* Connectors: ARIA → agent → gate, all flowing downward. */}
        {nodes.map((nd) => {
          const sev = stateToSev(nd.run?.status ?? nd.state);
          const rgb = SEV_RGB[sev];
          return (
            <g key={`c-${nd.id}`}>
              <path d={link(ARIA.x, ARIA.y + 34, nd.x, nd.y - 26)} className="agraph-base" />
              <path
                d={link(ARIA.x, ARIA.y + 34, nd.x, nd.y - 26)}
                className="agraph-flow"
                style={{ stroke: `rgb(${rgb})` }}
              />
              <path d={link(nd.x, nd.y + 26, GATE.x, GATE.y - 30)} className="agraph-base" />
              <path
                d={link(nd.x, nd.y + 26, GATE.x, GATE.y - 30)}
                className="agraph-flow agraph-flow-2"
                style={{ stroke: `rgb(${rgb})` }}
              />
              {/* task child node under active agents */}
              {nd.run && (
                <line x1={nd.x} y1={nd.y + 26} x2={nd.x} y2={taskY - 9} className="agraph-base" />
              )}
            </g>
          );
        })}

        {/* ARIA apex */}
        <g onClick={() => setSel(null)} style={{ cursor: "pointer" }} aria-label="ARIA">
          <circle
            cx={ARIA.x}
            cy={ARIA.y}
            r={44}
            className="agraph-halo"
            style={{ fill: "rgba(58,232,255,0.10)" }}
          />
          <circle
            cx={ARIA.x}
            cy={ARIA.y}
            r={34}
            style={{ fill: "rgba(6,22,40,0.95)", stroke: "rgba(58,232,255,0.9)", strokeWidth: 2 }}
          />
          <text
            x={ARIA.x}
            y={ARIA.y + 6}
            textAnchor="middle"
            className="agraph-label"
            style={{ fontSize: 18, fill: "#8ff0ff", fontWeight: 700 }}
          >
            آريا
          </text>
        </g>

        {/* Agent fleet */}
        {nodes.map((nd) => {
          const sev = stateToSev(nd.run?.status ?? nd.state);
          const rgb = SEV_RGB[sev];
          const active = sel === nd.id;
          return (
            <g
              key={`a-${nd.id}`}
              onClick={() => setSel(active ? null : nd.id)}
              style={{ cursor: "pointer" }}
              aria-label={nd.name}
            >
              <circle
                cx={nd.x}
                cy={nd.y}
                r={active ? 32 : 26}
                className={sev === "medium" || sev === "critical" ? "agraph-halo" : undefined}
                style={{
                  fill: `rgba(${rgb},0.14)`,
                  stroke: `rgb(${rgb})`,
                  strokeWidth: active ? 3 : 1.6,
                }}
              />
              <text
                x={nd.x}
                y={nd.y + 4}
                textAnchor="middle"
                style={{ fontSize: 10.5, fill: "#e6f6ff", fontWeight: 600 }}
              >
                {nd.name.split(/\s+/)[0]}
              </text>
              {/* task node */}
              {nd.run && (
                <circle
                  cx={nd.x}
                  cy={taskY}
                  r={9}
                  style={{ fill: `rgba(${rgb},0.9)` }}
                  className="agraph-task"
                />
              )}
            </g>
          );
        })}

        {/* Human-approval terminal */}
        <g aria-label={ar ? "الاعتماد البشري" : "Human approval"}>
          <circle
            cx={GATE.x}
            cy={GATE.y}
            r={40}
            className="agraph-halo"
            style={{ fill: "rgba(16,185,129,0.12)" }}
          />
          <circle
            cx={GATE.x}
            cy={GATE.y}
            r={30}
            style={{ fill: "rgba(4,20,16,0.96)", stroke: "rgba(16,185,129,0.95)", strokeWidth: 2 }}
          />
        </g>
        <text
          x={GATE.x}
          y={GATE.y + 58}
          textAnchor="middle"
          style={{ fontSize: 12, fill: "#6ee7b7", fontWeight: 700 }}
        >
          {ar ? "الاعتماد البشري" : "Human approval"}
        </text>

        <style>{`
          .agraph-base { fill: none; stroke: rgba(120,160,200,0.18); stroke-width: 1.4; }
          .agraph-flow {
            fill: none; stroke-width: 2.2; stroke-linecap: round;
            stroke-dasharray: 14 150; stroke-dashoffset: 320;
            filter: drop-shadow(0 0 4px currentColor);
            animation: agraph-flow 2.4s linear infinite;
          }
          .agraph-flow-2 { animation-duration: 2.8s; animation-delay: 1.1s; }
          @keyframes agraph-flow { to { stroke-dashoffset: 0; } }
          .agraph-halo { animation: agraph-breathe 3.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
          @keyframes agraph-breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
          .agraph-task { animation: agraph-task 2.6s steps(14, jump-none) infinite; transform-box: fill-box; transform-origin: center; }
          @keyframes agraph-task { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
          @media (prefers-reduced-motion: reduce) {
            .agraph-flow, .agraph-halo, .agraph-task { animation: none !important; }
            .agraph-flow { stroke-dasharray: none; stroke-dashoffset: 0; opacity: 0.55; }
          }
        `}</style>
      </svg>

      {/* Foot: lock glyph inside the gate (drawn as HTML for crisp icon) */}
      <div
        className="pointer-events-none absolute inset-x-0 flex justify-center"
        style={{ bottom: "10.5%" }}
      >
        <Lock className="h-5 w-5 text-emerald-300" aria-hidden />
      </div>

      {/* Floating detail card on tap */}
      {selNode && (
        <div
          role="dialog"
          aria-label={selNode.name}
          className="holo-sev holo-sev-medium absolute inset-x-3 bottom-3 rounded-2xl bg-[#061A2E]/95 p-4 text-sm sm:inset-x-auto sm:end-3 sm:w-80"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-white">{selNode.name}</div>
            <button
              onClick={() => setSel(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:text-white"
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>
          {selNode.goal && <p className="mt-1 text-xs text-white/60">{selNode.goal}</p>}
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-white/50">{ar ? "الحالة" : "State"}:</span>
            <span className="font-semibold text-white/85">
              {stateAr(selRun?.status ?? selNode.state)}
            </span>
          </div>
          {selRun?.summary && (
            <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs leading-relaxed text-white/75">
              {selRun.summary}
            </div>
          )}
          <div className="mt-2 text-[10px] text-emerald-300/80">
            {ar ? "كل مسار ينتهي عند الاعتماد البشري" : "Every path ends at human approval"}
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentHierarchyGraph;
