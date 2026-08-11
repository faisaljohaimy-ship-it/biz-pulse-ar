// Agentic Flow Canvas — n8n-style holographic topology.
// 4 columns: Sources → Agents → SADEED → Human Approval Gate.
// All Arabic labels rendered via <foreignObject> + dir="rtl" for correct
// shaping and bidi — never as raw SVG <text>.

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { listShowcaseFlow, type FlowGraph, type FlowNode } from "@/lib/flow.functions";
// اسم المساعد المعروض من مصدره الوحيد — لا يُكتب حرفًا هنا فيتخلّف عنه.
import { BRAND_ASSISTANT } from "@/lib/domain";

const COL_X = { source: 60, agent: 380, aria: 760, gate: 1020 } as const;
const NODE_W = { source: 190, agent: 260, aria: 220, gate: 240 } as const;
const NODE_H = { source: 52, agent: 74, aria: 108, gate: 96 } as const;
const CANVAS_W = 1260;
const HEADER_H = 56;
const ROW_GAP = 18;

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

type Positioned = { node: FlowNode; x: number; y: number; w: number; h: number };

function layoutColumn(
  nodes: FlowNode[],
  columnX: number,
  nodeH: number,
  startY: number,
): Positioned[] {
  return nodes.map((n, i) => ({
    node: n,
    x: columnX,
    y: startY + i * (nodeH + ROW_GAP),
    w: NODE_W[n.kind],
    h: nodeH,
  }));
}

function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

export interface AgenticFlowCanvasProps {
  ar: boolean;
  selectedAgentId?: string | null;
  onSelectAgent?: (agentId: string | null) => void;
  /** compact = home strip; full = /agents-flow dashboard */
  variant?: "compact" | "full";
}

export function AgenticFlowCanvas({
  ar,
  selectedAgentId = null,
  onSelectAgent,
  variant = "compact",
}: AgenticFlowCanvasProps) {
  const { data, isLoading, isError } = useQuery<FlowGraph>({
    queryKey: ["agentic-flow-graph"],
    queryFn: () => listShowcaseFlow(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const layout = useMemo(() => {
    if (!data) return null;
    const filtered = data.nodes.filter(
      (n) => (n.name_ar && n.name_ar.trim()) || (n.name_en && n.name_en.trim()),
    );
    const sources = filtered.filter((n) => n.kind === "source");
    const agents = filtered.filter((n) => n.kind === "agent");
    const aria = filtered.filter((n) => n.kind === "aria");
    const gate = filtered.filter((n) => n.kind === "gate");

    const positions = new Map<string, Positioned>();
    for (const p of layoutColumn(sources, COL_X.source, NODE_H.source, HEADER_H))
      positions.set(p.node.id, p);
    for (const p of layoutColumn(agents, COL_X.agent, NODE_H.agent, HEADER_H))
      positions.set(p.node.id, p);
    // Center SADEED vertically against agent column
    const agentColHeight = agents.length * (NODE_H.agent + ROW_GAP);
    const sadeedStart = HEADER_H + Math.max(0, agentColHeight / 2 - NODE_H.aria / 2);
    for (const p of layoutColumn(aria, COL_X.aria, NODE_H.aria, sadeedStart))
      positions.set(p.node.id, p);
    for (const p of layoutColumn(gate, COL_X.gate, NODE_H.gate, sadeedStart + 20))
      positions.set(p.node.id, p);

    const maxY = Math.max(...Array.from(positions.values()).map((p) => p.y + p.h), HEADER_H + 200);
    return { positions, sources, agents, aria, gate, height: maxY + 40 };
  }, [data]);

  // Chain highlight — compute upstream + downstream sets for the selected agent.
  // Must sit BEFORE any early-return so hook order stays stable.
  const chain = useMemo(() => {
    if (!selectedAgentId || !data) return null;
    const upstream = new Set<string>();
    const downstream = new Set<string>();
    for (const e of data.edges) {
      if (e.to === selectedAgentId) upstream.add(e.from);
      if (e.from === selectedAgentId) downstream.add(e.to);
    }
    for (const e of data.edges) {
      if (downstream.has(e.from)) downstream.add(e.to);
    }
    return { upstream, downstream };
  }, [selectedAgentId, data]);

  if (isLoading) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-[#3AE8FF]/20 bg-[#04101F]/70">
        <div dir="rtl" className="text-xs text-white/60">
          {ar ? "جاري تحميل شبكة التنسيق…" : "Loading coordination network…"}
        </div>
      </div>
    );
  }

  if (isError || !data || !layout) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-[#3AE8FF]/20 bg-[#04101F]/70">
        <div dir="rtl" className="text-xs text-white/60">
          {ar ? "تعذّر تحميل الشبكة" : "Unable to load network"}
        </div>
      </div>
    );
  }

  const edges = data.edges.filter(
    (e) => layout.positions.has(e.from) && layout.positions.has(e.to),
  );

  const columnHeaders = [
    {
      x: COL_X.source,
      w: NODE_W.source,
      label: ar ? "المصادر" : "Sources",
      sub: ar ? "SAP · IoT · M365 · نفاذ" : "SAP · IoT · M365 · Nafath",
    },
    {
      x: COL_X.agent,
      w: NODE_W.agent,
      label: ar ? "الوكلاء" : "Agents",
      sub: ar ? "13 وكيلًا متخصصًا" : "13 specialist agents",
    },
    {
      x: COL_X.aria,
      w: NODE_W.aria,
      label: ar ? BRAND_ASSISTANT.nameAr : BRAND_ASSISTANT.nameEn,
      sub: ar ? "الذكاء المركزي" : "Executive Brain",
    },
    {
      x: COL_X.gate,
      w: NODE_W.gate,
      label: ar ? "الاعتماد" : "Approval",
      sub: ar ? "بوابة بشرية" : "Human gate",
    },
  ];

  const CANVAS_H = Math.max(layout.height, variant === "full" ? 900 : 720);

  const isDimmed = (id: string) => {
    if (!chain || !selectedAgentId) return false;
    return id !== selectedAgentId && !chain.upstream.has(id) && !chain.downstream.has(id);
  };
  const edgeDimmed = (from: string, to: string) => {
    if (!chain || !selectedAgentId) return false;
    const inChain =
      from === selectedAgentId ||
      to === selectedAgentId ||
      (chain.upstream.has(from) && to === selectedAgentId) ||
      (chain.downstream.has(to) && chain.downstream.has(from)) ||
      (from === selectedAgentId && chain.downstream.has(to));
    return !inChain;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#3AE8FF]/25 bg-gradient-to-br from-[#04101F] via-[#061A2E] to-[#03080F] shadow-[0_0_60px_-20px_rgba(58,232,255,0.35)]">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_10%,rgba(58,232,255,0.15),transparent_50%),radial-gradient(circle_at_80%_90%,rgba(255,122,154,0.10),transparent_55%)]" />
      <div
        dir={ar ? "rtl" : "ltr"}
        className="relative flex items-center justify-between px-4 py-3 text-[12px] uppercase tracking-[0.3em] text-[#3AE8FF]/70 sm:px-6"
      >
        <span>SADEED · Agentic Flow Canvas</span>
        <Link
          to="/agents-reference"
          className="rounded-full border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-3 py-1 text-[12px] text-[#3AE8FF] transition hover:bg-[#3AE8FF]/20 hover:text-white"
          title={ar ? "افتح مرجع الوكلاء" : "Open agents reference"}
        >
          {ar ? "مرجع الوكلاء" : "Agents reference"}
        </Link>
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

          {/* Column headers — Arabic-safe via foreignObject */}
          {columnHeaders.map((c) => (
            <foreignObject key={c.label} x={c.x} y={8} width={c.w} height={44}>
              <div
                dir={ar ? "rtl" : "ltr"}
                style={{ unicodeBidi: "isolate" }}
                className="flex h-full flex-col items-center justify-center text-center leading-tight"
              >
                <div className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#3AE8FF]">
                  {c.label}
                </div>
                <div className="mt-0.5 text-[12px] text-white/55">{c.sub}</div>
              </div>
            </foreignObject>
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
            const dimmed = edgeDimmed(e.from, e.to);
            const opacity = dimmed ? 0.06 : Math.min(0.7, 0.25 + e.weight * 0.05);
            const path = bezierPath(x1, y1, x2, y2);
            const pulseId = `pulse-${i}`;
            return (
              <g key={`${e.from}-${e.to}-${e.link_type}-${i}`}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeOpacity={opacity}
                  strokeWidth={1 + e.weight * 0.1}
                />
                <path id={pulseId} d={path} fill="none" stroke="transparent" />
                {!dimmed && i < 24 && (
                  <circle r={2.5} fill={color} opacity={0.9}>
                    <animateMotion
                      dur={`${3 + (i % 5) * 0.4}s`}
                      repeatCount="indefinite"
                      begin={`${(i % 7) * 0.3}s`}
                    >
                      <mpath href={`#${pulseId}`} />
                    </animateMotion>
                  </circle>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {Array.from(layout.positions.values()).map((p) => {
            const { node, x, y, w, h } = p;
            const label = ar ? node.name_ar || node.name_en : node.name_en || node.name_ar;
            const enSub = ar && node.name_en && node.name_en !== node.name_ar ? node.name_en : null;
            const sub = node.current_mission ?? node.specialty ?? "";
            const glow = node.severity ? (SEVERITY_GLOW[node.severity] ?? "#3AE8FF") : "#3AE8FF";
            const dimmed = isDimmed(node.id);
            const selected = selectedAgentId === node.id;
            const clickable = node.kind === "agent" && !!onSelectAgent;

            const handleClick = clickable
              ? () => onSelectAgent?.(selected ? null : node.id)
              : undefined;

            const commonG = {
              opacity: dimmed ? 0.18 : 1,
              style: { cursor: clickable ? "pointer" : "default", transition: "opacity 200ms" },
              onClick: handleClick,
              "data-agent-id": node.id,
            } as const;

            if (node.kind === "aria") {
              return (
                <g key={node.id} filter="url(#node-glow)" {...commonG}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={16}
                    fill="url(#aria-gradient)"
                    fillOpacity={0.18}
                    stroke="#3AE8FF"
                    strokeWidth={selected ? 2.5 : 1.5}
                  />
                  <foreignObject x={x} y={y} width={w} height={h}>
                    <div
                      dir={ar ? "rtl" : "ltr"}
                      style={{ unicodeBidi: "isolate" }}
                      className="flex h-full w-full flex-col items-center justify-center text-center leading-tight"
                    >
                      <div className="text-[22px] font-bold tracking-[0.15em] text-white">
                        {ar ? BRAND_ASSISTANT.nameAr : BRAND_ASSISTANT.nameEn}
                      </div>
                      <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.3em] text-[#3AE8FF]">
                        {ar ? "الذكاء التنفيذي" : "Executive Brain"}
                      </div>
                      <div className="mt-1 text-[12px] text-white/70">
                        {ar ? "ينسّق · يقرر · يفوّض" : "orchestrate · decide · delegate"}
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            }

            if (node.kind === "gate") {
              return (
                <g key={node.id} filter="url(#node-glow)" {...commonG}>
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
                  <foreignObject x={x} y={y} width={w} height={h}>
                    <div
                      dir={ar ? "rtl" : "ltr"}
                      style={{ unicodeBidi: "isolate" }}
                      className="flex h-full w-full flex-col items-center justify-center px-2 text-center leading-tight"
                    >
                      <div className="text-[13px] font-bold text-white">
                        {ar ? "بوابة الاعتماد البشري" : "Human Approval Gate"}
                      </div>
                      <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#FFD166]">
                        {ar ? "لا تنفيذ بلا اعتماد" : "No execution without approval"}
                      </div>
                      <div className="mt-1 text-[12px] text-white/60">
                        {ar ? "قائد المركز · قائد المنطقة" : "Center chief · Regional chief"}
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            }

            if (node.kind === "source") {
              return (
                <g key={node.id} {...commonG}>
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
                  <circle cx={ar ? x + w - 14 : x + 14} cy={y + h / 2} r={4} fill="#3AE8FF" />
                  <foreignObject x={x + 24} y={y} width={w - 48} height={h}>
                    <div
                      dir={ar ? "rtl" : "ltr"}
                      style={{ unicodeBidi: "isolate" }}
                      className="flex h-full w-full items-center text-[12px] text-white/85"
                    >
                      {label}
                    </div>
                  </foreignObject>
                </g>
              );
            }

            // agent
            return (
              <g key={node.id} {...commonG}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={12}
                  fill={selected ? "#0a2438" : "#071627"}
                  stroke={glow}
                  strokeOpacity={selected ? 1 : 0.55}
                  strokeWidth={selected ? 2 : 1}
                />
                <circle cx={ar ? x + w - 14 : x + 14} cy={y + 18} r={4} fill={glow}>
                  <animate
                    attributeName="opacity"
                    values="1;0.35;1"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </circle>
                <foreignObject x={x + 12} y={y + 6} width={w - 24} height={h - 12}>
                  <div
                    dir={ar ? "rtl" : "ltr"}
                    style={{ unicodeBidi: "isolate" }}
                    className="flex h-full w-full flex-col justify-center leading-tight"
                  >
                    <div className="text-[13px] font-semibold text-white truncate">{label}</div>
                    {enSub && (
                      <div className="mt-0.5 text-[12px] uppercase tracking-wide text-white/40 truncate">
                        {enSub}
                      </div>
                    )}
                    {sub && (
                      <div className="mt-1 text-[12px] text-white/60 line-clamp-2">{sub}</div>
                    )}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div
        dir={ar ? "rtl" : "ltr"}
        className="relative flex flex-wrap items-center gap-3 border-t border-white/5 px-4 py-3 text-[12px] text-white/70 sm:px-6"
      >
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
        <span className={ar ? "mr-auto text-white/40" : "ml-auto text-white/40"}>
          {data.nodes.length} {ar ? "عقدة" : "nodes"} · {data.edges.length}{" "}
          {ar ? "رابطًا" : "links"}
        </span>
      </div>
    </div>
  );
}
