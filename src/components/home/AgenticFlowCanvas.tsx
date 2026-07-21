// Agentic Flow Canvas — n8n-style holographic topology.
// 4 columns: Sources → Agents → ARIA → Human Approval Gate.
// Bezier links with pulsing light animations. Pure SVG, no libraries.
// Read-only visualization for the showcase. is_simulation=true always.

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listShowcaseFlow, type FlowGraph, type FlowNode } from "@/lib/flow.functions";

const COL_X = { source: 90, agent: 380, aria: 700, gate: 980 } as const;
const NODE_W = { source: 160, agent: 220, aria: 200, gate: 220 } as const;
const NODE_H = { source: 44, agent: 62, aria: 92, gate: 78 } as const;
const CANVAS_H = 720;
const CANVAS_W = 1200;

const LINK_COLOR: Record<string, string> = {
  data: "#3AE8FF",
  result: "#00D4FF",
  command: "#FFD166",
  approval_suggestion: "#FF7A9A",
};

const SEVERITY_GLOW: Record<string, string> = {
  critical: "#FF5D73",
  high: "#FFB454",
  medium: "#3AE8FF",
  low: "#7AF0C3",
};

function layoutColumn(nodes: FlowNode[], columnX: number, h: number, nodeH: number) {
  const gap = Math.max(14, (CANVAS_H - nodes.length * nodeH) / (nodes.length + 1));
  return nodes.map((n, i) => ({
    node: n,
    x: columnX,
    y: gap + i * (nodeH + gap),
    w: NODE_W[n.kind],
    h,
  }));
}

function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

export function AgenticFlowCanvas({ ar }: { ar: boolean }) {
  const { data, isLoading, isError } = useQuery<FlowGraph>({
    queryKey: ["agentic-flow-graph"],
    queryFn: () => listShowcaseFlow(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const layout = useMemo(() => {
    if (!data) return null;
    const sources = data.nodes.filter((n) => n.kind === "source");
    const agents = data.nodes.filter((n) => n.kind === "agent");
    const aria = data.nodes.filter((n) => n.kind === "aria");
    const gate = data.nodes.filter((n) => n.kind === "gate");

    const positions = new Map<string, { x: number; y: number; w: number; h: number; node: FlowNode }>();
    for (const p of layoutColumn(sources, COL_X.source, NODE_H.source, NODE_H.source)) positions.set(p.node.id, p);
    for (const p of layoutColumn(agents, COL_X.agent, NODE_H.agent, NODE_H.agent)) positions.set(p.node.id, p);
    for (const p of layoutColumn(aria, COL_X.aria, NODE_H.aria, NODE_H.aria)) positions.set(p.node.id, p);
    for (const p of layoutColumn(gate, COL_X.gate, NODE_H.gate, NODE_H.gate)) positions.set(p.node.id, p);
    return { positions, sources, agents, aria, gate };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-[#3AE8FF]/20 bg-[#04101F]/70">
        <div className="text-xs text-white/60">
          {ar ? "جاري تحميل شبكة التنسيق…" : "Loading coordination network…"}
        </div>
      </div>
    );
  }

  if (isError || !data || !layout) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-[#3AE8FF]/20 bg-[#04101F]/70">
        <div className="text-xs text-white/60">
          {ar ? "تعذّر تحميل الشبكة" : "Unable to load network"}
        </div>
      </div>
    );
  }

  const edges = data.edges.filter(
    (e) => layout.positions.has(e.from) && layout.positions.has(e.to),
  );

  const columnHeaders = [
    { x: COL_X.source + NODE_W.source / 2, label: ar ? "المصادر" : "Sources", sub: ar ? "SAP · IoT · M365 · نفاذ" : "SAP · IoT · M365 · Nafath" },
    { x: COL_X.agent + NODE_W.agent / 2, label: ar ? "الوكلاء" : "Agents", sub: ar ? "13 وكيلًا متخصصًا" : "13 specialist agents" },
    { x: COL_X.aria + NODE_W.aria / 2, label: "ARIA", sub: ar ? "الذكاء المركزي" : "Executive Brain" },
    { x: COL_X.gate + NODE_W.gate / 2, label: ar ? "الاعتماد" : "Approval", sub: ar ? "بوابة بشرية" : "Human gate" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#3AE8FF]/25 bg-gradient-to-br from-[#04101F] via-[#061A2E] to-[#03080F] shadow-[0_0_60px_-20px_rgba(58,232,255,0.35)]">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_10%,rgba(58,232,255,0.15),transparent_50%),radial-gradient(circle_at_80%_90%,rgba(255,122,154,0.10),transparent_55%)]" />
      <div className="relative flex items-center justify-between px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-[#3AE8FF]/70 sm:px-6">
        <span>NEXIOS · Agentic Flow Canvas</span>
        <span className="rounded-full border border-[#3AE8FF]/30 bg-[#3AE8FF]/10 px-2 py-0.5 text-[9px] text-[#3AE8FF]">
          {ar ? "محاكاة مرجعية · بدون تنفيذ" : "Reference simulation · no execution"}
        </span>
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto w-full"
          aria-label={ar ? "لوحة تنسيق الوكلاء" : "Agent coordination canvas"}
        >
          <defs>
            <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="aria-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00D4FF" />
              <stop offset="100%" stopColor="#3AE8FF" />
            </linearGradient>
            <linearGradient id="gate-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFD166" />
              <stop offset="100%" stopColor="#FF7A9A" />
            </linearGradient>
          </defs>

          {/* Column headers */}
          {columnHeaders.map((c) => (
            <g key={c.label}>
              <text
                x={c.x}
                y={22}
                textAnchor="middle"
                className="fill-[#3AE8FF]"
                style={{ fontSize: 12, letterSpacing: 4, fontWeight: 600 }}
              >
                {c.label.toUpperCase()}
              </text>
              <text
                x={c.x}
                y={40}
                textAnchor="middle"
                className="fill-white/50"
                style={{ fontSize: 10 }}
              >
                {c.sub}
              </text>
            </g>
          ))}

          {/* Edges */}
          {edges.map((e, i) => {
            const from = layout.positions.get(e.from)!;
            const to = layout.positions.get(e.to)!;
            const x1 = from.x + from.w;
            const y1 = from.y + from.h / 2;
            const x2 = to.x;
            const y2 = to.y + to.h / 2;
            const color = LINK_COLOR[e.link_type] ?? "#3AE8FF";
            const opacity = Math.min(0.7, 0.25 + e.weight * 0.05);
            const path = bezierPath(x1, y1, x2, y2);
            const pulseId = `pulse-${i}`;
            return (
              <g key={`${e.from}-${e.to}-${e.link_type}`}>
                <path d={path} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={1 + e.weight * 0.1} />
                <path id={pulseId} d={path} fill="none" stroke="transparent" />
                <circle r={2.5} fill={color} opacity={0.9}>
                  <animateMotion
                    dur={`${3 + (i % 5) * 0.4}s`}
                    repeatCount="indefinite"
                    begin={`${(i % 7) * 0.3}s`}
                  >
                    <mpath href={`#${pulseId}`} />
                  </animateMotion>
                </circle>
              </g>
            );
          })}

          {/* Nodes */}
          {Array.from(layout.positions.values()).map((p) => {
            const { node, x, y, w, h } = p;
            const label = ar ? node.name_ar : node.name_en;
            const sub = node.current_mission
              ? node.current_mission.slice(0, 34)
              : node.specialty ?? "";
            const glow = node.severity ? SEVERITY_GLOW[node.severity] ?? "#3AE8FF" : "#3AE8FF";

            if (node.kind === "aria") {
              return (
                <g key={node.id} filter="url(#node-glow)">
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={16}
                    fill="url(#aria-gradient)"
                    fillOpacity={0.18}
                    stroke="#3AE8FF"
                    strokeWidth={1.5}
                  />
                  <text
                    x={x + w / 2}
                    y={y + 32}
                    textAnchor="middle"
                    className="fill-white"
                    style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2 }}
                  >
                    {label.toUpperCase()}
                  </text>
                  <text
                    x={x + w / 2}
                    y={y + 54}
                    textAnchor="middle"
                    className="fill-[#3AE8FF]"
                    style={{ fontSize: 10, letterSpacing: 3 }}
                  >
                    {ar ? "الذكاء التنفيذي" : "EXECUTIVE BRAIN"}
                  </text>
                  <text
                    x={x + w / 2}
                    y={y + 74}
                    textAnchor="middle"
                    className="fill-white/70"
                    style={{ fontSize: 10 }}
                  >
                    {ar ? "ينسّق · يقرر · يفوّض" : "orchestrate · decide · delegate"}
                  </text>
                </g>
              );
            }

            if (node.kind === "gate") {
              return (
                <g key={node.id} filter="url(#node-glow)">
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={14}
                    fill="url(#gate-gradient)"
                    fillOpacity={0.15}
                    stroke="#FFD166"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                  />
                  <text
                    x={x + w / 2}
                    y={y + 30}
                    textAnchor="middle"
                    className="fill-white"
                    style={{ fontSize: 13, fontWeight: 700 }}
                  >
                    {label}
                  </text>
                  <text
                    x={x + w / 2}
                    y={y + 50}
                    textAnchor="middle"
                    className="fill-[#FFD166]"
                    style={{ fontSize: 10, letterSpacing: 2 }}
                  >
                    {ar ? "لا تنفيذ بلا اعتماد" : "NO EXECUTION WITHOUT APPROVAL"}
                  </text>
                  <text
                    x={x + w / 2}
                    y={y + 66}
                    textAnchor="middle"
                    className="fill-white/60"
                    style={{ fontSize: 9 }}
                  >
                    {ar ? "قائد المركز · قائد المنطقة" : "Center chief · Regional chief"}
                  </text>
                </g>
              );
            }

            if (node.kind === "source") {
              return (
                <g key={node.id}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={10}
                    fill="#0a1f36"
                    stroke="#3AE8FF"
                    strokeOpacity={0.35}
                  />
                  <circle cx={x + 14} cy={y + h / 2} r={4} fill="#3AE8FF" />
                  <text
                    x={x + 26}
                    y={y + h / 2 + 4}
                    className="fill-white/85"
                    style={{ fontSize: 12 }}
                  >
                    {label}
                  </text>
                </g>
              );
            }

            // agent
            return (
              <g key={node.id}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={12}
                  fill="#071627"
                  stroke={glow}
                  strokeOpacity={0.55}
                />
                <circle cx={x + 14} cy={y + 16} r={4} fill={glow}>
                  <animate attributeName="opacity" values="1;0.35;1" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <text
                  x={x + 26}
                  y={y + 22}
                  className="fill-white"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {label}
                </text>
                {sub && (
                  <text
                    x={x + 14}
                    y={y + 44}
                    className="fill-white/55"
                    style={{ fontSize: 10 }}
                  >
                    {sub}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="relative flex flex-wrap items-center gap-3 border-t border-white/5 px-4 py-3 text-[10px] text-white/70 sm:px-6">
        {[
          { c: LINK_COLOR.data, l: ar ? "بيانات" : "Data" },
          { c: LINK_COLOR.result, l: ar ? "نتيجة" : "Result" },
          { c: LINK_COLOR.command, l: ar ? "أمر" : "Command" },
          { c: LINK_COLOR.approval_suggestion, l: ar ? "مقترح اعتماد" : "Approval suggestion" },
        ].map((x) => (
          <span key={x.l} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-6 rounded-full" style={{ background: x.c }} />
            {x.l}
          </span>
        ))}
        <span className="ms-auto text-white/40">
          {data.nodes.length} {ar ? "عقدة" : "nodes"} · {data.edges.length} {ar ? "رابطًا" : "links"}
        </span>
      </div>
    </div>
  );
}
