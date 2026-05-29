import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Brain,
  Command,
  FileText,
  Mic,
  Presentation,
  Sparkles,
  X,
  Zap,
  TrendingUp,
  ShieldAlert,
  Lightbulb,
  Target,
  ArrowUpRight,
  Boxes,
  Network,
  Plug,
  GitMerge,
  Crown,
  LayoutDashboard,
  Bot,
  Workflow,
  ChevronRight,
  Briefcase,
  Gavel,
  Building2,
  Rocket,
  ShieldCheck,
  Users,
  ListChecks,
  FolderUp,
  Store,
  BookOpen,
  BookMarked,
  Shield,
  Settings,
  BarChart3,
  Activity,
  Compass,
  Keyboard,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

/* ─────────────────────────── Public Hook ─────────────────────────── */

type OverlayState = {
  paletteOpen: boolean;
  briefingOpen: boolean;
  presenting: boolean;
  avatarOpen: boolean;
  shortcutsOpen: boolean;
  setPalette: (v: boolean) => void;
  setBriefing: (v: boolean) => void;
  setPresenting: (v: boolean) => void;
  setAvatar: (v: boolean) => void;
  setShortcuts: (v: boolean) => void;
};

function useOverlayState(): OverlayState {
  const [paletteOpen, setPalette] = useState(false);
  const [briefingOpen, setBriefing] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [avatarOpen, setAvatar] = useState(false);
  const [shortcutsOpen, setShortcuts] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if (e.key === "Escape") {
        setPalette(false);
        setBriefing(false);
        setAvatar(false);
        setShortcuts(false);
        if (presenting) {
          setPresenting(false);
          document.body.classList.remove("nexus-presenting");
        }
      }
      if (meta && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setBriefing((v) => !v);
      }
      if (meta && e.key === ".") {
        e.preventDefault();
        setPresenting((v) => {
          const next = !v;
          document.body.classList.toggle("nexus-presenting", next);
          return next;
        });
      }
      if (meta && e.key === "/") {
        e.preventDefault();
        setShortcuts((v) => !v);
      }
      if (meta && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setAvatar((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting]);

  return { paletteOpen, briefingOpen, presenting, avatarOpen, shortcutsOpen, setPalette, setBriefing, setPresenting, setAvatar, setShortcuts };
}

/* ─────────────────────────── Root ─────────────────────────── */

export function ExecutiveOverlay() {
  const s = useOverlayState();
  return (
    <>
      <FloatingDock state={s} />
      <ExecutiveAvatar state={s} />
      <CommandPalette
        open={s.paletteOpen}
        onClose={() => s.setPalette(false)}
        onOpenBriefing={() => s.setBriefing(true)}
        onOpenAvatar={() => s.setAvatar(true)}
        onStartPresenting={() => {
          s.setPresenting(true);
          document.body.classList.add("nexus-presenting");
        }}
      />
      <BriefingPanel open={s.briefingOpen} onClose={() => s.setBriefing(false)} />
      <AvatarConsole open={s.avatarOpen} onClose={() => s.setAvatar(false)} />
      <ShortcutsHelp open={s.shortcutsOpen} onClose={() => s.setShortcuts(false)} />
      {s.presenting && <PresentationOverlay onExit={() => {
        s.setPresenting(false);
        document.body.classList.remove("nexus-presenting");
      }} />}
    </>
  );
}

/* ─────────────────────────── Floating Dock ─────────────────────────── */

function FloatingDock({ state }: { state: OverlayState }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const items = [
    { icon: Command, label: ar ? "أوامر" : "Command", kbd: "⌘K", onClick: () => state.setPalette(true) },
    { icon: FileText, label: ar ? "موجز" : "Briefing", kbd: "⌘J", onClick: () => state.setBriefing(true) },
    { icon: Sparkles, label: "ARIA", kbd: "⌘I", onClick: () => state.setAvatar(true) },
    { icon: Presentation, label: ar ? "عرض" : "Present", kbd: "⌘.", onClick: () => {
      const v = !state.presenting;
      state.setPresenting(v);
      document.body.classList.toggle("nexus-presenting", v);
    }},
    { icon: Keyboard, label: ar ? "اختصارات" : "Shortcuts", kbd: "⌘/", onClick: () => state.setShortcuts(true) },
  ];
  return (
    <div className="nexus-chrome pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-cyan-300/25 bg-[#040816]/85 p-1.5 shadow-[0_20px_60px_-10px_rgba(34,211,238,0.45)] backdrop-blur-2xl">
        <div className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-r from-cyan-400/30 via-blue-500/20 to-cyan-400/30 opacity-60 blur" />
        {items.map((it) => (
          <button
            key={it.label}
            onClick={it.onClick}
            className="group flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:bg-cyan-400/10 hover:text-cyan-200"
          >
            <it.icon className="h-3.5 w-3.5 text-cyan-300/80 group-hover:text-cyan-200" />
            <span className="nexus-dock-label hidden sm:inline">{it.label}</span>
            <kbd className="hidden rounded border border-slate-700/60 bg-slate-900/60 px-1.5 py-0.5 text-[9px] text-slate-400 sm:inline">{it.kbd}</kbd>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Executive Avatar ─────────────────────────── */

function ExecutiveAvatar({ state }: { state: OverlayState }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <button
      onClick={() => state.setAvatar(true)}
      className={cn(
        "nexus-chrome group fixed bottom-24 z-40 flex items-center gap-3 rounded-full border border-cyan-300/30 bg-[#06101f]/85 px-3 py-2 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-cyan-300/60",
        ar ? "left-5" : "right-5",
      )}
      style={{ boxShadow: "0 20px 60px -15px rgba(34,211,238,0.55)" }}
    >
      <div className="relative h-11 w-11">
        <span className="absolute inset-[-6px] rounded-full bg-cyan-400/30 blur-xl animate-pulse" />
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-700" />
        <span className="absolute inset-[3px] rounded-full bg-[#040816]/70 backdrop-blur" />
        <span
          className="absolute inset-[3px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(186,230,253,0.85), rgba(56,189,248,0.3) 45%, transparent 70%)",
          }}
        />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/80" />
          <span className="relative inline-flex h-3 w-3 rounded-full border border-[#040816] bg-emerald-400" />
        </span>
      </div>
      <div className="nexus-avatar-meta hidden text-start leading-tight sm:block">
        <div className="text-[10px] font-bold tracking-[0.25em] text-cyan-300/90">ARIA</div>
        <div className="text-[10px] text-slate-400">{ar ? "كبيرة المستشارين" : "Chief AI Officer"}</div>
      </div>
    </button>
  );
}

function AvatarConsole({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [msg, setMsg] = useState("");
  if (!open) return null;
  const suggestions = ar
    ? ["لخص أداء اليوم", "ما أكبر 3 مخاطر؟", "جهز اجتماع مجلس الإدارة", "حلل أداء الفريق المالي"]
    : ["Summarize today's performance", "Top 3 strategic risks?", "Prep the board meeting", "Analyze finance team performance"];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-[#020514]/70 backdrop-blur-md" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 mb-20 w-full max-w-md overflow-hidden rounded-3xl border border-cyan-300/25 bg-[#040816]/95 shadow-[0_40px_120px_-20px_rgba(34,211,238,0.6)]"
        style={{ animation: "scale-in 0.25s ease-out" }}
      >
        <div className="relative h-28 overflow-hidden bg-gradient-to-br from-cyan-500/30 via-blue-600/30 to-indigo-700/30">
          <div className="absolute inset-0 opacity-40" style={{
            backgroundImage: "linear-gradient(rgba(186,230,253,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(186,230,253,0.5) 1px,transparent 1px)",
            backgroundSize: "20px 20px",
            maskImage: "radial-gradient(ellipse at center,black,transparent 80%)",
          }}/>
          <div className="absolute left-5 bottom-3 flex items-center gap-3">
            <div className="relative h-14 w-14">
              <span className="absolute inset-[-6px] rounded-full bg-cyan-400/40 blur-xl animate-pulse" />
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-700" />
              <span className="absolute inset-[3px] rounded-full" style={{
                background: "radial-gradient(circle at 30% 30%,rgba(186,230,253,0.9),rgba(56,189,248,0.3) 50%,transparent 75%)",
              }}/>
            </div>
            <div>
              <div className="text-sm font-bold text-white">ARIA</div>
              <div className="text-[10px] tracking-[0.25em] text-cyan-200/90">{ar ? "كبيرة المستشارين التنفيذيين" : "EXECUTIVE AI ADVISOR"}</div>
            </div>
          </div>
          <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1 text-slate-300 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <p className="text-sm text-slate-300">
            {ar ? "مساء الخير. تم تحليل 247 إشارة اليوم. الأداء العام +12.4% فوق الهدف. هناك فرصتان استراتيجيتان جديدتان تتطلبان قرارك." : "Good evening. I've analyzed 247 signals today. Overall performance +12.4% above target. Two new strategic opportunities require your decision."}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-[11px] text-cyan-200 hover:bg-cyan-400/15">
                {s}
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder={ar ? "تحدث مع ARIA..." : "Talk to ARIA..."}
              className="w-full rounded-2xl border border-cyan-400/20 bg-[#06101f]/80 py-3 ps-4 pe-20 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-300/50 focus:outline-none"
            />
            <div className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <button className="rounded-lg p-2 text-slate-400 hover:bg-cyan-400/10 hover:text-cyan-300"><Mic className="h-4 w-4" /></button>
              <button className="rounded-lg bg-cyan-400/20 p-2 text-cyan-200 hover:bg-cyan-400/30"><Zap className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Command Palette ─────────────────────────── */

type CmdKind = "nav" | "action" | "kpi" | "agent" | "integration" | "workflow" | "report";
type Cmd = {
  id: string;
  label_en: string;
  label_ar: string;
  group: string;
  group_ar: string;
  kind: CmdKind;
  keywords?: string;
  to?: string;
  run?: () => void;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_COMMANDS: Cmd[] = [
  // Workspace
  { id: "n_dash", label_en: "Command Center", label_ar: "مركز القيادة", group: "Navigate", group_ar: "تنقل", kind: "nav", to: "/dashboard", icon: LayoutDashboard, keywords: "home overview" },
  { id: "n_tasks", label_en: "Tasks", label_ar: "المهام", group: "Workspace", group_ar: "مساحة العمل", kind: "nav", to: "/tasks", icon: ListChecks },
  { id: "n_files", label_en: "Files", label_ar: "الملفات", group: "Workspace", group_ar: "مساحة العمل", kind: "nav", to: "/files", icon: FolderUp },
  // Executive
  { id: "n_brief", label_en: "Executive Briefing", label_ar: "الموجز التنفيذي", group: "Executive", group_ar: "التنفيذي", kind: "nav", to: "/briefing", icon: FileText },
  { id: "n_chief", label_en: "AI Chief of Staff", label_ar: "رئيس ديوان الذكاء", group: "Executive", group_ar: "التنفيذي", kind: "nav", to: "/chief-of-staff", icon: Crown },
  { id: "n_intel", label_en: "Decision Intelligence", label_ar: "ذكاء القرار", group: "Executive", group_ar: "التنفيذي", kind: "nav", to: "/intelligence", icon: Brain },
  { id: "n_board", label_en: "Executive Boardroom", label_ar: "قاعة مجلس الإدارة", group: "Executive", group_ar: "التنفيذي", kind: "nav", to: "/boardroom", icon: Presentation },
  // Enterprise
  { id: "n_cockpit", label_en: "Cockpit", label_ar: "قمرة القيادة", group: "Enterprise", group_ar: "المؤسسة", kind: "nav", to: "/cockpit", icon: Crown },
  { id: "n_portfolio", label_en: "Portfolio", label_ar: "المحفظة", group: "Enterprise", group_ar: "المؤسسة", kind: "nav", to: "/portfolio", icon: Briefcase },
  { id: "n_decisions", label_en: "Decisions", label_ar: "القرارات", group: "Enterprise", group_ar: "المؤسسة", kind: "nav", to: "/decisions", icon: Gavel },
  { id: "n_depts", label_en: "Departments", label_ar: "الأقسام", group: "Enterprise", group_ar: "المؤسسة", kind: "nav", to: "/departments", icon: Building2 },
  { id: "n_xform", label_en: "Transformation", label_ar: "التحول", group: "Enterprise", group_ar: "المؤسسة", kind: "nav", to: "/transformation", icon: Rocket },
  { id: "n_risk", label_en: "Risk", label_ar: "المخاطر", group: "Enterprise", group_ar: "المؤسسة", kind: "nav", to: "/risk", icon: ShieldAlert },
  { id: "n_gov", label_en: "Governance", label_ar: "الحوكمة", group: "Enterprise", group_ar: "المؤسسة", kind: "nav", to: "/governance", icon: ShieldCheck },
  { id: "n_out", label_en: "Outcomes", label_ar: "النتائج", group: "Enterprise", group_ar: "المؤسسة", kind: "nav", to: "/outcomes", icon: TrendingUp },
  { id: "n_analyst", label_en: "AI Analyst", label_ar: "محلل الذكاء", group: "Enterprise", group_ar: "المؤسسة", kind: "nav", to: "/analyst", icon: Brain },
  { id: "n_twin", label_en: "Digital Twin", label_ar: "التوأم الرقمي", group: "Enterprise", group_ar: "المؤسسة", kind: "nav", to: "/digital-twin", icon: Boxes },
  { id: "n_int", label_en: "Integrations Hub", label_ar: "مركز التكاملات", group: "Enterprise", group_ar: "المؤسسة", kind: "nav", to: "/integrations", icon: Plug },
  { id: "n_aiops", label_en: "AI Swarm Center", label_ar: "مركز سرب الذكاء", group: "Enterprise", group_ar: "المؤسسة", kind: "nav", to: "/ai-ops", icon: Network },
  { id: "n_orch", label_en: "Orchestration", label_ar: "التنسيق", group: "Enterprise", group_ar: "المؤسسة", kind: "nav", to: "/orchestration", icon: GitMerge },
  // Intelligence
  { id: "n_assist", label_en: "Assistant", label_ar: "المساعد", group: "Intelligence", group_ar: "الذكاء", kind: "nav", to: "/assistant", icon: Sparkles },
  { id: "n_agents", label_en: "AI Agents", label_ar: "وكلاء الذكاء", group: "Intelligence", group_ar: "الذكاء", kind: "nav", to: "/agents", icon: Bot },
  { id: "n_voice", label_en: "Voice", label_ar: "الصوت", group: "Intelligence", group_ar: "الذكاء", kind: "nav", to: "/voice", icon: Mic },
  { id: "n_flows", label_en: "Workflows", label_ar: "مسارات العمل", group: "Intelligence", group_ar: "الذكاء", kind: "nav", to: "/workflows", icon: Workflow },
  { id: "n_prompts", label_en: "Prompts", label_ar: "الموجهات", group: "Intelligence", group_ar: "الذكاء", kind: "nav", to: "/prompts", icon: BookMarked },
  { id: "n_market", label_en: "Marketplace", label_ar: "السوق", group: "Intelligence", group_ar: "الذكاء", kind: "nav", to: "/marketplace", icon: Store },
  { id: "n_know", label_en: "Knowledge", label_ar: "المعرفة", group: "Intelligence", group_ar: "الذكاء", kind: "nav", to: "/knowledge", icon: BookOpen },
  { id: "n_ana", label_en: "Analytics", label_ar: "التحليلات", group: "Intelligence", group_ar: "الذكاء", kind: "nav", to: "/analytics", icon: BarChart3 },
  // Collab + Admin
  { id: "n_team", label_en: "Team", label_ar: "الفريق", group: "Collab", group_ar: "التعاون", kind: "nav", to: "/team", icon: Users },
  { id: "n_admin", label_en: "Admin", label_ar: "الإدارة", group: "Admin", group_ar: "الإدارة", kind: "nav", to: "/admin", icon: Shield },
  { id: "n_set", label_en: "Settings", label_ar: "الإعدادات", group: "Admin", group_ar: "الإدارة", kind: "nav", to: "/settings", icon: Settings },
];

const KPI_COMMANDS: Cmd[] = [
  { id: "k_rev", label_en: "KPI · Revenue Growth", label_ar: "مؤشر · نمو الإيرادات", group: "KPIs", group_ar: "المؤشرات", kind: "kpi", to: "/analytics", icon: TrendingUp, keywords: "revenue arr mrr" },
  { id: "k_marg", label_en: "KPI · Operating Margin", label_ar: "مؤشر · هامش التشغيل", group: "KPIs", group_ar: "المؤشرات", kind: "kpi", to: "/analytics", icon: Activity },
  { id: "k_risk", label_en: "KPI · Enterprise Risk Score", label_ar: "مؤشر · درجة مخاطر المؤسسة", group: "KPIs", group_ar: "المؤشرات", kind: "kpi", to: "/risk", icon: ShieldAlert },
  { id: "k_health", label_en: "KPI · Portfolio Health", label_ar: "مؤشر · صحة المحفظة", group: "KPIs", group_ar: "المؤشرات", kind: "kpi", to: "/portfolio", icon: Activity },
  { id: "k_xform", label_en: "KPI · Transformation Velocity", label_ar: "مؤشر · سرعة التحول", group: "KPIs", group_ar: "المؤشرات", kind: "kpi", to: "/transformation", icon: Rocket },
];

const AGENT_COMMANDS: Cmd[] = [
  { id: "a_aria", label_en: "Agent · ARIA — Chief AI Officer", label_ar: "وكيل · ARIA — كبيرة المستشارين", group: "Agents", group_ar: "الوكلاء", kind: "agent", to: "/agents", icon: Sparkles },
  { id: "a_fin", label_en: "Agent · Finance Analyst", label_ar: "وكيل · محلل مالي", group: "Agents", group_ar: "الوكلاء", kind: "agent", to: "/agents", icon: BarChart3 },
  { id: "a_risk", label_en: "Agent · Risk Sentinel", label_ar: "وكيل · حارس المخاطر", group: "Agents", group_ar: "الوكلاء", kind: "agent", to: "/agents", icon: ShieldAlert },
  { id: "a_ops", label_en: "Agent · Ops Orchestrator", label_ar: "وكيل · منسق العمليات", group: "Agents", group_ar: "الوكلاء", kind: "agent", to: "/ai-ops", icon: Network },
];

const INTEGRATION_COMMANDS: Cmd[] = [
  { id: "i_slack", label_en: "Integration · Slack", label_ar: "تكامل · Slack", group: "Integrations", group_ar: "التكاملات", kind: "integration", to: "/integrations", icon: Plug },
  { id: "i_sap", label_en: "Integration · SAP ERP", label_ar: "تكامل · SAP", group: "Integrations", group_ar: "التكاملات", kind: "integration", to: "/integrations", icon: Plug },
  { id: "i_sf", label_en: "Integration · Salesforce", label_ar: "تكامل · Salesforce", group: "Integrations", group_ar: "التكاملات", kind: "integration", to: "/integrations", icon: Plug },
  { id: "i_msft", label_en: "Integration · Microsoft 365", label_ar: "تكامل · Microsoft 365", group: "Integrations", group_ar: "التكاملات", kind: "integration", to: "/integrations", icon: Plug },
];

const WORKFLOW_COMMANDS: Cmd[] = [
  { id: "w_close", label_en: "Workflow · Month-end Close", label_ar: "مسار · إقفال الشهر", group: "Workflows", group_ar: "المسارات", kind: "workflow", to: "/workflows", icon: Workflow },
  { id: "w_board", label_en: "Workflow · Board Pack Prep", label_ar: "مسار · تجهيز ملف المجلس", group: "Workflows", group_ar: "المسارات", kind: "workflow", to: "/workflows", icon: Workflow },
  { id: "w_hire", label_en: "Workflow · Exec Hiring", label_ar: "مسار · توظيف تنفيذي", group: "Workflows", group_ar: "المسارات", kind: "workflow", to: "/workflows", icon: Workflow },
];

const REPORT_COMMANDS: Cmd[] = [
  { id: "r_daily", label_en: "Report · Daily Pulse", label_ar: "تقرير · نبض اليوم", group: "Reports", group_ar: "التقارير", kind: "report", to: "/briefing", icon: FileText },
  { id: "r_board", label_en: "Report · Board Pack", label_ar: "تقرير · ملف المجلس", group: "Reports", group_ar: "التقارير", kind: "report", to: "/boardroom", icon: FileText },
  { id: "r_risk", label_en: "Report · Risk Heatmap", label_ar: "تقرير · خريطة المخاطر", group: "Reports", group_ar: "التقارير", kind: "report", to: "/risk", icon: FileText },
  { id: "r_port", label_en: "Report · Portfolio Review", label_ar: "تقرير · مراجعة المحفظة", group: "Reports", group_ar: "التقارير", kind: "report", to: "/portfolio", icon: FileText },
];

function buildActionCommands(ctx: { onOpenBriefing: () => void; onStartPresenting: () => void; onOpenAvatar: () => void; navigate: (opts: { to: string }) => void }): Cmd[] {
  return [
    { id: "act_brief", label_en: "Open Executive Briefing", label_ar: "افتح الموجز التنفيذي", group: "Quick Actions", group_ar: "إجراءات سريعة", kind: "action", icon: FileText, run: () => ctx.onOpenBriefing() },
    { id: "act_pres", label_en: "Enter Presentation Mode", label_ar: "ادخل وضع العرض", group: "Quick Actions", group_ar: "إجراءات سريعة", kind: "action", icon: Presentation, run: () => ctx.onStartPresenting() },
    { id: "act_aria", label_en: "Talk to ARIA", label_ar: "تحدث مع ARIA", group: "Quick Actions", group_ar: "إجراءات سريعة", kind: "action", icon: Sparkles, run: () => ctx.onOpenAvatar() },
    { id: "act_ask1", label_en: "Ask ARIA: top 3 risks today", label_ar: "اسأل ARIA: أكبر 3 مخاطر اليوم", group: "AI Actions", group_ar: "إجراءات الذكاء", kind: "action", icon: ShieldAlert, run: () => ctx.onOpenAvatar() },
    { id: "act_ask2", label_en: "Generate Board Pack PDF", label_ar: "أنشئ ملف مجلس الإدارة PDF", group: "AI Actions", group_ar: "إجراءات الذكاء", kind: "action", icon: FileText, run: () => ctx.navigate({ to: "/boardroom" }) },
    { id: "act_ask3", label_en: "Run scenario: −10% revenue Q3", label_ar: "شغّل سيناريو: −10% إيرادات الربع 3", group: "AI Actions", group_ar: "إجراءات الذكاء", kind: "action", icon: TrendingUp, run: () => ctx.navigate({ to: "/intelligence" }) },
    { id: "act_ask4", label_en: "Summarize today's performance", label_ar: "لخص أداء اليوم", group: "AI Actions", group_ar: "إجراءات الذكاء", kind: "action", icon: Activity, run: () => ctx.onOpenBriefing() },
  ];
}

const ALL_STATIC: Cmd[] = [
  ...NAV_COMMANDS,
  ...KPI_COMMANDS,
  ...AGENT_COMMANDS,
  ...INTEGRATION_COMMANDS,
  ...WORKFLOW_COMMANDS,
  ...REPORT_COMMANDS,
];

const RECENTS_KEY = "nexus.cmd.recents";
function readRecents(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]"); } catch { return []; }
}
function pushRecent(id: string) {
  try {
    const cur = readRecents().filter((x) => x !== id);
    cur.unshift(id);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(cur.slice(0, 6)));
  } catch { /* ignore */ }
}

// Context-aware suggestions based on current route
function suggestionsForPath(pathname: string): string[] {
  if (pathname.startsWith("/risk")) return ["k_risk", "r_risk", "act_ask1", "n_gov"];
  if (pathname.startsWith("/portfolio")) return ["k_health", "r_port", "n_decisions"];
  if (pathname.startsWith("/boardroom")) return ["r_board", "act_pres", "n_brief"];
  if (pathname.startsWith("/transformation")) return ["k_xform", "n_orch", "w_hire"];
  if (pathname.startsWith("/integrations")) return ["i_slack", "i_sap", "n_aiops"];
  if (pathname.startsWith("/agents") || pathname.startsWith("/ai-ops")) return ["a_aria", "a_ops", "n_orch"];
  if (pathname.startsWith("/analytics")) return ["k_rev", "k_marg", "r_daily"];
  return ["act_brief", "act_pres", "n_cockpit", "n_intel", "act_ask1"];
}

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onOpenBriefing: () => void;
  onOpenAvatar: () => void;
  onStartPresenting: () => void;
};

function CommandPalette({ open, onClose, onOpenBriefing, onOpenAvatar, onStartPresenting }: CommandPaletteProps) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const actions = useMemo(() => buildActionCommands({
    onOpenBriefing,
    onStartPresenting,
    onOpenAvatar,
    navigate: (o) => navigate(o),
  }), [navigate, onOpenBriefing, onStartPresenting, onOpenAvatar]);

  const all = useMemo(() => [...ALL_STATIC, ...actions], [actions]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setCursor(0);
    } else {
      setQ("");
      setListening(false);
    }
  }, [open]);

  const recents = useMemo(() => {
    const ids = readRecents();
    return ids.map((id) => all.find((c) => c.id === id)).filter(Boolean) as Cmd[];
  }, [all, open]);

  const suggested = useMemo(() => {
    const ids = suggestionsForPath(loc.pathname);
    return ids.map((id) => all.find((c) => c.id === id)).filter(Boolean) as Cmd[];
  }, [all, loc.pathname]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) {
      // Empty query → show suggested + recents + first slice of all
      const seen = new Set<string>();
      const out: Cmd[] = [];
      const addGroup = (cmds: Cmd[], gEn: string, gAr: string) => {
        cmds.forEach((c) => {
          if (seen.has(c.id)) return;
          seen.add(c.id);
          out.push({ ...c, group: gEn, group_ar: gAr });
        });
      };
      if (suggested.length) addGroup(suggested, "Suggested", "مقترحات");
      if (recents.length) addGroup(recents, "Recent", "الأخيرة");
      addGroup(all, "", "");
      return out;
    }
    return all.filter((c) => {
      const hay = `${c.label_en} ${c.label_ar} ${c.keywords ?? ""} ${c.group} ${c.group_ar}`.toLowerCase();
      return hay.includes(t);
    });
  }, [q, all, suggested, recents]);

  const groups = useMemo(() => {
    const map = new Map<string, Cmd[]>();
    filtered.forEach((c) => {
      const k = ar ? c.group_ar : c.group;
      const arr = map.get(k) ?? [];
      arr.push(c); map.set(k, arr);
    });
    return Array.from(map.entries());
  }, [filtered, ar]);

  const flat = filtered;

  const execute = useCallback((c: Cmd) => {
    pushRecent(c.id);
    if (c.run) c.run();
    if (c.to) navigate({ to: c.to });
    onClose();
  }, [navigate, onClose]);

  useEffect(() => { setCursor(0); }, [q]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = flat[cursor];
      if (c) execute(c);
    }
  };

  // Voice input (Web Speech API) — voice-ready architecture
  const startVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = ar ? "ar-SA" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev: any) => {
      const text = ev.results?.[0]?.[0]?.transcript ?? "";
      setQ(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    try { rec.start(); setListening(true); } catch { /* ignore */ }
  }, [ar]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[6vh] sm:p-4 sm:pt-[12vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-[#020514]/80 backdrop-blur-md" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-cyan-300/30 bg-[#040816]/95 shadow-[0_40px_120px_-20px_rgba(34,211,238,0.6)] sm:rounded-3xl"
        style={{ animation: "scale-in 0.2s ease-out" }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 sm:gap-3 sm:px-5 sm:py-4">
          <Sparkles className="h-5 w-5 shrink-0 text-cyan-300" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={ar ? "اسأل، تنقل، أو نفّذ أي شيء..." : "Ask, navigate, or execute anything..."}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 sm:text-base"
          />
          <button
            onClick={startVoice}
            aria-label={ar ? "إدخال صوتي" : "Voice input"}
            className={cn(
              "rounded-lg p-1.5 transition",
              listening ? "bg-rose-500/20 text-rose-300 animate-pulse" : "text-slate-400 hover:bg-cyan-400/10 hover:text-cyan-300",
            )}
          >
            <Mic className="h-4 w-4" />
          </button>
          <kbd className="hidden rounded border border-slate-700/60 bg-slate-900/60 px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {groups.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">{ar ? "لا توجد نتائج" : "No matches"}</div>
          )}
          {groups.map(([g, items]) => (
            <div key={g || "_"} className="mb-2">
              {g && (
                <div className="px-3 py-1.5 text-[10px] font-bold tracking-[0.25em] text-cyan-300/70">{g}</div>
              )}
              {items.map((c) => {
                const idx = flat.indexOf(c);
                const isActive = idx === cursor;
                return (
                  <button
                    key={c.id}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => execute(c)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      isActive ? "bg-cyan-400/15" : "hover:bg-cyan-400/10",
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-cyan-300",
                      isActive ? "bg-cyan-400/25" : "bg-cyan-400/10 group-hover:bg-cyan-400/20",
                    )}>
                      <c.icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1 truncate text-sm text-slate-200">{ar ? c.label_ar : c.label_en}</span>
                    {c.to && <span className="hidden text-[10px] text-slate-500 sm:inline">{c.to}</span>}
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-cyan-300" />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 bg-[#02050f]/60 px-3 py-2 text-[10px] text-slate-500 sm:px-4">
          <span className="flex items-center gap-1.5"><Compass className="h-3 w-3" />{ar ? "ARIA · ذكاء تنفيذي" : "ARIA · Executive Intelligence"}</span>
          <span className="flex items-center gap-2">
            <kbd className="rounded bg-slate-800/80 px-1.5">↑↓</kbd>
            <kbd className="rounded bg-slate-800/80 px-1.5">↵</kbd>
            <span className="hidden sm:inline">{ar ? "تنفيذ" : "Execute"}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Shortcuts Help ─────────────────────────── */

function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  if (!open) return null;
  const rows: { k: string; en: string; ar: string }[] = [
    { k: "⌘K / Ctrl K", en: "Open Command Palette", ar: "افتح لوحة الأوامر" },
    { k: "⌘J / Ctrl J", en: "Toggle Executive Briefing", ar: "تبديل الموجز التنفيذي" },
    { k: "⌘I / Ctrl I", en: "Talk to ARIA", ar: "تحدث مع ARIA" },
    { k: "⌘. / Ctrl .", en: "Toggle Presentation Mode", ar: "تبديل وضع العرض" },
    { k: "⌘/ / Ctrl /", en: "Show Keyboard Shortcuts", ar: "عرض الاختصارات" },
    { k: "↑ ↓ ↵", en: "Navigate & execute in palette", ar: "تنقل وتنفيذ داخل اللوحة" },
    { k: "ESC", en: "Close any overlay", ar: "أغلق أي طبقة" },
    { k: "← → (Present)", en: "Previous / next slide", ar: "الشريحة السابقة/التالية" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[#020514]/80 backdrop-blur-md" />
      <div onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-300/30 bg-[#040816]/95 shadow-[0_40px_120px_-20px_rgba(34,211,238,0.6)]">
        <header className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-cyan-300" />
            <h3 className="text-sm font-bold tracking-[0.2em] text-cyan-200">{ar ? "اختصارات لوحة المفاتيح" : "KEYBOARD SHORTCUTS"}</h3>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </header>
        <ul className="divide-y divide-white/5">
          {rows.map((r) => (
            <li key={r.k} className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-slate-200">
              <span>{ar ? r.ar : r.en}</span>
              <kbd className="rounded border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-[11px] font-mono text-cyan-200">{r.k}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─────────────────────────── Briefing Panel ─────────────────────────── */

function BriefingPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  if (!open) return null;
  const risks = ar
    ? [{ t: "تأخر مشروع ERP بـ 18 يوم", s: "عالي" }, { t: "تركز إيرادات في عميل واحد 34%", s: "متوسط" }, { t: "ضغط على هامش الخدمات", s: "متوسط" }]
    : [{ t: "ERP rollout slipping by 18 days", s: "High" }, { t: "Revenue concentration 34% in one client", s: "Med" }, { t: "Services margin compression", s: "Med" }];
  const opps = ar
    ? ["توسع المنطقة الشرقية +18% طلب", "أتمتة 3 عمليات مالية = توفير 1.2M", "شراكة محتملة مع 2 لاعبين إقليميين"]
    : ["Eastern region demand +18%", "Automating 3 finance ops saves $1.2M", "Potential alliance with 2 regional players"];
  const recs = ar
    ? ["تسريع توظيف رئيس تحول رقمي", "مراجعة أسعار الخدمات للربع الرابع", "إطلاق برنامج تنويع قاعدة العملاء"]
    : ["Accelerate hiring of CDO", "Reprice services Q4", "Launch customer diversification program"];

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-[#020514]/70 backdrop-blur-md" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute top-0 z-10 flex h-full w-full max-w-xl flex-col overflow-hidden border-cyan-300/20 bg-[#040816]/95 shadow-[0_0_80px_-10px_rgba(34,211,238,0.5)]",
          ar ? "left-0 border-r" : "right-0 border-l",
        )}
        style={{ animation: ar ? "slide-in-left 0.3s ease-out" : "slide-in-right 0.3s ease-out" }}
      >
        <header className="flex items-start justify-between border-b border-white/5 p-5">
          <div>
            <div className="text-[10px] font-bold tracking-[0.3em] text-cyan-300/80">{ar ? "موجز ARIA التنفيذي" : "ARIA EXECUTIVE BRIEFING"}</div>
            <h2 className="mt-1 bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-2xl font-bold text-transparent">
              {ar ? "تقرير اليوم" : "Today's Pulse"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">{ar ? "تم توليده بواسطة الذكاء الاصطناعي · 247 إشارة" : "AI-generated · 247 signals analyzed"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Summary */}
          <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] text-cyan-300/80">
              <Brain className="h-3.5 w-3.5" /> {ar ? "ملخص استراتيجي" : "STRATEGIC SUMMARY"}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              {ar
                ? "الأداء العام أعلى من الخطة بـ 12.4%. الإيرادات في مسار قوي، لكن هناك ضغط متزايد على هوامش الخدمات. مخاطر تنفيذ مشروع ERP ترتفع. فرص توسع جديدة في المنطقة الشرقية تحتاج قرار خلال 14 يوماً."
                : "Overall performance is 12.4% above plan. Revenue trajectory remains strong, but services margin is under increasing pressure. ERP execution risk is rising. Two expansion opportunities in the Eastern region need a decision within 14 days."}
            </p>
          </section>

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: ar ? "صحة" : "Health", v: "94", t: "+2.1" },
              { k: ar ? "مخاطر" : "Risk", v: "21", t: "+4" },
              { k: ar ? "فرص" : "Opps", v: "12", t: "+3" },
            ].map((m) => (
              <div key={m.k} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">{m.k}</div>
                <div className="mt-1 text-xl font-bold text-cyan-300">{m.v}</div>
                <div className="text-[10px] text-emerald-300">{m.t}</div>
              </div>
            ))}
          </div>

          <BriefingBlock icon={ShieldAlert} tone="rose" title={ar ? "أعلى المخاطر" : "TOP RISKS"}>
            <ul className="space-y-2">
              {risks.map((r) => (
                <li key={r.t} className="flex items-start justify-between gap-3 rounded-lg border border-rose-400/15 bg-rose-400/5 p-3">
                  <span className="text-sm text-slate-200">{r.t}</span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-300">{r.s}</span>
                </li>
              ))}
            </ul>
          </BriefingBlock>

          <BriefingBlock icon={Lightbulb} tone="emerald" title={ar ? "الفرص الذكية" : "OPPORTUNITIES"}>
            <ul className="space-y-2">
              {opps.map((o) => (
                <li key={o} className="flex items-center gap-3 rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-3 text-sm text-slate-200">
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-300" /> {o}
                </li>
              ))}
            </ul>
          </BriefingBlock>

          <BriefingBlock icon={Target} tone="cyan" title={ar ? "توصيات تنفيذية" : "RECOMMENDED ACTIONS"}>
            <ol className="space-y-2">
              {recs.map((r, i) => (
                <li key={r} className="flex items-start gap-3 rounded-lg border border-cyan-400/15 bg-cyan-400/5 p-3 text-sm text-slate-200">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/10 text-[11px] font-bold text-cyan-200">{i + 1}</span>
                  {r}
                </li>
              ))}
            </ol>
          </BriefingBlock>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-white/5 bg-[#02050f]/60 p-3">
          <Link to="/briefing" onClick={onClose} className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200">
            {ar ? "افتح الموجز الكامل →" : "Open full briefing →"}
          </Link>
          <button className="rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 px-4 py-2 text-xs font-bold text-cyan-100 hover:from-cyan-500/30 hover:to-blue-600/30">
            {ar ? "تصدير PDF تنفيذي" : "Export Executive PDF"}
          </button>
        </footer>
      </aside>
    </div>
  );
}

function BriefingBlock({ icon: Icon, tone, title, children }: { icon: React.ComponentType<{ className?: string }>; tone: "cyan" | "rose" | "emerald"; title: string; children: React.ReactNode }) {
  const colors = {
    cyan: "text-cyan-300",
    rose: "text-rose-300",
    emerald: "text-emerald-300",
  };
  return (
    <section>
      <div className={cn("mb-2 flex items-center gap-2 text-[10px] font-bold tracking-[0.25em]", colors[tone])}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {children}
    </section>
  );
}

/* ─────────────────────────── Presentation Mode ─────────────────────────── */

function PresentationOverlay({ onExit }: { onExit: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    return () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
      <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full border border-cyan-300/30 bg-[#040816]/90 px-4 py-2 backdrop-blur-xl">
        <Presentation className="h-4 w-4 text-cyan-300" />
        <span className="text-xs font-bold tracking-[0.25em] text-cyan-200">{ar ? "وضع العرض التنفيذي" : "EXECUTIVE PRESENTATION MODE"}</span>
        <button onClick={onExit} className="ms-2 rounded-md px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/10">{ar ? "إنهاء (ESC)" : "EXIT (ESC)"}</button>
      </div>
    </div>
  );
}
