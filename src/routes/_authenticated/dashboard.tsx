import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Building2,
  Camera,
  ClipboardList,
  Cpu,
  FileBarChart2,
  Flame,
  Hexagon,
  KeyRound,
  Layers,
  LifeBuoy,
  Map,
  Radar,
  Radio,
  ShieldCheck,
  SquareStack,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: CockpitDashboard,
});

type Tile = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  ar: string;
  en: string;
  accent: "primary" | "secondary";
};

const LEFT_TILES: Tile[] = [
  { to: "/sec", icon: Layers, ar: "نظرة العمليات", en: "Operations Hub", accent: "primary" },
  { to: "/sec/incidents", icon: AlertTriangle, ar: "البلاغات والحوادث", en: "Incidents & Alerts", accent: "secondary" },
  { to: "/sec/patrols", icon: ShieldCheck, ar: "دوريات الأمن", en: "Security Patrols", accent: "secondary" },
  { to: "/sec/twin", icon: Hexagon, ar: "التوأم الرقمي", en: "Digital Twin 3D", accent: "secondary" },
  { to: "/sec/cctv", icon: Camera, ar: "المراقبة المرئية", en: "CCTV Grid", accent: "secondary" },
];

const RIGHT_TILES: Tile[] = [
  { to: "/sec/maintenance", icon: Wrench, ar: "أوامر العمل والصيانة", en: "Work Orders", accent: "secondary" },
  { to: "/sec/permits", icon: KeyRound, ar: "تصاريح العمل", en: "Access Permits", accent: "secondary" },
  { to: "/sec/visitors", icon: Users, ar: "إدارة الزوار", en: "Visitor Management", accent: "secondary" },
  { to: "/executive-reports", icon: FileBarChart2, ar: "التقارير التنفيذية", en: "Executive Reports", accent: "secondary" },
  { to: "/sec/kpi", icon: Activity, ar: "مؤشرات الأداء", en: "Live KPIs", accent: "secondary" },
];

const QUICK_LAUNCH: Tile[] = [
  { to: "/sec/emergency", icon: LifeBuoy, ar: "الطوارئ", en: "Emergency", accent: "primary" },
  { to: "/sec/risks", icon: Flame, ar: "المخاطر", en: "Risks", accent: "secondary" },
  { to: "/sec/assets", icon: Boxes, ar: "الأصول", en: "Assets", accent: "secondary" },
  { to: "/sec/facilities", icon: Building2, ar: "المنشآت", en: "Facilities", accent: "secondary" },
  { to: "/sec/contractors", icon: Truck, ar: "المقاولون", en: "Contractors", accent: "secondary" },
  { to: "/sec/shifts", icon: ClipboardList, ar: "الورديات", en: "Shifts", accent: "secondary" },
  { to: "/sec/ai", icon: Cpu, ar: "محرك الذكاء", en: "AI Engine", accent: "primary" },
  { to: "/executive-map", icon: Map, ar: "الخريطة التنفيذية", en: "Executive Map", accent: "secondary" },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function TileCard({ t, side }: { t: Tile; side: "left" | "right" }) {
  const Icon = t.icon;
  const accentText = t.accent === "primary" ? "text-primary" : "text-secondary";
  const accentBorder = t.accent === "primary" ? "border-primary" : "border-secondary/40 group-hover:border-secondary";
  const sideBorder = side === "left" ? "border-r-4" : "border-l-4";
  return (
    <Link
      to={t.to}
      className={`group block p-4 rounded-lg bg-background/40 ${sideBorder} ${accentBorder} border-t border-b border-l border-r border-white/5 backdrop-blur-xl hover:bg-primary/10 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.3)]`}
    >
      <div className={`flex items-center gap-4 ${side === "right" ? "text-right" : ""}`}>
        {side === "right" && (
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">{t.ar}</div>
            <div className="text-[10px] text-primary/50">{t.en}</div>
          </div>
        )}
        <div className={`w-10 h-10 rounded border ${t.accent === "primary" ? "border-primary/40 bg-primary/10" : "border-secondary/30 bg-secondary/5"} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${accentText}`} />
        </div>
        {side === "left" && (
          <div>
            <div className="text-sm font-semibold text-foreground">{t.ar}</div>
            <div className="text-[10px] text-primary/50">{t.en}</div>
          </div>
        )}
      </div>
    </Link>
  );
}

function CockpitDashboard() {
  const now = useClock();
  const time = now.toLocaleTimeString("en-GB", { hour12: false });

  return (
    <div
      className="relative min-h-[calc(100vh-3rem)] w-full bg-[#061A2E] text-slate-100 flex flex-col items-stretch p-6 md:p-8 overflow-hidden"
      dir="rtl"
    >
      {/* Ambient glow layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,212,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,212,255,0.05)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40" />
      </div>

      {/* Header */}
      <header className="relative z-20 w-full max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10 border-b border-primary/20 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-primary to-secondary drop-shadow-[0_0_15px_rgba(0,212,255,0.4)]">
            نظام الأمن الصناعي بالمنطقة الغربية
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary/60 font-mono">
              SYSTEM STATUS: OPTIMAL
            </span>
            <div className="h-px w-24 bg-gradient-to-l from-primary/50 to-transparent" />
          </div>
        </div>
        <div className="text-left">
          <div className="text-2xl font-mono text-primary tracking-widest">{time}</div>
          <div className="text-xs text-primary/40 uppercase tracking-widest">Digital Twin Core v2.4</div>
        </div>
      </header>

      {/* Main cockpit */}
      <main className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-3">
          {LEFT_TILES.map((t) => (
            <TileCard key={t.to} t={t} side="left" />
          ))}
        </div>

        {/* Center holographic core */}
        <div className="lg:col-span-6 relative flex items-center justify-center min-h-[520px]">
          {/* Rotating rings */}
          <div className="absolute w-[460px] h-[460px] max-w-[90vw] max-h-[90vw] border-2 border-dashed border-primary/20 rounded-full animate-[spin_40s_linear_infinite]" />
          <div className="absolute w-[380px] h-[380px] max-w-[78vw] max-h-[78vw] border border-secondary/30 rounded-full animate-[spin_25s_linear_infinite_reverse]" />
          <div className="absolute w-[300px] h-[300px] max-w-[64vw] max-h-[64vw] border-4 border-double border-primary/40 rounded-full shadow-[0_0_40px_rgba(0,212,255,0.15)]" />

          {/* Core */}
          <div className="relative w-64 h-64 max-w-[60vw] max-h-[60vw] rounded-full bg-gradient-to-br from-primary/20 to-transparent backdrop-blur-2xl border border-white/20 flex flex-col items-center justify-center shadow-[inset_0_0_50px_rgba(255,255,255,0.1)]">
            <Radar className="w-24 h-24 text-primary animate-pulse" strokeWidth={1.2} />
            <div className="mt-3 text-center">
              <span className="block text-xs uppercase tracking-[0.3em] text-primary">AI Core Active</span>
              <span className="text-[10px] text-primary/50 font-mono">Scanning infrastructure…</span>
            </div>
            {/* Scan sweep */}
            <span className="pointer-events-none absolute inset-0 rounded-full overflow-hidden">
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent animate-[spin_6s_linear_infinite] origin-center" />
            </span>
          </div>

          {/* Floating telemetry */}
          <div className="absolute top-6 right-2 md:right-6 p-2 border-l border-primary bg-background/60 text-[9px] font-mono backdrop-blur leading-relaxed">
            SECTOR_ALPHA: ACTIVE<br />
            NODES: 1,429<br />
            UPLINK: STABLE
          </div>
          <div className="absolute bottom-6 left-2 md:left-6 p-2 border-r border-secondary bg-background/60 text-[9px] font-mono backdrop-blur leading-relaxed">
            LAT: 21.4858 N<br />
            LNG: 39.1925 E<br />
            TZ: GMT+3
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-0 md:-right-2 p-2 border-r border-primary/60 bg-background/60 text-[9px] font-mono backdrop-blur leading-relaxed hidden md:block">
            INCIDENTS: 03 OPEN<br />
            PATROLS: 18 LIVE<br />
            PERMITS: 27 ACTIVE
          </div>
          <div className="absolute -bottom-2 right-1/2 translate-x-1/2 flex items-center gap-2 text-[10px] font-mono text-primary/70">
            <Radio className="w-3 h-3 animate-pulse" /> ENCRYPTED CHANNEL — JED-MKK-YBU
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-3 space-y-3">
          {RIGHT_TILES.map((t) => (
            <TileCard key={t.to} t={t} side="right" />
          ))}
        </div>
      </main>

      {/* Quick launcher grid */}
      <section className="relative z-10 w-full max-w-7xl mx-auto mt-10">
        <div className="flex items-center gap-3 mb-3">
          <SquareStack className="w-4 h-4 text-primary" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary/70 font-mono">Quick Launch</span>
          <div className="flex-1 h-px bg-gradient-to-l from-primary/30 to-transparent" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {QUICK_LAUNCH.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="group flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-white/5 bg-background/40 backdrop-blur-xl hover:border-primary/60 hover:bg-primary/10 transition-all duration-300"
              >
                <Icon className={`w-5 h-5 ${t.accent === "primary" ? "text-primary" : "text-secondary"} group-hover:scale-110 transition-transform`} />
                <span className="text-[11px] text-foreground/80 text-center">{t.ar}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Status bar */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto mt-10 grid grid-cols-4 gap-4">
        {[
          { label: "Threat Level", w: "w-2/3", color: "bg-primary" },
          { label: "Readiness", w: "w-1/2", color: "bg-secondary" },
          { label: "Coverage", w: "w-4/5", color: "bg-primary" },
          { label: "Alerts", w: "w-1/4", color: "bg-red-500" },
        ].map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-[9px] font-mono text-primary/60 uppercase tracking-widest mb-1">
              <span>{s.label}</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full ${s.w} ${s.color} shadow-[0_0_10px_currentColor]`} />
            </div>
          </div>
        ))}
      </footer>
    </div>
  );
}
