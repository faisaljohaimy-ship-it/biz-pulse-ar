/**
 * NexiosCommandCenter — interactive ARIA executive dashboard artwork.
 *
 * The approved 3:2 artwork remains pixel-perfect while percentage-positioned
 * hotspots turn its visible controls into real NEXIOS navigation. Coordinates
 * are relative to the image, so image and controls always scale together.
 */
import { Link } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import commandCenterAria from "@/assets/nexios-command-center-aria.png";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { REGION_ACCENT_HEX, REGION_ACCENT_RGB, type RegionId } from "@/lib/regions";
import { cn } from "@/lib/utils";

interface HotspotSpec {
  readonly id: string;
  readonly to: string;
  readonly labelAr: string;
  readonly labelEn: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: `#${string}`;
}

/** Physical positions measured against the 1536 × 1024 source artwork. */
export const HOTSPOTS = [
  // Top system bar.
  {
    id: "system-health",
    to: "/status",
    labelAr: "حالة النظام",
    labelEn: "System status",
    x: 12.4,
    y: 1.8,
    width: 7.6,
    height: 6.2,
    color: "#22C55E",
  },
  {
    id: "communications",
    to: "/integrations",
    labelAr: "الاتصالات والتكاملات",
    labelEn: "Communications and integrations",
    x: 20.7,
    y: 1.8,
    width: 8,
    height: 6.2,
    color: "#22D3EE",
  },
  {
    id: "nexios-logo",
    to: "/os",
    labelAr: "نظام NEXIOS AI OS",
    labelEn: "NEXIOS AI OS",
    x: 37.5,
    y: 0.7,
    width: 28.5,
    height: 7.3,
    color: "#3B82F6",
  },
  {
    id: "search",
    to: "/knowledge",
    labelAr: "البحث المعرفي",
    labelEn: "Knowledge search",
    x: 73.2,
    y: 1.8,
    width: 4.4,
    height: 5.1,
    color: "#22D3EE",
  },
  {
    id: "notifications",
    to: "/urgent-ops",
    labelAr: "التنبيهات العاجلة",
    labelEn: "Urgent alerts",
    x: 78.2,
    y: 1.8,
    width: 4.4,
    height: 5.1,
    color: "#22C55E",
  },
  {
    id: "top-settings",
    to: "/settings",
    labelAr: "الإعدادات",
    labelEn: "Settings",
    x: 83.1,
    y: 1.8,
    width: 4.4,
    height: 5.1,
    color: "#3B82F6",
  },
  {
    id: "profile",
    to: "/team",
    labelAr: "الملف التنفيذي والفريق",
    labelEn: "Executive profile and team",
    x: 88,
    y: 1.8,
    width: 11.5,
    height: 5.1,
    color: "#22D3EE",
  },

  // Western Region — electric cyan.
  {
    id: "west-data",
    to: "/knowledge",
    labelAr: "إدارة البيانات",
    labelEn: "Data management",
    x: 1.8,
    y: 41,
    width: 5,
    height: 7,
    color: "#22D3EE",
  },
  {
    id: "west-tech",
    to: "/intelligence",
    labelAr: "التقنية",
    labelEn: "Technology",
    x: 7.1,
    y: 41,
    width: 5.2,
    height: 7,
    color: "#22D3EE",
  },
  {
    id: "west-smart-services",
    to: "/agents",
    labelAr: "الخدمات الذكية",
    labelEn: "Smart services",
    x: 12.8,
    y: 41,
    width: 5.3,
    height: 7,
    color: "#22D3EE",
  },
  {
    id: "west-transport",
    to: "/operations",
    labelAr: "النقل والخدمات",
    labelEn: "Transport and services",
    x: 18.6,
    y: 41,
    width: 5.7,
    height: 7,
    color: "#22D3EE",
  },
  {
    id: "west-facilities",
    to: "/digital-twin",
    labelAr: "المرافق",
    labelEn: "Facilities",
    x: 24.7,
    y: 41,
    width: 5.6,
    height: 7,
    color: "#22D3EE",
  },

  // Central Region — royal blue.
  {
    id: "central-ai",
    to: "/intelligence",
    labelAr: "الذكاء الاصطناعي",
    labelEn: "Artificial intelligence",
    x: 38,
    y: 23.5,
    width: 5.3,
    height: 7.3,
    color: "#3B82F6",
  },
  {
    id: "central-analytics",
    to: "/analytics",
    labelAr: "تحليل البيانات",
    labelEn: "Data analytics",
    x: 43.6,
    y: 23.5,
    width: 5.4,
    height: 7.3,
    color: "#3B82F6",
  },
  {
    id: "central-cyber",
    to: "/security-center",
    labelAr: "الأمن السيبراني",
    labelEn: "Cybersecurity",
    x: 49.3,
    y: 23.5,
    width: 5.5,
    height: 7.3,
    color: "#3B82F6",
  },
  {
    id: "central-projects",
    to: "/portfolio",
    labelAr: "إدارة المشاريع",
    labelEn: "Project management",
    x: 55.1,
    y: 23.5,
    width: 5.6,
    height: 7.3,
    color: "#3B82F6",
  },

  // Central map: broad map link first; the center control is layered above it.
  {
    id: "saudi-map",
    to: "/executive-map",
    labelAr: "الخريطة التنفيذية للمملكة",
    labelEn: "Saudi executive map",
    x: 36.8,
    y: 32.7,
    width: 26.3,
    height: 28.4,
    color: "#22D3EE",
  },
  {
    id: "map-command",
    to: "/command-center",
    labelAr: "مركز القيادة",
    labelEn: "Command center",
    x: 46.7,
    y: 43.4,
    width: 5.9,
    height: 9.4,
    color: "#3B82F6",
  },

  // Eastern Region — green.
  {
    id: "east-energy",
    to: "/operations",
    labelAr: "إنتاج الطاقة",
    labelEn: "Energy production",
    x: 67,
    y: 41.2,
    width: 5.2,
    height: 7,
    color: "#22C55E",
  },
  {
    id: "east-facilities",
    to: "/digital-twin",
    labelAr: "المرافق",
    labelEn: "Facilities",
    x: 72.7,
    y: 41.2,
    width: 5.2,
    height: 7,
    color: "#22C55E",
  },
  {
    id: "east-safety",
    to: "/sec",
    labelAr: "السلامة",
    labelEn: "Safety",
    x: 78.4,
    y: 41.2,
    width: 5.1,
    height: 7,
    color: "#22C55E",
  },
  {
    id: "east-sustainability",
    to: "/governance",
    labelAr: "الاستدامة",
    labelEn: "Sustainability",
    x: 84,
    y: 41.2,
    width: 5.7,
    height: 7,
    color: "#22C55E",
  },
  {
    id: "east-air",
    to: "/risk",
    labelAr: "جودة الهواء",
    labelEn: "Air quality",
    x: 90.2,
    y: 41.2,
    width: 6,
    height: 7,
    color: "#22C55E",
  },

  // ARIA console.
  {
    id: "aria-console",
    to: "/aria",
    labelAr: "فتح آريا التنفيذية",
    labelEn: "Open ARIA executive",
    x: 1.8,
    y: 53.1,
    width: 25.8,
    height: 27.4,
    color: "#3B82F6",
  },
  {
    id: "aria-microphone",
    to: "/aria",
    labelAr: "التحدث مع آريا",
    labelEn: "Talk to ARIA",
    x: 5,
    y: 80.8,
    width: 5.9,
    height: 9.2,
    color: "#3B82F6",
  },

  // Southern Region — amber gold.
  {
    id: "south-community",
    to: "/team",
    labelAr: "المجتمع",
    labelEn: "Community",
    x: 31.7,
    y: 87.3,
    width: 6.2,
    height: 6.3,
    color: "#F59E0B",
  },
  {
    id: "south-education",
    to: "/learn",
    labelAr: "التعليم",
    labelEn: "Education",
    x: 38.4,
    y: 87.3,
    width: 6.5,
    height: 6.3,
    color: "#F59E0B",
  },
  {
    id: "south-health",
    to: "/risk",
    labelAr: "الصحة",
    labelEn: "Health",
    x: 45.6,
    y: 87.3,
    width: 6.5,
    height: 6.3,
    color: "#F59E0B",
  },
  {
    id: "south-infrastructure",
    to: "/digital-twin",
    labelAr: "البنية التحتية",
    labelEn: "Infrastructure",
    x: 52.7,
    y: 87.3,
    width: 6.6,
    height: 6.3,
    color: "#F59E0B",
  },
  {
    id: "south-transport",
    to: "/executive-map",
    labelAr: "النقل الذكي",
    labelEn: "Smart transport",
    x: 59.8,
    y: 87.3,
    width: 6.6,
    height: 6.3,
    color: "#F59E0B",
  },

  // System status and alerts.
  {
    id: "overall-performance",
    to: "/analytics",
    labelAr: "الأداء العام",
    labelEn: "Overall performance",
    x: 75.7,
    y: 59.6,
    width: 7.3,
    height: 12.5,
    color: "#22C55E",
  },
  {
    id: "cyber-health",
    to: "/security-center",
    labelAr: "الأمن السيبراني",
    labelEn: "Cybersecurity health",
    x: 83.4,
    y: 59.6,
    width: 6.9,
    height: 12.5,
    color: "#22C55E",
  },
  {
    id: "availability",
    to: "/status",
    labelAr: "توفر النظام",
    labelEn: "System availability",
    x: 90.7,
    y: 59.6,
    width: 7,
    height: 12.5,
    color: "#22C55E",
  },
  {
    id: "critical-alert",
    to: "/urgent-ops",
    labelAr: "التنبيه الأمني الحرج",
    labelEn: "Critical security alert",
    x: 76.1,
    y: 79.4,
    width: 21.4,
    height: 3.8,
    color: "#EF4444",
  },
  {
    id: "project-update",
    to: "/operations",
    labelAr: "تحديث بيانات المشاريع",
    labelEn: "Project data update",
    x: 76.1,
    y: 83.4,
    width: 21.4,
    height: 3.7,
    color: "#22C55E",
  },
  {
    id: "performance-review",
    to: "/analytics",
    labelAr: "مراجعة أداء النظام",
    labelEn: "System performance review",
    x: 76.1,
    y: 87.3,
    width: 21.4,
    height: 3.7,
    color: "#3B82F6",
  },

  // Bottom navigation.
  {
    id: "nav-home",
    to: "/",
    labelAr: "الرئيسية",
    labelEn: "Home",
    x: 0,
    y: 94.3,
    width: 16.8,
    height: 5.7,
    color: "#22D3EE",
  },
  {
    id: "nav-performance",
    to: "/analytics",
    labelAr: "الأداء",
    labelEn: "Performance",
    x: 16.8,
    y: 94.3,
    width: 10.8,
    height: 5.7,
    color: "#3B82F6",
  },
  {
    id: "nav-projects",
    to: "/portfolio",
    labelAr: "المشاريع",
    labelEn: "Projects",
    x: 27.6,
    y: 94.3,
    width: 11,
    height: 5.7,
    color: "#3B82F6",
  },
  {
    id: "nav-resources",
    to: "/team",
    labelAr: "الموارد",
    labelEn: "Resources",
    x: 38.6,
    y: 94.3,
    width: 10.8,
    height: 5.7,
    color: "#22D3EE",
  },
  {
    id: "nav-risk",
    to: "/risk",
    labelAr: "المخاطر",
    labelEn: "Risk",
    x: 49.4,
    y: 94.3,
    width: 10.6,
    height: 5.7,
    color: "#F59E0B",
  },
  {
    id: "nav-reports",
    to: "/executive-reports",
    labelAr: "التقارير",
    labelEn: "Reports",
    x: 60,
    y: 94.3,
    width: 11,
    height: 5.7,
    color: "#3B82F6",
  },
  {
    id: "nav-ai",
    to: "/intelligence",
    labelAr: "الذكاء الاصطناعي",
    labelEn: "Artificial intelligence",
    x: 71,
    y: 94.3,
    width: 12.4,
    height: 5.7,
    color: "#3B82F6",
  },
  {
    id: "nav-settings",
    to: "/settings",
    labelAr: "الإعدادات",
    labelEn: "Settings",
    x: 83.4,
    y: 94.3,
    width: 16.6,
    height: 5.7,
    color: "#3B82F6",
  },
] as const satisfies readonly HotspotSpec[];

/** Region-owned artwork controls are identified by their stable id prefix. */
function regionForHotspot(id: string): RegionId | undefined {
  if (id.startsWith("west-")) return "western";
  if (id.startsWith("central-")) return "central";
  if (id.startsWith("east-")) return "eastern";
  if (id.startsWith("south-")) return "southern";
  return undefined;
}

/** Every overlay edge must use the exact visible icon colour, including global controls. */
function hexToRgbTriplet(hex: `#${string}`): string {
  const value = hex.slice(1);
  if (!/^[\da-f]{6}$/i.test(value)) return "34, 211, 238";
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)).join(", ");
}

export function NexiosCommandCenter() {
  const { locale } = useI18n();
  const { regionId, region, setRegion } = useRegion();
  const ar = locale === "ar";
  const activeColor = REGION_ACCENT_HEX[regionId];
  const [activatedHotspotId, setActivatedHotspotId] = useState<string | null>(null);

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      aria-label={
        ar ? "مركز القيادة التنفيذي التفاعلي مع آريا" : "Interactive ARIA executive command center"
      }
      aria-describedby="nexios-command-center-hint"
      className="relative z-10 mx-auto w-full max-w-[1536px] px-2 sm:px-4"
    >
      <p id="nexios-command-center-hint" className="sr-only">
        {ar
          ? "جميع الأيقونات الرئيسية في لوحة القيادة روابط تفاعلية إلى وحدات النظام."
          : "The command center's primary icons are interactive links to NEXIOS modules."}
      </p>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] sm:text-xs">
        <span
          className="inline-flex items-center gap-2 rounded-full border bg-[#020817]/75 px-3 py-1.5 font-semibold text-white backdrop-blur-xl"
          style={{ borderColor: `${activeColor}70`, boxShadow: `0 0 18px -8px ${activeColor}` }}
        >
          <span
            aria-hidden
            className="size-2 animate-pulse rounded-full"
            style={{ backgroundColor: activeColor, boxShadow: `0 0 9px ${activeColor}` }}
          />
          {ar ? `منطقة العمل: ${region.shortAr}` : `Work region: ${region.shortEn}`}
        </span>
        <span className="rounded-full border border-amber-400/30 bg-amber-400/[0.07] px-3 py-1.5 text-amber-200/90">
          {ar
            ? "واجهة مرجعية تفاعلية · المؤشرات داخل الصورة بيانات تجريبية"
            : "Interactive reference view · in-image KPIs are sample data"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-[clamp(12px,1.6vw,24px)] border border-[#22D3EE]/25 bg-[#020817] shadow-[0_24px_90px_rgba(0,0,0,0.55),0_0_42px_rgba(34,211,238,0.10)] [scrollbar-color:#22D3EE55_transparent] [scrollbar-width:thin]">
        <div className="relative min-w-[760px] sm:min-w-0">
          <img
            src={commandCenterAria}
            alt={
              ar
                ? "لوحة NEXIOS AI OS للمناطق الأربع مع المساعدة التنفيذية آريا"
                : "NEXIOS AI OS four-region dashboard with ARIA executive assistant"
            }
            width={1536}
            height={1024}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            draggable={false}
            className="pointer-events-none block h-auto w-full select-none object-contain"
          />

          <nav aria-label={ar ? "روابط لوحة القيادة التفاعلية" : "Interactive dashboard links"}>
            {HOTSPOTS.map((hotspot, index) => {
              const label = ar ? hotspot.labelAr : hotspot.labelEn;
              const ownerRegion = regionForHotspot(hotspot.id);
              const isActiveRegionIcon = ownerRegion === regionId;
              const isActivated = hotspot.id === activatedHotspotId;
              const glowColor = ownerRegion ? REGION_ACCENT_HEX[ownerRegion] : hotspot.color;
              const glowRgb = ownerRegion
                ? REGION_ACCENT_RGB[ownerRegion]
                : hexToRgbTriplet(hotspot.color);
              return (
                <Link
                  key={hotspot.id}
                  to={hotspot.to}
                  preload="intent"
                  onClick={() => {
                    setActivatedHotspotId(hotspot.id);
                    if (ownerRegion) setRegion(ownerRegion);
                  }}
                  onPointerDown={() => setActivatedHotspotId(hotspot.id)}
                  aria-label={label}
                  title={label}
                  data-hotspot={hotspot.id}
                  data-region-owner={ownerRegion}
                  data-region-active={isActiveRegionIcon ? "true" : undefined}
                  data-hotspot-activated={isActivated ? "true" : undefined}
                  className={cn(
                    "nx-region-hotspot group absolute z-10 block cursor-pointer touch-manipulation rounded-[clamp(4px,0.6vw,10px)] border border-transparent bg-transparent transition duration-200 hover:bg-white/[0.07] focus-visible:outline-none active:scale-[0.98]",
                    isActiveRegionIcon && "nx-active-region-hotspot",
                    isActivated && "nx-hotspot-activated",
                  )}
                  style={
                    {
                      left: `${hotspot.x}%`,
                      top: `${hotspot.y}%`,
                      width: `${hotspot.width}%`,
                      height: `${hotspot.height}%`,
                      "--hotspot-rgb": glowRgb,
                      "--hotspot-delay": `${-((index % 9) * 0.37)}s`,
                      // Keep keyboard focus aligned with each region's identity.
                      outlineColor: glowColor,
                    } as CSSProperties
                  }
                >
                  <span
                    aria-hidden
                    className="nx-hotspot-frame pointer-events-none absolute inset-0 rounded-[inherit]"
                  />
                  <span className="sr-only">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <p className="mt-2 px-1 text-center text-[10px] text-white/45 sm:hidden">
        {ar ? "اسحب أفقياً لاستعراض اللوحة كاملة" : "Swipe horizontally to explore the full panel"}
      </p>
    </section>
  );
}

export default NexiosCommandCenter;
