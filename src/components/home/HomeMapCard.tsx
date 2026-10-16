/**
 * بطاقة الخريطة — صدر الرئيسية يسارًا (≈ ٥/٧ من الصفّ، المواصفة §4.4)، كما
 * رسمتها صورة المالك «بحذافيرها» (قرارات N1–N4، ٢٠٢٦/١٠/١٤).
 *
 * **شاشةٌ داكنة في الوضعين** (`.nx-arabia`): رموز الحبر والسطح مثبَّتة محليًّا،
 * فلا أداة `text-white`/`bg-white` هنا — جسر الوضع الفاتح يعيد تعريفهما.
 *
 * التشريح كما في الصورة (`ArabianPeninsulaMap` يرتّبه مسرحًا):
 *   • الشريط العلوي — تبويبات العرض يسارًا: «خريطة السعودية» (العرض الحالي)
 *     · «مخطط صناعي» (← `/sec/twin`) · «طبقات» (يُظهر سكّة الطبقات ويخفيها)؛
 *     ورقاقات المناطق يمينًا والوسطى مُبرَزةً (المنطقة الفاعلة افتراضًا).
 *   • يسارًا سكّة التحكّم: ملاءمة · البوصلة (← `/executive-map`) · تكبير ·
 *     تصغير · الطبقات.
 *   • على الرسم فقاعات المناطق الأربع، ويمينًا سكّة الطبقات الثماني، وأسفل
 *     اليسار «إحصائيات سريعة» بأرقامها الأربعة وسهمها.
 *
 * **الأرقام (N2، المادة ٢٧):** كل رقمٍ مرسوم يُعرض كما رُسم من المحاكاة
 * المرجعية (`home-reference.ts`) تحت شارة «محاكاة» ظاهرة، **والحيّ يفوز
 * تلقائيًّا** عبر `chooseLive` متى أعادت قراءته قيمةً مقيسة حيّة. وفقاعات
 * المناطق مرجعٌ دائمًا: لا توزيع على المناطق مقيسٌ اليوم (`liveOf` — «الخريطة»)،
 * والحيّ لكل منطقة (المواقع المرسومة والامتثال) في تلميح الفقاعة ووصفها.
 * التحميل هيكلٌ والخطأ مرجعٌ موسوم بإعادة محاولة — لا يُقرأ أيٌّ منهما قياسًا.
 *
 * **ألوان الطبقات كما رُسمت** (أزرق · أخضر · كهرماني · أحمر)، والمثلث الأحمر
 * في الصورة يُرسم مثمّنًا (§3.5: الأحمر معنى «خطر» وشكله المثمّن).
 */
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Cctv,
  CircleDot,
  Hexagon,
  LockKeyhole,
  MapPin,
  Move,
  OctagonAlert,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { REGIONS, type RegionId } from "@/lib/regions";
import {
  ArabianPeninsulaMap,
  type ArabiaBubble,
  type ArabiaQuickStat,
  type ArabiaSite,
} from "@/components/map/ArabianPeninsulaMap";
import { useHomeReads } from "@/components/home/home-reads";
import { statusOf, type ReadStatus } from "@/components/home/home-primitives";
import {
  HOME_REFERENCE,
  chooseLive,
  liveOf,
  type RefQuickStatId,
} from "@/components/home/home-reference";

/**
 * طبقات الخريطة الثماني كما في الصورة — كلّ طبقةٍ رابطٌ إلى شاشتها الحيّة،
 * وبلاطتها بلونها المرسوم.
 */
interface MapLayer {
  readonly key: string;
  readonly ar: string;
  readonly en: string;
  readonly to: string;
  readonly icon: LucideIcon;
  readonly tone: "blue" | "green" | "amber" | "red";
}

const LAYERS: readonly MapLayer[] = [
  {
    key: "facilities",
    ar: "المرافق",
    en: "Facilities",
    to: "/sec/facilities",
    icon: CircleDot,
    tone: "blue",
  },
  { key: "cameras", ar: "الكاميرات", en: "Cameras", to: "/sec/cctv", icon: Cctv, tone: "blue" },
  {
    key: "patrols",
    ar: "الدوريات",
    en: "Patrols",
    to: "/sec/patrols",
    icon: MapPin,
    tone: "green",
  },
  {
    key: "access",
    ar: "نقاط الدخول",
    en: "Entry points",
    to: "/sec/access",
    icon: LockKeyhole,
    tone: "blue",
  },
  { key: "people", ar: "الأفراد", en: "People", to: "/sec/shifts", icon: UserRound, tone: "blue" },
  {
    key: "assets",
    ar: "الأصول",
    en: "Assets",
    to: "/sec/maintenance",
    icon: Hexagon,
    tone: "amber",
  },
  {
    key: "risks",
    ar: "المخاطر",
    en: "Risks",
    to: "/sec/risks",
    icon: OctagonAlert,
    tone: "red",
  },
  {
    key: "incidents",
    ar: "الحوادث",
    en: "Incidents",
    to: "/sec/incidents",
    icon: OctagonAlert,
    tone: "red",
  },
];

const LAYERS_ID = "nx-home-map-layers";

/** رمز كل إحصاءٍ سريع ووجهته — بترتيب الصورة (الأيمن أولًا). */
const QUICK_VIEW: Record<RefQuickStatId, { en: string; icon: LucideIcon; to: string }> = {
  "entry-points": { en: "Entry points", icon: LockKeyhole, to: "/sec/access" },
  cameras: { en: "Cameras", icon: Cctv, to: "/sec/cctv" },
  sites: { en: "Sites", icon: Move, to: "/executive-map" },
  facilities: { en: "Facilities", icon: Building2, to: "/sec/facilities" },
};

export function HomeMapCard() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const textDir = ar ? "rtl" : "ltr";
  const { sec, state, execKpis } = useHomeReads();
  /** سكّة الطبقات ظاهرةٌ ابتداءً كما في الصورة، و«طبقات» تبدّلها. */
  const [layersOpen, setLayersOpen] = useState(true);
  const toggleLayers = () => setLayersOpen((open) => !open);

  const mapSites: ArabiaSite[] = useMemo(
    () =>
      (sec.data?.sites ?? []).map((s) => ({
        id: s.id,
        name: ar ? s.name_ar : s.name_en,
        lat: s.lat,
        lng: s.lng,
      })),
    [sec.data, ar],
  );

  // الامتثال لكل منطقة من صفوف الخادم — `!== null` لا `> 0`: الصفر قياس.
  const complianceByRegion = useMemo(() => {
    const out: Partial<Record<RegionId, number>> = {};
    for (const region of REGIONS) {
      const row = state.data?.regions.find((r) => r.region_id === region.id);
      if (row && row.compliance_pct !== null) out[region.id] = row.compliance_pct;
    }
    return out;
  }, [state.data]);

  // الخريطة تجمع قراءتين (المواقع والامتثال): خطأ أيٍّ منهما خطأ، وانتظار
  // أيٍّ منهما انتظار — فلا يُقرأ الغائب «لم يُقَس» وهو لم يصل بعد.
  const mapStatus = statusOf({
    isPending: sec.isPending || state.isPending,
    isError: sec.isError || state.isError,
  });

  /* ── فقاعات المناطق: مرجعٌ دائمًا (لا توزيع مقيس على المناطق) ─────────── */
  const bubbles: ArabiaBubble[] = HOME_REFERENCE.map.regions.map((r) => ({
    regionId: r.regionId,
    value: r.value,
    change: r.change,
    badges: r.badges.map((b) => ({ count: b.count, tone: b.drawn })),
    simulated: HOME_REFERENCE.map.is_simulation,
  }));

  /* ── «إحصائيات سريعة»: الحيّ يفوز متى قِيس، وإلا المرجع الموسوم ─────── */
  const kpis = execKpis.data;
  const secLive = liveOf.sec(sec.data);
  const execLive = liveOf.execKpis(kpis);
  const live: Record<RefQuickStatId, { value: number | null; isLive: boolean; st: ReadStatus }> = {
    "entry-points": {
      value: kpis ? kpis.gates_total : null,
      isLive: execLive,
      st: statusOf(execKpis),
    },
    cameras: { value: kpis ? kpis.cameras_total : null, isLive: execLive, st: statusOf(execKpis) },
    sites: { value: sec.data ? sec.data.counts.sites : null, isLive: secLive, st: statusOf(sec) },
    // لا عدّ للمرافق في أي قراءةٍ تصل الرئيسية — المرجع الموسوم دائمًا.
    facilities: { value: null, isLive: false, st: "ready" },
  };
  const quickStats: ArabiaQuickStat[] = HOME_REFERENCE.map.quickStats.map((ref) => {
    const l = live[ref.id];
    const view = QUICK_VIEW[ref.id];
    const Icon = view.icon;
    const chosen = chooseLive(l.st === "ready" ? l.value : null, l.st === "ready" && l.isLive, ref);
    return {
      key: ref.id,
      ar: ref.labelAr,
      en: view.en,
      value: chosen.value,
      simulated: chosen.simulated,
      // الخطأ لا يحمل رقمًا حيًّا: المرجع الموسوم مكانه ومعه إعادة المحاولة.
      status: l.st,
      to: view.to,
      icon: <Icon />,
    };
  });

  /* ── تبويبات العرض: الترتيب يسارًا ← يمينًا كما في الصورة، والنصّ بلغته ── */
  const viewTabs = (
    <div
      role="group"
      dir="ltr"
      aria-label={ar ? "عرض الخريطة" : "Map view"}
      className="nx-home-map-views"
    >
      {/* العرض الحالي — يُعلَن حاليًّا ولا يُنقر: الخريطة معروضةٌ فعلًا. */}
      <span dir={textDir} aria-current="true" className="nx-home-map-view">
        {ar ? "خريطة السعودية" : "Saudi map"}
      </span>
      <Link to="/sec/twin" dir={textDir} className="nx-home-map-view">
        {ar ? "مخطط صناعي" : "Industrial layout"}
      </Link>
      <button
        type="button"
        dir={textDir}
        aria-pressed={layersOpen}
        aria-controls={LAYERS_ID}
        onClick={toggleLayers}
        className="nx-home-map-view"
      >
        {ar ? "طبقات" : "Layers"}
      </button>
    </div>
  );

  /* ── سكّة الطبقات: ثمانية روابط بأيقوناتها — تبقى في الشجرة وتُخفى ── */
  const layersRail = (
    <nav
      id={LAYERS_ID}
      dir={textDir}
      hidden={!layersOpen}
      aria-label={ar ? "طبقات الخريطة" : "Map layers"}
      className="nx-home-map-layers"
    >
      <ul>
        {LAYERS.map((layer) => {
          const Icon = layer.icon;
          return (
            <li key={layer.key}>
              <Link to={layer.to} data-tone={layer.tone} className="nx-home-map-layer">
                <span aria-hidden className="nx-home-map-layer-icon">
                  <Icon />
                </span>
                <span className="min-w-0">{ar ? layer.ar : layer.en}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <div className="nx-home-map">
      <ArabianPeninsulaMap
        status={mapStatus}
        onRetry={() => {
          void sec.refetch();
          void state.refetch();
          void execKpis.refetch();
        }}
        sites={mapSites}
        sitesSimulated={sec.data !== undefined && !secLive}
        compliance={complianceByRegion}
        quickStats={quickStats}
        quickMore={{ to: "/sec", ar: "كل الإحصائيات — الأمن الصناعي", en: "All statistics" }}
        bubbles={bubbles}
        bubbleMetric={{ ar: "الأفراد", en: "Personnel" }}
        ar={ar}
        viewTabs={viewTabs}
        layersRail={layersRail}
        layersToggle={{ open: layersOpen, onToggle: toggleLayers, controls: LAYERS_ID }}
      />
    </div>
  );
}
