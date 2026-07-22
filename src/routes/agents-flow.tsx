// /agents-flow — dedicated Agent Operations Dashboard.
// Public route (mirrors the always-open access policy). Click an agent node
// to see its upstream sources, downstream chain, and detail card.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgenticFlowCanvas } from "@/components/home/AgenticFlowCanvas";
import { listShowcaseFlow, type FlowGraph } from "@/lib/flow.functions";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, ArrowRight, Network, Radio, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/agents-flow")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  head: () => ({
    meta: [
      { title: "NEXIOS — Agent Operations Dashboard" },
      { name: "description", content: "Live agent coordination network — sources, specialists, FINN and the human approval gate." },
      { property: "og:title", content: "NEXIOS — Agent Operations Dashboard" },
      { property: "og:description", content: "Holographic agentic flow canvas with chain-focus, fleet summary and per-agent detail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentsFlowPage,
});

function AgentsFlowPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [selected, setSelected] = useState<string | null>(null);

  const { data } = useQuery<FlowGraph>({
    queryKey: ["agentic-flow-graph"],
    queryFn: () => listShowcaseFlow(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const fleet = useMemo(() => {
    if (!data) return null;
    const agents = data.nodes.filter((n) => n.kind === "agent");
    const sources = data.nodes.filter((n) => n.kind === "source");
    const bySeverity: Record<string, number> = {};
    for (const a of agents) {
      const k = a.severity ?? "medium";
      bySeverity[k] = (bySeverity[k] ?? 0) + 1;
    }
    return {
      agents: agents.length,
      sources: sources.length,
      edges: data.edges.length,
      bySeverity,
    };
  }, [data]);

  const detail = useMemo(() => {
    if (!data || !selected) return null;
    const node = data.nodes.find((n) => n.id === selected);
    if (!node) return null;
    const upstream = data.edges
      .filter((e) => e.to === selected)
      .map((e) => ({ ...e, node: data.nodes.find((n) => n.id === e.from) }))
      .filter((e) => e.node);
    const downstream = data.edges
      .filter((e) => e.from === selected)
      .map((e) => ({ ...e, node: data.nodes.find((n) => n.id === e.to) }))
      .filter((e) => e.node);
    return { node, upstream, downstream };
  }, [data, selected]);

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="min-h-screen bg-gradient-to-b from-[#03080F] via-[#04101F] to-[#03080F] text-white"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-[#3AE8FF]/80">
              <Network className="h-3.5 w-3.5" />
              NEXIOS · Agent Operations Platform
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {ar ? "لوحة قيادة الوكلاء" : "Agent Operations Dashboard"}
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-white/70 sm:text-sm">
              {ar
                ? "شبكة تنسيق حية بنمط n8n — مصادر البيانات، الوكلاء المتخصصون، FINN، وبوابة الاعتماد البشري."
                : "Live n8n-style coordination network — data sources, specialist agents, FINN and the human approval gate."}
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/80 hover:border-[#3AE8FF]/40 hover:text-white"
          >
            {ar ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
            {ar ? "العودة للصفحة الرئيسية" : "Back to home"}
          </Link>
        </div>

        {/* Fleet summary */}
        {fleet && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile
              icon={<Zap className="h-4 w-4" />}
              label={ar ? "الوكلاء" : "Agents"}
              value={fleet.agents}
              hint={ar ? "متخصصون تحت FINN" : "specialists under FINN"}
            />
            <SummaryTile
              icon={<Radio className="h-4 w-4" />}
              label={ar ? "المصادر" : "Sources"}
              value={fleet.sources}
              hint={ar ? "SAP · IoT · نفاذ · M365" : "SAP · IoT · Nafath · M365"}
            />
            <SummaryTile
              icon={<Network className="h-4 w-4" />}
              label={ar ? "الروابط" : "Links"}
              value={fleet.edges}
              hint={ar ? "بيانات · نتيجة · أمر · اعتماد" : "data · result · command · approval"}
            />
            <SummaryTile
              icon={<ShieldCheck className="h-4 w-4" />}
              label={ar ? "الاعتماد البشري" : "Human approval"}
              value={ar ? "شرط" : "Required"}
              hint={ar ? "لا تنفيذ بلا اعتماد" : "No execution without approval"}
            />
          </div>
        )}

        {/* Chain strip when an agent is selected */}
        {detail && (
          <div className="mt-6 grid gap-3 rounded-2xl border border-[#3AE8FF]/25 bg-[#04101F]/70 p-4 lg:grid-cols-3">
            <ChainCol
              title={ar ? "المصادر المُغذّية" : "Upstream sources"}
              items={detail.upstream.map((u) => ({
                id: u.node!.id,
                label: ar ? u.node!.name_ar || u.node!.name_en : u.node!.name_en || u.node!.name_ar,
                sub: u.link_type,
              }))}
              accent="#3AE8FF"
              ar={ar}
              empty={ar ? "لا مصادر مباشرة" : "No direct sources"}
            />
            <div className="rounded-xl border border-[#3AE8FF]/40 bg-gradient-to-br from-[#062033] to-[#04101F] p-4 text-center">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#3AE8FF]/80">
                {ar ? "الوكيل المُختار" : "Selected agent"}
              </div>
              <div className="mt-2 text-lg font-bold text-white">
                {ar ? detail.node.name_ar || detail.node.name_en : detail.node.name_en || detail.node.name_ar}
              </div>
              {detail.node.specialty && (
                <div className="mt-1 text-[11px] text-white/60">
                  {ar ? "التخصص: " : "Specialty: "} {detail.node.specialty}
                </div>
              )}
              {detail.node.current_mission && (
                <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-2 text-[11px] text-white/80">
                  {ar ? "المهمة الحالية: " : "Current mission: "}
                  <span className="font-medium text-white">{detail.node.current_mission}</span>
                </div>
              )}
              {detail.node.severity && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      background:
                        detail.node.severity === "critical"
                          ? "#FF5D73"
                          : detail.node.severity === "high"
                            ? "#FFB454"
                            : "#3AE8FF",
                    }}
                  />
                  {ar ? "مستوى: " : "Level: "} {detail.node.severity}
                </div>
              )}
              <button
                onClick={() => setSelected(null)}
                className="mt-3 rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/70 hover:border-white/30 hover:text-white"
              >
                {ar ? "إلغاء التركيز" : "Clear focus"}
              </button>
            </div>
            <ChainCol
              title={ar ? "المخرجات والوجهة" : "Downstream chain"}
              items={detail.downstream.map((d) => ({
                id: d.node!.id,
                label: ar ? d.node!.name_ar || d.node!.name_en : d.node!.name_en || d.node!.name_ar,
                sub: d.link_type,
              }))}
              accent="#FFD166"
              ar={ar}
              empty={ar ? "لا مخرجات مباشرة" : "No direct outputs"}
            />
          </div>
        )}

        {/* Canvas */}
        <div className="mt-6">
          <AgenticFlowCanvas
            ar={ar}
            variant="full"
            selectedAgentId={selected}
            onSelectAgent={setSelected}
          />
        </div>

        <p className="mt-4 text-center text-[10px] text-white/40">
          {ar
            ? "اضغط على أي وكيل لرؤية سلسلته الكاملة: من أين يأخذ ← ماذا يفعل ← إلى أين يذهب."
            : "Tap any agent to see its full chain: upstream sources ← agent ← downstream destinations."}
        </p>
      </div>
    </div>
  );
}

function SummaryTile(props: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[#3AE8FF]/20 bg-[#04101F]/70 p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#3AE8FF]/80">
        {props.icon}
        {props.label}
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{props.value}</div>
      <div className="mt-1 text-[10px] text-white/50">{props.hint}</div>
    </div>
  );
}

function ChainCol(props: {
  title: string;
  items: Array<{ id: string; label: string; sub: string }>;
  accent: string;
  ar: boolean;
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#03101F]/60 p-3">
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.25em]"
        style={{ color: props.accent }}
      >
        {props.title}
      </div>
      <div className="mt-2 space-y-1.5">
        {props.items.length === 0 ? (
          <div className="text-[11px] text-white/40">{props.empty}</div>
        ) : (
          props.items.map((it, i) => (
            <div
              key={`${it.id}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1.5"
            >
              <span className="truncate text-[12px] text-white/90">{it.label}</span>
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide"
                style={{ background: `${props.accent}22`, color: props.accent }}
              >
                {it.sub}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
