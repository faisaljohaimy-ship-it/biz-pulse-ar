// Agents Reference — لكل وكيل مرجعه وعمله ومصادره وارتباطاته.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listShowcaseFlow, type FlowGraph, type FlowNode } from "@/lib/flow.functions";
import { useI18n } from "@/lib/i18n";
import { AppBackButton } from "@/components/nav/AppBackButton";

export const Route = createFileRoute("/agents-reference")({
  component: AgentsReferencePage,
  head: () => ({
    meta: [
      { title: "مرجع الوكلاء · NEXIOS Agents Reference" },
      {
        name: "description",
        content:
          "مرجع كل وكيل في منظومة NEXIOS: عمله، تخصصه، مصادره، وارتباطاته مع FINN وبوابة الاعتماد البشري.",
      },
      { property: "og:title", content: "مرجع الوكلاء · NEXIOS Agents Reference" },
      {
        property: "og:description",
        content: "دليل مرجعي لكل وكيل، تخصصه ومهمته الحالية داخل منظومة NEXIOS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const KIND_LABEL_AR: Record<string, string> = {
  source: "مصدر بيانات",
  agent: "وكيل متخصص",
  aria: "الذكاء المركزي",
  gate: "بوابة اعتماد بشري",
};
const KIND_LABEL_EN: Record<string, string> = {
  source: "Data Source",
  agent: "Specialist Agent",
  aria: "Executive Brain",
  gate: "Human Approval Gate",
};

const LINK_LABEL_AR: Record<string, string> = {
  data: "بيانات",
  result: "نتيجة",
  command: "أمر",
  approval_suggestion: "مقترح اعتماد",
};
const LINK_LABEL_EN: Record<string, string> = {
  data: "data",
  result: "result",
  command: "command",
  approval_suggestion: "approval suggestion",
};

function AgentsReferencePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { data, isLoading, isError } = useQuery<FlowGraph>({
    queryKey: ["agentic-flow-graph"],
    queryFn: () => listShowcaseFlow(),
    staleTime: 60_000,
  });

  const grouped = useMemo(() => {
    if (!data) return null;
    const byId = new Map(data.nodes.map((n) => [n.id, n]));
    const upstream = new Map<string, { node: FlowNode; link: string }[]>();
    const downstream = new Map<string, { node: FlowNode; link: string }[]>();
    for (const e of data.edges) {
      const f = byId.get(e.from);
      const t = byId.get(e.to);
      if (!f || !t) continue;
      if (!upstream.has(e.to)) upstream.set(e.to, []);
      if (!downstream.has(e.from)) downstream.set(e.from, []);
      upstream.get(e.to)!.push({ node: f, link: e.link_type });
      downstream.get(e.from)!.push({ node: t, link: e.link_type });
    }
    const agents = data.nodes.filter((n) => n.kind === "agent");
    const sources = data.nodes.filter((n) => n.kind === "source");
    const aria = data.nodes.filter((n) => n.kind === "aria");
    const gate = data.nodes.filter((n) => n.kind === "gate");
    return { agents, sources, aria, gate, upstream, downstream };
  }, [data]);

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="min-h-screen bg-gradient-to-br from-[#04101F] via-[#061A2E] to-[#03080F] px-4 py-8 sm:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <AppBackButton />
          <span className="rounded-full border border-[#3AE8FF]/30 bg-[#3AE8FF]/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[#3AE8FF]">
            {ar ? "محاكاة مرجعية · بدون تنفيذ" : "Reference simulation · no execution"}
          </span>
        </div>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            {ar ? "مرجع الوكلاء · NEXIOS Agents Reference" : "NEXIOS Agents Reference"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-white/70">
            {ar
              ? "دليل مرجعي لكل وكيل في المنظومة: تخصصه، مهمته الحالية، المصادر التي يقرأ منها، ومسار الارتباط مع FINN وبوابة الاعتماد البشري."
              : "Reference guide for every agent in the topology — specialty, current mission, the data sources it reads from, and how it links to FINN and the human approval gate."}
          </p>
        </header>

        {isLoading && (
          <div className="rounded-2xl border border-[#3AE8FF]/20 bg-[#04101F]/70 p-10 text-center text-sm text-white/60">
            {ar ? "جاري تحميل المرجع…" : "Loading reference…"}
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-[#FF5D73]/30 bg-[#1a0710]/70 p-10 text-center text-sm text-white/70">
            {ar ? "تعذّر تحميل المرجع" : "Unable to load reference"}
          </div>
        )}

        {grouped && (
          <div className="space-y-10">
            <Section
              title={ar ? "الوكلاء المتخصصون" : "Specialist Agents"}
              count={grouped.agents.length}
              ar={ar}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.agents.map((n) => (
                  <AgentCard
                    key={n.id}
                    node={n}
                    ar={ar}
                    upstream={grouped.upstream.get(n.id) ?? []}
                    downstream={grouped.downstream.get(n.id) ?? []}
                  />
                ))}
              </div>
            </Section>

            <Section title={ar ? "مصادر البيانات" : "Data Sources"} count={grouped.sources.length} ar={ar}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.sources.map((n) => (
                  <NodeMiniCard
                    key={n.id}
                    node={n}
                    ar={ar}
                    downstream={grouped.downstream.get(n.id) ?? []}
                  />
                ))}
              </div>
            </Section>

            <Section title={ar ? "الذكاء المركزي والاعتماد" : "Central Brain & Approval"} count={grouped.aria.length + grouped.gate.length} ar={ar}>
              <div className="grid gap-4 sm:grid-cols-2">
                {[...grouped.aria, ...grouped.gate].map((n) => (
                  <AgentCard
                    key={n.id}
                    node={n}
                    ar={ar}
                    upstream={grouped.upstream.get(n.id) ?? []}
                    downstream={grouped.downstream.get(n.id) ?? []}
                  />
                ))}
              </div>
            </Section>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            to="/agents-flow"
            className="inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-4 py-2 text-xs text-[#3AE8FF] transition hover:bg-[#3AE8FF]/20"
          >
            {ar ? "الانتقال إلى لوحة تدفق الوكلاء" : "Go to Agentic Flow Canvas"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  ar,
  children,
}: {
  title: string;
  count: number;
  ar: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-lg font-semibold text-[#3AE8FF]">{title}</h2>
        <span className="text-xs text-white/50">
          {count} {ar ? "عنصرًا" : "items"}
        </span>
      </div>
      {children}
    </section>
  );
}

function AgentCard({
  node,
  ar,
  upstream,
  downstream,
}: {
  node: FlowNode;
  ar: boolean;
  upstream: { node: FlowNode; link: string }[];
  downstream: { node: FlowNode; link: string }[];
}) {
  const kindLabel = (ar ? KIND_LABEL_AR : KIND_LABEL_EN)[node.kind] ?? node.kind;
  const linkLabels = ar ? LINK_LABEL_AR : LINK_LABEL_EN;
  const name = ar ? node.name_ar : node.name_en || node.name_ar;
  return (
    <div className="rounded-2xl border border-[#3AE8FF]/25 bg-[#04101F]/70 p-4 shadow-[0_0_40px_-24px_rgba(58,232,255,0.6)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#3AE8FF]/70">{kindLabel}</div>
          <div className="mt-1 text-base font-semibold text-white">{name}</div>
          {node.name_en && node.name_ar && ar && (
            <div className="text-[11px] text-white/40">{node.name_en}</div>
          )}
        </div>
        {node.severity && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
            {node.severity}
          </span>
        )}
      </div>

      {node.specialty && (
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            {ar ? "التخصص" : "Specialty"}
          </div>
          <div className="text-xs text-white/85">{node.specialty}</div>
        </div>
      )}

      {node.current_mission && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            {ar ? "المهمة الحالية" : "Current Mission"}
          </div>
          <div className="text-xs text-white/85">{node.current_mission}</div>
        </div>
      )}

      {upstream.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            {ar ? "المدخلات" : "Inputs"}
          </div>
          <ul className="mt-1 space-y-1 text-[11px] text-white/75">
            {upstream.map((u, i) => (
              <li key={`${u.node.id}-${i}`} className="flex items-center justify-between gap-2">
                <span>{ar ? u.node.name_ar : u.node.name_en}</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-white/50">
                  {linkLabels[u.link] ?? u.link}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {downstream.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            {ar ? "المخرجات" : "Outputs"}
          </div>
          <ul className="mt-1 space-y-1 text-[11px] text-white/75">
            {downstream.map((d, i) => (
              <li key={`${d.node.id}-${i}`} className="flex items-center justify-between gap-2">
                <span>{ar ? d.node.name_ar : d.node.name_en}</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-white/50">
                  {linkLabels[d.link] ?? d.link}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NodeMiniCard({
  node,
  ar,
  downstream,
}: {
  node: FlowNode;
  ar: boolean;
  downstream: { node: FlowNode; link: string }[];
}) {
  const name = ar ? node.name_ar : node.name_en || node.name_ar;
  return (
    <div className="rounded-xl border border-[#3AE8FF]/20 bg-[#04101F]/60 p-3">
      <div className="text-[10px] uppercase tracking-[0.3em] text-[#3AE8FF]/70">
        {ar ? KIND_LABEL_AR[node.kind] : KIND_LABEL_EN[node.kind]}
      </div>
      <div className="mt-1 text-sm font-medium text-white">{name}</div>
      {downstream.length > 0 && (
        <div className="mt-2 text-[11px] text-white/60">
          {ar ? "يغذّي: " : "Feeds: "}
          {downstream
            .slice(0, 4)
            .map((d) => (ar ? d.node.name_ar : d.node.name_en))
            .join(" · ")}
          {downstream.length > 4 && ` +${downstream.length - 4}`}
        </div>
      )}
    </div>
  );
}
