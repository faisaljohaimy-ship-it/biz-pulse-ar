import { REGIONS, type RegionId } from "@/lib/regions";

export type FeedTone = "neutral" | "warning" | "danger" | "success";
export type FeedSource = { kind: "database" | "export" | "unavailable"; date: string | null };
export interface FeedProject {
  id: string;
  nameAr: string;
  nameEn: string;
  regionId: RegionId | null;
  area: string | null;
  progress: number | null;
  health: "green" | "amber" | "red" | null;
  at: string | null;
}
export interface OperationalFeed {
  observedAt: string;
  incidents: { count: number | null; source: FeedSource };
  maintenance: {
    regions: Array<{ regionId: RegionId; active: number | null; overdue: number | null }>;
    source: FeedSource;
  };
  projects: { rows: FeedProject[]; source: FeedSource };
}
export interface OperationalTickerLine {
  id: string;
  ar: string;
  en: string;
  tone?: FeedTone;
  regionId?: RegionId;
  progress?: number;
}

export const measuredProgress = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
export const validRegion = (value: unknown): RegionId | null =>
  REGIONS.find((r) => r.id === value)?.id ?? null;

function sourceLabel(source: FeedSource, ar: boolean): string {
  if (source.kind === "export")
    return ar
      ? `تصدير معتمد ${source.date ?? "بلا تاريخ"}`
      : `Approved export ${source.date ?? "date unknown"}`;
  return source.kind === "database"
    ? ar
      ? "قراءة قاعدة البيانات"
      : "Database reading"
    : ar
      ? "القراءة غير متاحة"
      : "Reading unavailable";
}

/** Every number retains its source; region colours identify location, status words carry meaning. */
export function buildOperationalTickerLines(feed: OperationalFeed): OperationalTickerLine[] {
  const lines: OperationalTickerLine[] = [
    {
      id: "operational-legend",
      ar: "دليل الألوان: أحمر = متأخر أو متعثر · كهرماني = يحتاج متابعة · أخضر = وفق القياس المسجل · محايد = لم يُقَس · حافة البطاقة تميز المنطقة",
      en: "Colours: red = overdue or at risk · amber = needs attention · green = recorded measurement · neutral = not measured · edge colour identifies region",
    },
    {
      id: "operational-incidents",
      ar: `البلاغات النشطة: ${feed.incidents.count ?? "لم تُقَس"} · المنطقة غير مسجلة في المصدر · ${sourceLabel(feed.incidents.source, true)}`,
      en: `Active incidents: ${feed.incidents.count ?? "not measured"} · Region not recorded in source · ${sourceLabel(feed.incidents.source, false)}`,
      tone:
        feed.incidents.count === null
          ? "neutral"
          : feed.incidents.count > 0
            ? "warning"
            : "success",
    },
  ];
  for (const row of feed.maintenance.regions) {
    const region = REGIONS.find((r) => r.id === row.regionId)!;
    const statusAr =
      row.overdue === null
        ? "التأخير غير مقيس"
        : row.overdue > 0
          ? `متأخرة: ${row.overdue}`
          : "لا أوامر متأخرة";
    const statusEn =
      row.overdue === null
        ? "Overdue not measured"
        : row.overdue > 0
          ? `Overdue: ${row.overdue}`
          : "No overdue orders";
    lines.push({
      id: `maintenance-${region.id}`,
      regionId: region.id,
      ar: `${region.shortAr} · صيانة نشطة: ${row.active ?? "لم تُقَس"} · ${statusAr} · ${sourceLabel(feed.maintenance.source, true)}`,
      en: `${region.shortEn} · Active maintenance: ${row.active ?? "not measured"} · ${statusEn} · ${sourceLabel(feed.maintenance.source, false)}`,
      tone:
        row.active === null || row.overdue === null
          ? "neutral"
          : row.overdue > 0
            ? "danger"
            : "success",
    });
  }
  for (const project of feed.projects.rows) {
    const region = REGIONS.find((r) => r.id === project.regionId);
    const progress = measuredProgress(project.progress);
    const healthAr =
      project.health === "red"
        ? "متعثر"
        : project.health === "amber"
          ? "يحتاج متابعة"
          : project.health === "green"
            ? "وفق التقييم المسجل"
            : "الحالة غير مقيّمة";
    const healthEn =
      project.health === "red"
        ? "At risk"
        : project.health === "amber"
          ? "Needs attention"
          : project.health === "green"
            ? "On recorded assessment"
            : "Health not assessed";
    const dateAr = feed.projects.source.kind === "database" ? "آخر تحديث" : "بداية مسجلة";
    lines.push({
      id: `project-${project.id}`,
      ...(region ? { regionId: region.id } : {}),
      ar: `مشروع: ${project.nameAr} · ${region?.shortAr ?? project.area ?? "المنطقة غير محددة"} · الإنجاز ${progress === null ? "لم يُقَس" : `${progress} من 100`} · ${healthAr} · ${project.at ? `${dateAr} ${project.at.slice(0, 10)} · ` : ""}${sourceLabel(feed.projects.source, true)}`,
      en: `Project: ${project.nameEn} · ${region?.shortEn ?? project.area ?? "Region not recorded"} · Progress ${progress === null ? "not measured" : `${progress} / 100`} · ${healthEn} · ${sourceLabel(feed.projects.source, false)}`,
      tone:
        project.health === "red"
          ? "danger"
          : project.health === "amber"
            ? "warning"
            : project.health === "green"
              ? "success"
              : "neutral",
      ...(progress === null ? {} : { progress }),
    });
  }
  if (!feed.projects.rows.length)
    lines.push({
      id: "projects-empty",
      ar:
        feed.projects.source.kind === "unavailable"
          ? "تعذرت قراءة أخبار المشاريع الآن"
          : "لا مشاريع متاحة في نطاق القراءة الحالي",
      en:
        feed.projects.source.kind === "unavailable"
          ? "Project updates unavailable"
          : "No projects in the current reading scope",
    });
  return lines;
}
