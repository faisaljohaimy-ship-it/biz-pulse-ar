import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { TrendingUp, DollarSign } from "lucide-react";
import { businessOutcomes } from "@/lib/enterprise-domains";
import { InlineAddForm, DeleteButton, EmptyState } from "@/components/crud-inline";

export const Route = createFileRoute("/_authenticated/outcomes")({
  component: OutcomesPage,
});

const CATEGORIES = ["cost", "productivity", "automation", "revenue", "risk"];

function categoryTone(c: string) {
  if (c === "cost" || c === "risk") return "emerald";
  if (c === "revenue") return "cyan";
  if (c === "automation") return "violet";
  return "cyan";
}

function OutcomesPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const q = businessOutcomes.useList();
  const create = businessOutcomes.useCreate();
  const del = businessOutcomes.useDelete();
  const outcomes = q.data ?? [];

  const byCategory = (c: string) => outcomes.filter((o) => o.category === c).length;

  return (
    <NexusPage
      eyebrow="BUSINESS OUTCOMES · LIVE"
      title={ar ? "تتبع نتائج الأعمال" : "Business Outcome Tracking"}
      subtitle={
        ar
          ? "الأثر الحقيقي عبر التكلفة، الإنتاجية، الأتمتة، الإيراد، والمخاطر."
          : "Real impact across cost, productivity, automation, revenue, and risk."
      }
      actions={
        <NexusPill tone="emerald">
          <TrendingUp className="h-3 w-3" /> {outcomes.length} OUTCOMES
        </NexusPill>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {CATEGORIES.map((c) => (
          <NexusStat
            key={c}
            label={c.toUpperCase()}
            value={String(byCategory(c))}
            tone={
              c === "cost"
                ? "emerald"
                : c === "revenue"
                  ? "cyan"
                  : c === "automation"
                    ? "violet"
                    : c === "risk"
                      ? "rose"
                      : "amber"
            }
          />
        ))}
      </div>

      <NexusCard glow>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-emerald-300/80">
              {ar ? "النتائج المُحقَّقة" : "REALIZED OUTCOMES"}
            </div>
          </div>
          <InlineAddForm
            ar={ar}
            isPending={create.isPending}
            fields={[
              {
                key: "category",
                label: ar ? "الفئة" : "Category",
                type: "select",
                options: CATEGORIES,
                defaultValue: "cost",
              },
              {
                key: "label",
                label: ar ? "الاسم" : "Label",
                required: true,
                placeholder: ar ? "وفر التكاليف" : "Cost savings",
              },
              { key: "label_en", label: ar ? "بالإنجليزية" : "English label" },
              {
                key: "value",
                label: ar ? "القيمة" : "Value",
                required: true,
                placeholder: "SAR 38.4M",
              },
              { key: "delta", label: "Δ", placeholder: "+12.6%" },
              { key: "period_from", label: ar ? "من" : "From", placeholder: "Q1 26" },
              { key: "period_to", label: ar ? "إلى" : "To", placeholder: "Q2 26" },
            ]}
            onSubmit={(v) =>
              create.mutate({
                category: String(v.category),
                label: String(v.label),
                label_en: String(v.label_en || ""),
                value: String(v.value),
                delta: String(v.delta || ""),
                period_from: String(v.period_from || ""),
                period_to: String(v.period_to || ""),
              })
            }
          />
        </div>

        {q.isLoading ? (
          <div className="mt-6 text-center text-sm text-slate-400">
            {ar ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : outcomes.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={
                ar
                  ? "لا توجد نتائج بعد — سجل أول نتيجة عمل."
                  : "No outcomes yet — record your first business outcome."
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {outcomes.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.04] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <NexusPill tone={categoryTone(o.category)}>{o.category}</NexusPill>
                  <div className="flex items-center gap-2">
                    {o.delta && <NexusPill tone="emerald">{o.delta}</NexusPill>}
                    <DeleteButton
                      ar={ar}
                      isPending={del.isPending}
                      onDelete={() => del.mutate(o.id)}
                    />
                  </div>
                </div>
                <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">
                  {ar ? o.label : o.label_en || o.label}
                </div>
                <div className="mt-1 text-3xl font-bold text-emerald-300">{o.value}</div>
                {(o.period_from || o.period_to) && (
                  <div className="mt-1 text-[10px] text-slate-500">
                    {o.period_from || "—"} → {o.period_to || "—"}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </NexusCard>
    </NexusPage>
  );
}
