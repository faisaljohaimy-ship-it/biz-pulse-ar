import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { Rocket, Brain, GitBranch } from "lucide-react";
import {
  transformationPrograms,
  transformationMilestones,
  useEnterpriseFabricAdapter,
} from "@/lib/enterprise-domains";
import { InlineAddForm, DeleteButton, EmptyState } from "@/components/crud-inline";

export const Route = createFileRoute("/_authenticated/transformation")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: TransformationPage,
});

function phaseTone(p: string) {
  return p === "design" ? "amber" : p === "build" ? "cyan" : p === "scale" ? "violet" : "emerald";
}

function TransformationPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const programsQ = transformationPrograms.useList();
  const programsCreate = transformationPrograms.useCreate();
  const programsDelete = transformationPrograms.useDelete();
  const milestonesQ = transformationMilestones.useList();
  const milestonesCreate = transformationMilestones.useCreate();
  const milestonesDelete = transformationMilestones.useDelete();
  const adapter = useEnterpriseFabricAdapter();

  const programs = programsQ.data ?? [];
  const milestones = milestonesQ.data ?? [];
  const doneMs = milestones.filter((m) => m.status === "done").length;

  return (
    <NexusPage
      eyebrow="TRANSFORMATION OFFICE · LIVE"
      title={ar ? "مكتب التحول المؤسسي" : "Enterprise Transformation Office"}
      subtitle={
        ar
          ? "برامج التحول والمعالم — مباشرة من قاعدة البيانات."
          : "Transformation programs and milestones — live from your database."
      }
      actions={
        <NexusPill tone="violet">
          <Rocket className="h-3 w-3" /> {adapter.programsCount} PROGRAMS
        </NexusPill>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat
          label={ar ? "برامج التحول" : "Programs"}
          value={String(adapter.programsCount)}
          tone="cyan"
        />
        <NexusStat
          label={ar ? "متوسط التقدم" : "Avg progress"}
          value={adapter.programsCount ? `${adapter.avgProgress}%` : "—"}
          tone="violet"
        />
        <NexusStat
          label={ar ? "تبني" : "Adoption"}
          value={adapter.programsCount ? `${adapter.avgAdoption}%` : "—"}
          tone="emerald"
        />
        <NexusStat
          label={ar ? "معالم مكتملة" : "Milestones done"}
          value={`${doneMs}/${milestones.length}`}
          tone="emerald"
        />
      </div>

      <NexusCard glow>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-cyan-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
              {ar ? "برامج التحول" : "TRANSFORMATION PROGRAMS"}
            </div>
          </div>
          <InlineAddForm
            ar={ar}
            isPending={programsCreate.isPending}
            fields={[
              { key: "name", label: ar ? "الاسم" : "Name", required: true },
              { key: "name_en", label: ar ? "بالإنجليزية" : "English" },
              {
                key: "progress",
                label: ar ? "التقدم %" : "Progress %",
                type: "number",
                defaultValue: 0,
              },
              {
                key: "adoption",
                label: ar ? "التبني %" : "Adoption %",
                type: "number",
                defaultValue: 0,
              },
              { key: "savings", label: ar ? "الوفر" : "Savings", placeholder: "SAR 4.2M" },
              {
                key: "phase",
                label: ar ? "المرحلة" : "Phase",
                type: "select",
                options: ["design", "build", "scale", "optimize"],
                defaultValue: "design",
              },
            ]}
            onSubmit={(v) =>
              programsCreate.mutate({
                name: String(v.name),
                name_en: String(v.name_en || ""),
                progress: Math.max(0, Math.min(100, Number(v.progress))),
                adoption: Math.max(0, Math.min(100, Number(v.adoption))),
                savings: String(v.savings || ""),
                phase: String(v.phase),
              })
            }
          />
        </div>
        {programsQ.isLoading ? (
          <div className="mt-6 text-center text-sm text-slate-400">
            {ar ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : programs.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<Rocket className="h-8 w-8" />}
              title={ar ? "لا توجد برامج تحول بعد." : "No transformation programs yet."}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {programs.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">
                    {ar ? p.name : p.name_en || p.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <NexusPill tone={phaseTone(p.phase)}>{p.phase}</NexusPill>
                    <DeleteButton
                      ar={ar}
                      isPending={programsDelete.isPending}
                      onDelete={() => programsDelete.mutate(p.id)}
                    />
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <div className="text-slate-500">{ar ? "التقدم" : "Progress"}</div>
                    <div className="font-bold text-cyan-300">{p.progress}%</div>
                  </div>
                  <div>
                    <div className="text-slate-500">{ar ? "التبني" : "Adoption"}</div>
                    <div className="font-bold text-violet-300">{p.adoption}%</div>
                  </div>
                  <div>
                    <div className="text-slate-500">{ar ? "وفر" : "Savings"}</div>
                    <div className="font-bold text-emerald-300">{p.savings || "—"}</div>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </NexusCard>

      <NexusCard>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-violet-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300/80">
              {ar ? "المعالم" : "MILESTONES"}
            </div>
          </div>
          <InlineAddForm
            ar={ar}
            isPending={milestonesCreate.isPending}
            fields={[
              { key: "title", label: ar ? "العنوان" : "Title", required: true },
              { key: "title_en", label: ar ? "بالإنجليزية" : "English" },
              {
                key: "status",
                label: ar ? "الحالة" : "Status",
                type: "select",
                options: ["pending", "in_progress", "done"],
                defaultValue: "pending",
              },
              {
                key: "program_id",
                label: ar ? "معرّف البرنامج" : "Program ID",
                placeholder: ar ? "اختياري" : "optional",
              },
            ]}
            onSubmit={(v) =>
              milestonesCreate.mutate({
                title: String(v.title),
                title_en: String(v.title_en || ""),
                status: String(v.status),
                program_id: String(v.program_id) || null,
                due_at: null,
              })
            }
          />
        </div>
        {milestones.length === 0 ? (
          <div className="mt-4">
            <EmptyState title={ar ? "لا توجد معالم." : "No milestones."} />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                <span className="text-sm text-slate-200">
                  {ar ? m.title : m.title_en || m.title}
                </span>
                <div className="flex items-center gap-2">
                  <NexusPill
                    tone={
                      m.status === "done"
                        ? "emerald"
                        : m.status === "in_progress"
                          ? "cyan"
                          : "amber"
                    }
                  >
                    {m.status}
                  </NexusPill>
                  <DeleteButton
                    ar={ar}
                    isPending={milestonesDelete.isPending}
                    onDelete={() => milestonesDelete.mutate(m.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </NexusCard>
    </NexusPage>
  );
}
