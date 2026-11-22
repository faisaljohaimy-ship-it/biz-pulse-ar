import { useId, useState } from "react";
import {
  buildOmegaSecurityLab,
  traceOmegaDependencies,
  OMEGA_ASSUMPTION_LABELS,
  type OmegaAssumptions,
} from "@/lib/sadeed/omega-security-lab";
import type { SecurityDecisionScenarioId } from "@/lib/sadeed/security-decision-scenarios";

export interface SecurityDecisionOmegaLabProps {
  ar: boolean;
  scenarioId: SecurityDecisionScenarioId;
  inputs: OmegaAssumptions;
  onChange: (inputs: OmegaAssumptions) => void;
}
const touch = "min-h-[44px]! rounded-xl border border-border px-3 py-2 text-sm";

/** The parent owns assumptions/review invalidation; its key resets graph selection. */
export function SecurityDecisionOmegaLab({
  ar,
  scenarioId,
  inputs,
  onChange,
}: SecurityDecisionOmegaLabProps) {
  const t = (a: string, e: string) => (ar ? a : e);
  const label = (v: { labelAr: string; labelEn: string }) => (ar ? v.labelAr : v.labelEn);
  const uid = useId();
  const lab = buildOmegaSecurityLab(scenarioId, inputs);
  const { nodes, edges } = lab.world;
  const [selected, setSelected] = useState(nodes[0].id);
  const chosen = nodes.find((n) => n.id === selected) ?? nodes[0];
  const trace = new Set(traceOmegaDependencies(lab.world, chosen.id));
  const field = (key: keyof OmegaAssumptions) => label(OMEGA_ASSUMPTION_LABELS[key]);
  const word = (value: boolean | number) =>
    typeof value === "number" ? value : value ? t("نعم", "Yes") : t("لا", "No");
  const priority = (value: string) =>
    value === "high"
      ? t("مرتفعة", "High")
      : value === "medium"
        ? t("متوسطة", "Medium")
        : t("منخفضة", "Low");
  const point = (id: string) => {
    const i = nodes.findIndex((n) => n.id === id),
      a = ((i - 1) * Math.PI * 2) / (nodes.length - 1);
    return i ? [160 + 112 * Math.cos(a), 90 + 62 * Math.sin(a)] : [160, 90];
  };
  const assessment = lab.proposed.assessment;

  return (
    <section aria-labelledby={uid} className="nx-surface space-y-4 p-5">
      <h2 id={uid} className="text-lg font-bold">
        {t("مختبر السياق والافتراضات", "Context & assumptions lab")}
      </h2>
      <p className="text-sm leading-7">
        {t(
          "محاكاة فقط. الافتراضات ليست تنبؤًا أو إثباتًا سببيًا. أولوية التحقق ليست شدة الحدث. لا تنفيذ.",
          "Simulation only. Assumptions are not forecasts or proven causes. Verification priority is not event severity. No execution.",
        )}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <h3 className="font-bold">{t("العالم الافتراضي", "Synthetic world")}</h3>
          <svg viewBox="0 0 320 180" aria-hidden="true" className="max-h-44 w-full">
            {edges.map((e) => {
              const a = point(e.from),
                b = point(e.to);
              return (
                <line
                  key={e.id}
                  x1={a[0]}
                  y1={a[1]}
                  x2={b[0]}
                  y2={b[1]}
                  className="stroke-border"
                />
              );
            })}
            {nodes.map((n, i) => {
              const [x, y] = point(n.id);
              return (
                <g key={n.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r="19"
                    className={
                      n.id === chosen.id
                        ? "fill-primary/20 stroke-primary"
                        : "fill-background stroke-border"
                    }
                  />
                  <text x={x} y={y + 4} textAnchor="middle" className="fill-foreground text-xs">
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="grid grid-cols-2 gap-2">
            {nodes.map((n, i) => (
              <button
                type="button"
                key={n.id}
                className={touch}
                aria-pressed={n.id === chosen.id}
                onClick={() => setSelected(n.id)}
              >
                {i + 1}. {label(n)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm leading-7" aria-live="polite">
            {t("مسار العلاقات", "Dependency trace")}:{" "}
            {nodes
              .filter((n) => trace.has(n.id))
              .map(label)
              .join(" · ") || "—"}
          </p>
          <p className="break-words text-xs text-muted-foreground">
            {t("أدلة الكيان المختار", "Selected entity evidence")}: {chosen.evidenceIds.join(" · ")}
          </p>
        </div>
        <fieldset className="min-w-0 space-y-3">
          <legend className="font-bold">
            {t("ماذا لو؟ مدخلات مفترضة", "What if? Assumed inputs")}
          </legend>
          {(Object.keys(OMEGA_ASSUMPTION_LABELS) as (keyof OmegaAssumptions)[]).map((key) =>
            typeof inputs[key] === "boolean" ? (
              <button
                type="button"
                key={key}
                className={`${touch} w-full`}
                aria-label={field(key)}
                aria-pressed={inputs[key] as boolean}
                onClick={() => onChange({ ...inputs, [key]: !inputs[key] })}
              >
                {field(key)}: {word(inputs[key])}
              </button>
            ) : (
              <label key={key} className="block text-sm" htmlFor={`${uid}-${key}`}>
                {field(key)}: <output>{inputs[key]}</output>
                <input
                  id={`${uid}-${key}`}
                  type="range"
                  className="min-h-[44px]! w-full"
                  min={key === "patrolCount" ? 0 : 1}
                  max={key === "patrolCount" ? 12 : 120}
                  step="1"
                  aria-label={field(key)}
                  value={inputs[key] as number}
                  onChange={(e) => onChange({ ...inputs, [key]: Number(e.currentTarget.value) })}
                />
              </label>
            ),
          )}
          <p className="text-sm font-semibold">
            {t("أولوية التحقق للحواجز المفترضة", "Verification priority for assumed barriers")}
          </p>
          <p className="text-sm" aria-live="polite">
            {t("الأساس", "Baseline")}: {priority(lab.baseline.assessment.reviewPriority)} ·{" "}
            {t("المقترح", "Proposed")}: {priority(assessment.reviewPriority)}
          </p>
          <p className="text-sm leading-7">
            {lab.changes
              .map((c) => `${field(c.input)}: ${word(c.before)} → ${word(c.after)}`)
              .join(" · ") || t("لا تغيير في الافتراضات", "No assumption changes")}
          </p>
        </fieldset>
      </div>
      <h3 className="font-bold">
        {t("فرضيات للتحقق", "Hypotheses to verify")} · {assessment.policyVersion}
      </h3>
      {assessment.hypotheses.length === 0 && (
        <p className="text-sm">{t("لا فرضيات مفعّلة", "No active hypotheses")}</p>
      )}
      {assessment.hypotheses.map((h) => (
        <details key={h.id} className="text-sm leading-7">
          <summary className={`${touch} cursor-pointer font-semibold`}>
            {h.id} · {label(h)}
          </summary>
          <p>{ar ? h.reasonAr : h.reasonEn}</p>
          <p className="break-words">
            {t("الأدلة والمدخلات", "Evidence & inputs")}: {h.evidenceIds.join(" · ")} ·{" "}
            {h.inputKeys.map(field).join(" · ")}
          </p>
          <p>
            {t("المطلوب للتحقق", "Verification needed")}:{" "}
            {(ar ? h.missingFactsAr : h.missingFactsEn).join(" · ")}
          </p>
        </details>
      ))}
      <details className="text-sm leading-7">
        <summary className={`${touch} cursor-pointer`}>
          {t("المجهول وخطة القياس", "Unknowns & measurement plan")}
        </summary>
        <p>{(ar ? assessment.unknownsAr : assessment.unknownsEn).join(" · ")}</p>
        <p>{(ar ? assessment.measurementPlanAr : assessment.measurementPlanEn).join(" · ")}</p>
      </details>
    </section>
  );
}
