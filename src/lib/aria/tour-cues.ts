/**
 * ARIA Auto-Tour — cue schedule.
 *
 * Each cue binds a moment in the ARIA narration (audio track from
 * `aria-tour-full.mp4`) to a NEXIOS route. When the video's `currentTime`
 * crosses a cue's `tSec`, the tour shell navigates the embedded viewport
 * to that route, so the window "opens itself" as ARIA introduces it.
 *
 * Timestamps are calibrated against the master narration and can be
 * re-recorded from the /aria/tour Calibration Mode (press `M` while
 * playing) then pasted back here — the schema is intentionally flat
 * for easy copy/paste.
 *
 * Video: src/assets/aria-tour-full-v2.mp4.asset.json  (≈499s, AR-only).
 */

export interface TourCue {
  /** cue trigger, seconds into the narration */
  readonly tSec: number;
  /** absolute route path to load in the tour viewport */
  readonly route: string;
  /** short Arabic chapter title (shown on progress rail) */
  readonly titleAr: string;
  /** short English chapter title */
  readonly titleEn: string;
}

/**
 * Default schedule — 32 chapters spread across the 499s narration
 * with a ~9s intro before the first window is opened. Adjust freely
 * (calibration mode outputs the exact array).
 */
export const TOUR_CUES: readonly TourCue[] = [
  { tSec: 0, route: "/os", titleAr: "الافتتاح", titleEn: "Opening" },
  { tSec: 9, route: "/os", titleAr: "نظام التشغيل التنفيذي", titleEn: "Executive OS" },
  { tSec: 24, route: "/operations", titleAr: "مركز العمليات", titleEn: "Operations Center" },
  { tSec: 40, route: "/sec", titleAr: "المنصة الأمنية", titleEn: "Security Platform" },
  { tSec: 56, route: "/sec/exec", titleAr: "غرفة القيادة التنفيذية", titleEn: "Executive Room" },
  { tSec: 72, route: "/sec/twin", titleAr: "التوأم الرقمي", titleEn: "Digital Twin" },
  { tSec: 88, route: "/sec/circles", titleAr: "الدوائر التشغيلية", titleEn: "Circles" },
  { tSec: 104, route: "/sec/sections", titleAr: "الأقسام", titleEn: "Sections" },
  { tSec: 120, route: "/sec/projects", titleAr: "المشاريع", titleEn: "Projects" },
  { tSec: 136, route: "/sec/maintenance", titleAr: "الصيانة", titleEn: "Maintenance" },
  { tSec: 152, route: "/sec/incidents", titleAr: "الحوادث", titleEn: "Incidents" },
  { tSec: 168, route: "/sec/patrols", titleAr: "الدوريات", titleEn: "Patrols" },
  { tSec: 184, route: "/sec/access", titleAr: "التحكم بالدخول", titleEn: "Access Control" },
  { tSec: 200, route: "/sec/visitors", titleAr: "الزوار", titleEn: "Visitors" },
  { tSec: 216, route: "/sec/contractors", titleAr: "المقاولون", titleEn: "Contractors" },
  { tSec: 232, route: "/sec/permits", titleAr: "التصاريح", titleEn: "Permits" },
  { tSec: 248, route: "/sec/vehicles", titleAr: "المركبات", titleEn: "Vehicles" },
  { tSec: 264, route: "/sec/emergency", titleAr: "الطوارئ", titleEn: "Emergency" },
  { tSec: 280, route: "/sec/cctv", titleAr: "المراقبة", titleEn: "CCTV" },
  { tSec: 296, route: "/sec/reports", titleAr: "التقارير", titleEn: "Reports" },
  { tSec: 312, route: "/sec/risks", titleAr: "المخاطر", titleEn: "Risks" },
  { tSec: 328, route: "/sec/facilities", titleAr: "المرافق", titleEn: "Facilities" },
  { tSec: 344, route: "/sec/timeline", titleAr: "الخط الزمني", titleEn: "Timeline" },
  { tSec: 360, route: "/sec/shifts", titleAr: "الورديات", titleEn: "Shifts" },
  { tSec: 376, route: "/sec/knowledge", titleAr: "المعرفة", titleEn: "Knowledge" },
  { tSec: 392, route: "/sec/kpi", titleAr: "مؤشرات الأداء", titleEn: "KPIs" },
  { tSec: 408, route: "/sec/ai", titleAr: "الذكاء الأمني", titleEn: "Security AI" },
  { tSec: 424, route: "/sec/integrations", titleAr: "التكاملات", titleEn: "Integrations" },
  { tSec: 440, route: "/settings", titleAr: "الإعدادات", titleEn: "Settings" },
  { tSec: 456, route: "/admin", titleAr: "الإدارة", titleEn: "Admin" },
  { tSec: 472, route: "/os", titleAr: "الخاتمة", titleEn: "Finale" },
];

/** Find the active cue for a given playhead time. */
export function activeCue(tSec: number): TourCue {
  let hit: TourCue = TOUR_CUES[0];
  for (const c of TOUR_CUES) {
    if (c.tSec <= tSec) hit = c;
    else break;
  }
  return hit;
}

export function nextCue(tSec: number): TourCue | null {
  for (const c of TOUR_CUES) if (c.tSec > tSec + 0.05) return c;
  return null;
}

export function prevCue(tSec: number): TourCue | null {
  const cur = activeCue(tSec);
  const idx = TOUR_CUES.indexOf(cur);
  if (idx <= 0) return null;
  return TOUR_CUES[idx - 1];
}
