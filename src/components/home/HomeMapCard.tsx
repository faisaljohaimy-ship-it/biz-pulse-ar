/**
 * بطاقة الخريطة — صدر الرئيسية يسارًا (≈ ٥/٧ من الصفّ، المواصفة §4.4).
 *
 * **شاشةٌ داكنة في الوضعين** (`.nx-arabia`): رموز الحبر والسطح مثبَّتة محليًّا،
 * فلا أداة `text-white`/`bg-white` هنا — جسر الوضع الفاتح يعيد تعريفهما.
 *
 * التشريح كما في الصورة، في مسار التدفّق العادي لا فوق الرسم:
 *   • الشريط العلوي — تبويبات العرض يسارًا: «خريطة السعودية» (العرض الحالي)
 *     · «مخطط صناعي» (← `/sec/twin`) · «طبقات» (يُظهر سكّة الطبقات ويخفيها)؛
 *     ورقاقات المناطق يمينًا (`aria-pressed`) من `<ArabianPeninsulaMap>`.
 *   • الجسم — سكّة التحكّم (تكبير حقيقي على `viewBox` · توسيع ←
 *     `/executive-map`) · الرسم · سكّة الطبقات الثماني، كلٌّ رابطٌ إلى شاشته.
 *   • الذيل — «إحصائيات سريعة» وبطاقات المناطق الأربع (← `/sec?region=…`).
 *
 * **الأرقام من مصادرها (المادة ٢٧):** المواقع من `getSecOverview`، والكاميرات
 * ونقاط الدخول من مؤشرات اللوحة التنفيذية (`cameras_total` · `gates_total`)،
 * والامتثال لكل منطقة من `getCommandCenterState` — والصفر قياس، فالفحص
 * `!== null` لا `> 0`. والمرافق لا عدّ لها في أي قراءةٍ هنا: «لم يُقَس».
 * ولكلّ رقمٍ حال قراءته: التحميل والخطأ لا يُقرآن «لم يُقَس».
 *
 * **أيقونات الطبقات من الصورة**، إلا المخاطر والحوادث: ترسمهما الصورة مثلثًا
 * أحمر، والمثلث شكل «تحذير» والأحمر معنى «خطر» (§3.5) — والطبقة فئةٌ لا حكم.
 * فتأخذان رمزيهما في الشريط الجانبي (درعٌ منبِّه · صفّارة) بنبرة هوية.
 */
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Cctv,
  Hexagon,
  Layers,
  LockKeyhole,
  MapPin,
  MapPinned,
  Shield,
  ShieldAlert,
  Siren,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { REGIONS, type RegionId } from "@/lib/regions";
import {
  ArabianPeninsulaMap,
  type ArabiaQuickStat,
  type ArabiaSite,
} from "@/components/map/ArabianPeninsulaMap";
import { useHomeReads } from "@/components/home/home-reads";
import { statusOf } from "@/components/home/home-primitives";

/**
 * طبقات الخريطة الثماني كما في الصورة — كلّ طبقةٍ رابطٌ إلى شاشتها الحيّة.
 * النبرة هويةٌ لا حكم: أزرق أو سماوي فقط (الأحمر والكهرماني والأخضر معانٍ
 * محجوزة للحالة)، والسماوي حيث رسمت الصورة لونًا غير الأزرق.
 */
interface MapLayer {
  readonly key: string;
  readonly ar: string;
  readonly en: string;
  readonly to: string;
  readonly icon: LucideIcon;
  readonly tone: "blue" | "cyan";
}

const LAYERS: readonly MapLayer[] = [
  {
    key: "facilities",
    ar: "المرافق",
    en: "Facilities",
    to: "/sec/facilities",
    icon: MapPin,
    tone: "blue",
  },
  { key: "cameras", ar: "الكاميرات", en: "Cameras", to: "/sec/cctv", icon: Cctv, tone: "blue" },
  { key: "patrols", ar: "الدوريات", en: "Patrols", to: "/sec/patrols", icon: Shield, tone: "cyan" },
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
    tone: "cyan",
  },
  { key: "risks", ar: "المخاطر", en: "Risks", to: "/sec/risks", icon: ShieldAlert, tone: "cyan" },
  {
    key: "incidents",
    ar: "الحوادث",
    en: "Incidents",
    to: "/sec/incidents",
    icon: Siren,
    tone: "cyan",
  },
];

const LAYERS_ID = "nx-home-map-layers";

export function HomeMapCard() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const textDir = ar ? "rtl" : "ltr";
  const { sec, state, execKpis } = useHomeReads();
  /** سكّة الطبقات ظاهرةٌ ابتداءً كما في الصورة، و«طبقات» تبدّلها. */
  const [layersOpen, setLayersOpen] = useState(true);

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

  const kpis = execKpis.data;
  const quickStats: ArabiaQuickStat[] = [
    {
      // لا عدّ للمرافق في أي قراءةٍ تصل الرئيسية — «لم يُقَس» لا رقمٌ مؤلَّف.
      key: "facilities",
      ar: "المرافق",
      en: "Facilities",
      value: null,
      status: "ready",
      icon: <Building2 />,
    },
    {
      key: "sites",
      ar: "المواقع",
      en: "Sites",
      value: sec.data ? sec.data.sites.length : null,
      status: statusOf(sec),
      icon: <MapPinned />,
    },
    {
      key: "cameras",
      ar: "الكاميرات",
      en: "Cameras",
      value: kpis ? kpis.cameras_total : null,
      status: statusOf(execKpis),
      icon: <Cctv />,
    },
    {
      key: "gates",
      ar: "نقاط الدخول",
      en: "Entry points",
      value: kpis ? kpis.gates_total : null,
      status: statusOf(execKpis),
      icon: <LockKeyhole />,
    },
  ];

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
        onClick={() => setLayersOpen((open) => !open)}
        className="nx-home-map-view"
      >
        <Layers aria-hidden />
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
        compliance={complianceByRegion}
        quickStats={quickStats}
        ar={ar}
        viewTabs={viewTabs}
        layersRail={layersRail}
      />
    </div>
  );
}
