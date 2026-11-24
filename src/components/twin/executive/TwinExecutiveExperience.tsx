import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Activity,
  Building2,
  Cctv,
  DoorOpen,
  Footprints,
  Play,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_REGION_ID,
  REGIONS,
  REGION_ACCENT_HEX,
  getRegion,
  type RegionId,
} from "@/lib/regions";
import {
  EXECUTIVE_STATUS,
  EXECUTIVE_TWIN_REFERENCE,
  type ExecutiveDepartmentId,
} from "./executive-twin-model";
import "@/styles/twin-executive.css";

export interface TwinExecutiveExperienceProps {
  readonly poster?: {
    readonly src: string;
    readonly srcSet?: string;
    readonly sizes?: string;
    readonly width: number;
    readonly height: number;
  };
  readonly initialRegionId?: RegionId;
  /** Renders an initially expanded film inset when a film is available. */
  readonly renderBroadcast?: () => ReactNode;
}

const departmentIcons = {
  substations: Building2,
  perimeter: DoorOpen,
  surveillance: Cctv,
  sensors: Activity,
  logistics: Footprints,
};
const metricIcons = [ShieldCheck, Users, Building2, Footprints, Activity];

/** A local reference scene, independent of the live asset tree and all operational actions. */
export function TwinExecutiveExperience({
  poster,
  initialRegionId = DEFAULT_REGION_ID,
  renderBroadcast,
}: TwinExecutiveExperienceProps) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const lang = ar ? "ar" : "en";
  const uid = useId();
  const filmButton = useRef<HTMLButtonElement>(null);
  const [regionId, setRegionId] = useState(() => getRegion(initialRegionId).id);
  const [departmentId, setDepartmentId] = useState<ExecutiveDepartmentId>("substations");
  const [regionsShown, setRegionsShown] = useState(true);
  const [assetsShown, setAssetsShown] = useState(true);
  const [broadcastOpen, setBroadcastOpen] = useState(Boolean(renderBroadcast));
  const region = getRegion(regionId);
  const department = EXECUTIVE_TWIN_REFERENCE.departments.find((item) => item.id === departmentId)!;
  const DetailIcon = departmentIcons[departmentId];
  const reference = ar
    ? "مرجع توضيحي · ليست بيانات تشغيلية"
    : "Illustrative reference · not operational data";

  return (
    <section
      className="tx-executive"
      dir={ar ? "rtl" : "ltr"}
      aria-labelledby={`${uid}-title`}
      data-source="reference"
      data-simulation="true"
    >
      <header className="tx-head">
        <span className="tx-eyebrow">SADEED / {ar ? "التوأم الرقمي" : "DIGITAL TWIN"}</span>
        <h2 id={`${uid}-title`}>{ar ? "التوأم الرقمي للمناطق" : "Regional digital twin"}</h2>
        <p className="tx-reference">{reference}</p>
      </header>

      <div className="tx-scene">
        {poster && (
          <img
            className="tx-poster"
            src={poster.src}
            srcSet={poster.srcSet}
            sizes={poster.sizes}
            width={poster.width}
            height={poster.height}
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        )}
        <div className="tx-scene-caption">
          <span>{ar ? "مشهد صناعي تصوري" : "Industrial concept scene"}</span>
          <strong>{ar ? region.shortAr : region.shortEn}</strong>
        </div>
        {regionsShown && (
          <div
            className="tx-orbit"
            role="group"
            aria-label={ar ? "اختيار المنطقة في رسم رمزي" : "Select a region in the schematic"}
          >
            <svg className="tx-globe" viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r="92" />
              <ellipse cx="100" cy="100" rx="48" ry="92" />
              <ellipse cx="100" cy="100" rx="92" ry="32" />
              <path d="M28 45 155 154 165 50 40 145 28 45M100 8V192M8 100H192" />
            </svg>
            <span className="tx-north">
              {ar ? "الشمالية · مرجع غير متصل" : "North · unconnected reference"}
            </span>
            <div className="tx-region-list">
              {REGIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={regionId === item.id}
                  onClick={() => setRegionId(item.id)}
                  style={{ "--tx-accent": REGION_ACCENT_HEX[item.id] } as CSSProperties}
                >
                  <i aria-hidden="true" />
                  {ar ? item.shortAr : item.shortEn}
                </button>
              ))}
            </div>
          </div>
        )}
        {assetsShown && (
          <div
            className="tx-assets"
            role="group"
            aria-label={ar ? "أقسام المشهد التوضيحي" : "Illustrative scene departments"}
          >
            {EXECUTIVE_TWIN_REFERENCE.departments.map((item) => {
              const Icon = departmentIcons[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item[lang]}
                  aria-pressed={departmentId === item.id}
                  onClick={() => setDepartmentId(item.id)}
                  aria-controls={`${uid}-detail`}
                >
                  <Icon aria-hidden="true" size={20} />
                </button>
              );
            })}
          </div>
        )}
        <button
          ref={filmButton}
          type="button"
          className="tx-film-button"
          aria-expanded={broadcastOpen}
          aria-controls={`${uid}-film`}
          onClick={() => setBroadcastOpen((value) => !value)}
        >
          <Play aria-hidden="true" size={18} />
          {ar ? "فيلم توضيحي" : "Illustrative film"}
        </button>
      </div>

      <div className="tx-tools" role="group" aria-label={ar ? "طبقات المشهد" : "Scene layers"}>
        <button
          type="button"
          aria-pressed={regionsShown}
          onClick={() => setRegionsShown((value) => !value)}
        >
          {ar ? "خريطة المناطق" : "Region map"}
        </button>
        <button
          type="button"
          aria-pressed={assetsShown}
          onClick={() => setAssetsShown((value) => !value)}
        >
          {ar ? "علامات الأقسام" : "Department markers"}
        </button>
      </div>
      {broadcastOpen && (
        <div id={`${uid}-film`} className="tx-film">
          <p className="tx-reference">{reference}</p>
          {renderBroadcast ? (
            renderBroadcast()
          ) : (
            <p>
              {ar
                ? "لم يُرفق فيديو لهذا المشهد بعد."
                : "No film has been supplied for this scene yet."}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setBroadcastOpen(false);
              filmButton.current?.focus();
            }}
          >
            {ar ? "إغلاق الفيلم" : "Close film"}
          </button>
        </div>
      )}

      <div
        className="tx-metrics"
        role="group"
        aria-label={ar ? "مؤشرات الصورة المرجعية" : "Reference image metrics"}
      >
        {EXECUTIVE_TWIN_REFERENCE.metrics.map((item, index) => {
          const Icon = metricIcons[index];
          return (
            <div key={item.en}>
              <Icon aria-hidden="true" size={20} />
              <strong>
                <bdi>{item.value}</bdi>
              </strong>
              <span>{item[lang]}</span>
            </div>
          );
        })}
      </div>

      <div className="tx-department-head">
        <h3>{ar ? region.labelAr : region.labelEn}</h3>
        <span>{ar ? "٥ أقسام مرجعية" : "5 reference departments"}</span>
      </div>
      <div className="tx-departments">
        {EXECUTIVE_TWIN_REFERENCE.departments.map((item) => {
          const Icon = departmentIcons[item.id];
          return (
            <button
              key={item.id}
              type="button"
              className="tx-department"
              data-status={item.status}
              aria-pressed={departmentId === item.id}
              onClick={() => setDepartmentId(item.id)}
              aria-controls={`${uid}-detail`}
            >
              <span className="tx-percent" style={{ "--tx-pct": `${item.pct}%` } as CSSProperties}>
                <bdi>{item.pct}%</bdi>
              </span>
              <span className="tx-department-copy">
                <strong>{item[lang]}</strong>
                <small>
                  {item.sites} {ar ? "مواقع" : "sites"} · {item.reports} {ar ? "بلاغات" : "reports"}
                </small>
                <em>{EXECUTIVE_STATUS[item.status][lang]}</em>
              </span>
              <span className="tx-department-art" aria-hidden="true">
                <Icon size={30} />
              </span>
            </button>
          );
        })}
      </div>
      <div
        id={`${uid}-detail`}
        className="tx-detail"
        role="group"
        aria-labelledby={`${uid}-detail-title`}
        aria-live="polite"
      >
        <DetailIcon aria-hidden="true" size={28} />
        <div>
          <h3 id={`${uid}-detail-title`}>{department[lang]}</h3>
          <p>
            {EXECUTIVE_STATUS[department.status][lang]} · <bdi>{department.pct}%</bdi>
          </p>
          <p className="tx-reference">{reference}</p>
        </div>
      </div>
      <p className="tx-footnote">
        {ar
          ? "الأرقام من الصورة المرجعية. الاختيار والطبقات محليان؛ لا اتصال بأصول أو أنظمة أمنية."
          : "Values come from the reference image. Selection and layers are local; no connection to security assets or systems."}
      </p>
    </section>
  );
}

export default TwinExecutiveExperience;
