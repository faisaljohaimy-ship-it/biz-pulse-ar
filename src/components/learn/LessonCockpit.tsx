/**
 * LessonCockpit — Golden-Reference executive cockpit strip.
 *
 * Renders decision timeline, incident replay, predictive analytics,
 * risk heat map, and command-center cross-links for any lesson that
 * has content registered in `cockpit-content.ts`. Zero per-lesson code
 * required — future lessons just add their content entry.
 */
import { Activity, Flame, GitBranch, LineChart, Radio } from "lucide-react";
import { getCockpitContent } from "@/lib/learn/cockpit-content";
import { DecisionTimeline } from "./cockpit/DecisionTimeline";
import { IncidentReplay } from "./cockpit/IncidentReplay";
import { PredictiveAnalytics } from "./cockpit/PredictiveAnalytics";
import { RiskHeatmap } from "./cockpit/RiskHeatmap";
import { CommandCenterLinks } from "./cockpit/CommandCenterLinks";
import { LessonAskAria } from "./LessonAskAria";

interface Props {
  slug: string;
  lang: "ar" | "en";
  lessonTitle: string;
}

function Panel({
  icon,
  label,
  children,
  wide,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      className={
        "rounded-3xl border border-cyan-400/15 bg-[#0A1E33]/70 p-5 backdrop-blur-xl sm:p-6 " +
        (wide ? "lg:col-span-2" : "")
      }
    >
      <div className="mb-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </section>
  );
}

export function LessonCockpit({ slug, lang, lessonTitle }: Props) {
  const c = getCockpitContent(slug);
  if (!c) return null;
  const ar = lang === "ar";

  return (
    <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          icon={<GitBranch className="h-4 w-4" />}
          label={ar ? "الجدول الزمني للقرارات" : "Decision timeline"}
        >
          <DecisionTimeline events={c.timeline} lang={lang} />
          <div className="mt-4">
            <LessonAskAria
              prompt={
                ar
                  ? `آريا، اشرحي لي منطق كلّ قرار في الجدول الزمني لحصّة «${lessonTitle}»، وأيّها كنتِ ستأخذينه بشكل مختلف ولماذا.`
                  : `ARIA, walk me through the reasoning behind each decision in the "${lessonTitle}" timeline — and which you would have made differently, and why.`
              }
              label={ar ? "اسأل آريا عن هذه القرارات" : "Ask ARIA about these decisions"}
            />
          </div>
        </Panel>

        <Panel
          icon={<Radio className="h-4 w-4" />}
          label={ar ? "إعادة تشغيل الحادث" : "Incident replay"}
        >
          <IncidentReplay
            title={ar ? c.replay.title_ar : c.replay.title_en}
            frames={c.replay.frames}
            lang={lang}
          />
        </Panel>

        <Panel
          icon={<LineChart className="h-4 w-4" />}
          label={ar ? "التحليلات التنبؤية" : "Predictive analytics"}
          wide
        >
          <PredictiveAnalytics
            title={ar ? c.forecast.title_ar : c.forecast.title_en}
            unit={ar ? c.forecast.unit_ar : c.forecast.unit_en}
            series={c.forecast.series}
            insight={ar ? c.forecast.aria_insight_ar : c.forecast.aria_insight_en}
            lang={lang}
          />
        </Panel>

        <Panel
          icon={<Flame className="h-4 w-4" />}
          label={ar ? "خريطة المخاطر الحرارية" : "Risk heat map"}
          wide
        >
          <RiskHeatmap
            title={ar ? c.risk.title_ar : c.risk.title_en}
            cols={c.risk.cols}
            rows={c.risk.rows}
            cells={c.risk.cells}
            lang={lang}
          />
        </Panel>
      </div>

      <Panel
        icon={<Activity className="h-4 w-4" />}
        label={ar ? "مركز القيادة المباشر" : "Live command center"}
      >
        <CommandCenterLinks links={c.links} lang={lang} />
      </Panel>
    </div>
  );
}
