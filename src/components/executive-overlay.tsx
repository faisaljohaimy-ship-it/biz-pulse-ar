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
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAriaVoice } from "@/lib/aria-voice";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { useEnterprisePulse, type PulseAlert } from "@/lib/enterprise-pulse";
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
  const pulse = useEnterprisePulse();
  const [input, setInput] = useState("");
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (url, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(url, { ...init, headers });
        },
      }),
  );
  const { messages, sendMessage, status } = useChat({ id: "aria-console", transport });
  const isLoading = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [voiceMode, setVoiceMode] = useState(true);
  const spokenIdRef = useRef<string | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const suggestions = ar
    ? ["لخص أداء اليوم", "ما أكبر 3 مخاطر؟", "جهز اجتماع مجلس الإدارة", "ما الفرص الاستراتيجية؟"]
    : ["Summarize today's performance", "Top 3 strategic risks?", "Prep the board meeting", "What strategic opportunities?"];

  const send = (text: string) => {
    if (!text.trim() || isLoading) return;
    const ctx = ar
      ? `سياق مباشر من Nexus Pulse: الصحة العامة ${pulse.health}، الحالة ${pulse.status}، الإيراد ${pulse.kpis[0].value} (${pulse.kpis[0].delta})، EBITDA ${pulse.kpis[1].value}، حوادث P1 ${pulse.kpis[4].value}، مهام مفتوحة ${pulse.counts.openTasks}. تنبيهات نشطة: ${pulse.alerts.map((a: PulseAlert) => a.title_ar).join("؛ ")}. تنبؤات الأزمات الأعلى: ${pulse.crises.slice(0,3).map((c) => `${c.title_ar} (${c.riskScore})`).join("؛ ")}. بنود منسية: ${pulse.memory.filter((m) => m.status === "forgotten").map((m) => m.title_ar).join("؛ ") || "لا يوجد"}.`
      : `Live Nexus Pulse context: health ${pulse.health}, status ${pulse.status}, revenue ${pulse.kpis[0].value} (${pulse.kpis[0].delta}), EBITDA ${pulse.kpis[1].value}, P1 incidents ${pulse.kpis[4].value}, open tasks ${pulse.counts.openTasks}. Active alerts: ${pulse.alerts.map((a: PulseAlert) => a.title_en).join("; ")}. Top crisis predictions: ${pulse.crises.slice(0,3).map((c) => `${c.title_en} (${c.riskScore})`).join("; ")}. Forgotten items: ${pulse.memory.filter((m) => m.status === "forgotten").map((m) => m.title_en).join("; ") || "none"}.`;
    sendMessage({ text: `${ctx}\n\n${text}` });
    setInput("");
  };

  const voice = useAriaVoice({
    onFinal: (txt) => send(txt),
  });

  // Auto-speak the last assistant message when streaming completes
  useEffect(() => {
    if (!voiceMode) return;
    if (status !== "ready") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenIdRef.current === last.id) return;
    const txt = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
    if (!txt) return;
    spokenIdRef.current = last.id;
    voice.speak(txt);
  }, [messages, status, voiceMode, voice]);

  // Stop voice when console closes
  useEffect(() => {
    if (!open) {
      voice.stopListening();
      voice.stopSpeaking();
    }
  }, [open, voice]);


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-3 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-[#020514]/70 backdrop-blur-md" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 mb-20 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-cyan-300/25 bg-[#040816]/95 shadow-[0_40px_120px_-20px_rgba(34,211,238,0.6)]"
        style={{ animation: "scale-in 0.25s ease-out" }}
      >
        <div className="relative h-24 shrink-0 overflow-hidden bg-gradient-to-br from-cyan-500/30 via-blue-600/30 to-indigo-700/30">
          <div className="absolute inset-0 opacity-40" style={{
            backgroundImage: "linear-gradient(rgba(186,230,253,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(186,230,253,0.5) 1px,transparent 1px)",
            backgroundSize: "20px 20px",
            maskImage: "radial-gradient(ellipse at center,black,transparent 80%)",
          }}/>
          <div className="absolute start-5 bottom-3 flex items-center gap-3">
            <div className="relative h-12 w-12">
              <span className="absolute inset-[-6px] rounded-full bg-cyan-400/40 blur-xl animate-pulse" />
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-700" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">ARIA</div>
              <div className="text-[10px] tracking-[0.25em] text-cyan-200/90">
                {ar ? "كبيرة المستشارين · مباشر" : "EXEC ADVISOR · LIVE"}
              </div>
            </div>
          </div>
          <div className="absolute end-3 top-3 flex items-center gap-1.5">
            <button
              onClick={() => {
                const next = !voiceMode;
                setVoiceMode(next);
                if (!next) voice.stopSpeaking();
              }}
              title={voiceMode ? (ar ? "كتم الصوت" : "Mute") : (ar ? "تشغيل الصوت" : "Unmute")}
              className={cn(
                "rounded-lg p-1.5 transition",
                voiceMode ? "bg-cyan-400/15 text-cyan-200 hover:bg-cyan-400/25" : "text-slate-400 hover:bg-white/10",
              )}
            >
              {voiceMode ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>

              <p className="text-sm text-slate-300">
                {ar
                  ? `مرحباً. الصحة العامة ${pulse.health}، الحالة "${pulse.status === "healthy" ? "صحية" : pulse.status === "warning" ? "تحذير" : "حرجة"}". اسألني عن أي مؤشر أو خطر أو فرصة.`
                  : `Hi. Overall health ${pulse.health}, status "${pulse.status}". Ask me about any KPI, risk or opportunity.`}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-[11px] text-cyan-200 hover:bg-cyan-400/15"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m: UIMessage) => {
            const text = m.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("");
            const isUser = m.role === "user";
            const displayText = isUser ? text.split("\n\n").slice(-1)[0] : text;
            return (
              <div
                key={m.id}
                className={cn(
                  "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  isUser
                    ? "ms-auto bg-cyan-400/15 text-cyan-50 border border-cyan-400/25"
                    : "bg-white/[0.04] text-slate-100 border border-white/5",
                )}
              >
                {displayText || (isLoading ? "…" : "")}
              </div>
            );
          })}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="bg-white/[0.04] border border-white/5 rounded-2xl px-3.5 py-2.5 text-sm text-slate-400 max-w-[88%]">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" style={{ animationDelay: "0.15s" }} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" style={{ animationDelay: "0.3s" }} />
              </span>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="shrink-0 border-t border-white/5 p-3"
        >
          <div className="relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder={ar ? "تحدث مع ARIA..." : "Talk to ARIA..."}
              className="w-full rounded-2xl border border-cyan-400/20 bg-[#06101f]/80 py-3 ps-4 pe-12 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-300/50 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg bg-cyan-400/20 p-2 text-cyan-200 hover:bg-cyan-400/30 disabled:opacity-30"
            >
              <Zap className="h-4 w-4" />
            </button>
          </div>
        </form>
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

type Slide = {
  badge_en: string;
  badge_ar: string;
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
  metrics?: { label_en: string; label_ar: string; value: string; delta?: string; tone?: "up" | "down" | "flat" }[];
  bullets_en?: string[];
  bullets_ar?: string[];
  icon: React.ComponentType<{ className?: string }>;
};

const SLIDES: Slide[] = [
  {
    badge_en: "EXECUTIVE OVERVIEW",
    badge_ar: "نظرة عامة تنفيذية",
    title_en: "Today's Enterprise Pulse",
    title_ar: "نبض المؤسسة اليوم",
    body_en: "Performance is 12.4% above plan. ARIA has analyzed 247 signals across portfolio, risk and transformation.",
    body_ar: "الأداء أعلى من الخطة بـ 12.4%. حللت ARIA 247 إشارة عبر المحفظة والمخاطر والتحول.",
    metrics: [
      { label_en: "Health", label_ar: "الصحة", value: "94", delta: "+2.1", tone: "up" },
      { label_en: "Risk", label_ar: "المخاطر", value: "21", delta: "+4", tone: "down" },
      { label_en: "Opportunities", label_ar: "الفرص", value: "12", delta: "+3", tone: "up" },
      { label_en: "Velocity", label_ar: "السرعة", value: "88", delta: "+5", tone: "up" },
    ],
    icon: Activity,
  },
  {
    badge_en: "STRATEGIC RISKS",
    badge_ar: "المخاطر الاستراتيجية",
    title_en: "Top 3 Risks Requiring Decision",
    title_ar: "أكبر 3 مخاطر تتطلب قراراً",
    body_en: "Concentrated exposure and execution slippage are the two themes for the board this quarter.",
    body_ar: "التركّز والتأخر التنفيذي هما المحوران أمام مجلس الإدارة هذا الربع.",
    bullets_en: [
      "ERP rollout slipping by 18 days — escalate to steering committee",
      "Revenue concentration 34% in one client — diversification plan needed",
      "Services margin compression — Q4 repricing recommended",
    ],
    bullets_ar: [
      "تأخر مشروع ERP بـ 18 يوم — تصعيد للجنة التوجيه",
      "تركز الإيرادات 34% في عميل واحد — خطة تنويع مطلوبة",
      "ضغط على هامش الخدمات — يُوصى بإعادة التسعير للربع الرابع",
    ],
    icon: ShieldAlert,
  },
  {
    badge_en: "GROWTH OPPORTUNITIES",
    badge_ar: "فرص النمو",
    title_en: "Three High-Value Opportunities",
    title_ar: "ثلاث فرص عالية القيمة",
    body_en: "Combined upside of approximately $4.6M over 12 months if executed in the next two quarters.",
    body_ar: "إمكانات تقريبية بـ 4.6 مليون دولار خلال 12 شهراً عند التنفيذ في الربعين المقبلين.",
    bullets_en: [
      "Eastern region demand +18% — accelerate sales hiring",
      "Automating 3 finance ops saves $1.2M annually",
      "Two regional alliance candidates ready for term sheets",
    ],
    bullets_ar: [
      "طلب المنطقة الشرقية +18% — تسريع توظيف المبيعات",
      "أتمتة 3 عمليات مالية توفر 1.2M سنوياً",
      "مرشحان لتحالف إقليمي جاهزان لمذكرة الشروط",
    ],
    icon: TrendingUp,
  },
  {
    badge_en: "RECOMMENDED ACTIONS",
    badge_ar: "الإجراءات الموصى بها",
    title_en: "Decisions for This Board Cycle",
    title_ar: "قرارات لدورة المجلس هذه",
    body_en: "ARIA recommends three executive moves that unlock the strategic plan and de-risk Q4 delivery.",
    body_ar: "توصي ARIA بثلاث خطوات تنفيذية تطلق الخطة الاستراتيجية وتقلل مخاطر تسليم الربع الرابع.",
    bullets_en: [
      "Accelerate hiring of Chief Digital Officer",
      "Reprice services portfolio for Q4",
      "Launch a customer diversification program",
    ],
    bullets_ar: [
      "تسريع توظيف رئيس التحول الرقمي",
      "إعادة تسعير محفظة الخدمات للربع الرابع",
      "إطلاق برنامج تنويع قاعدة العملاء",
    ],
    icon: Target,
  },
];

function PresentationOverlay({ onExit }: { onExit: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [idx, setIdx] = useState(0);
  const total = SLIDES.length;

  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    return () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, total - 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Home") {
        setIdx(0);
      } else if (e.key === "End") {
        setIdx(total - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  const slide = SLIDES[idx];
  const SlideIcon = slide.icon;
  const progress = ((idx + 1) / total) * 100;

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-br from-[#020514] via-[#040b1f] to-[#02050f]">
      {/* Grid background */}
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{
        backgroundImage: "linear-gradient(rgba(34,211,238,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.18) 1px,transparent 1px)",
        backgroundSize: "80px 80px",
        maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
      }} />
      <div className="pointer-events-none absolute -left-40 top-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[480px] w-[480px] rounded-full bg-blue-700/25 blur-3xl" />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 border-b border-cyan-300/15 bg-[#040816]/70 px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_30px_rgba(34,211,238,0.5)]">
            <Presentation className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-[10px] font-bold tracking-[0.3em] text-cyan-300/90">{ar ? "وضع العرض التنفيذي" : "EXECUTIVE PRESENTATION"}</div>
            <div className="text-[10px] text-slate-400">ARIA · Nexus AI OS</div>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-[10px] font-bold text-slate-400 sm:flex">
          <kbd className="rounded bg-slate-800/80 px-2 py-0.5">←</kbd>
          <kbd className="rounded bg-slate-800/80 px-2 py-0.5">→</kbd>
          <span>{ar ? "تنقل" : "Navigate"}</span>
          <span className="mx-2 opacity-50">·</span>
          <kbd className="rounded bg-slate-800/80 px-2 py-0.5">ESC</kbd>
          <span>{ar ? "خروج" : "Exit"}</span>
        </div>
        <button onClick={onExit} className="rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-bold text-cyan-200 hover:bg-cyan-400/20">
          {ar ? "إنهاء" : "Exit"}
        </button>
      </div>

      {/* Slide content */}
      <div key={idx} className="absolute inset-0 flex items-center justify-center px-6 py-20 sm:px-16" style={{ animation: "scale-in 0.35s ease-out" }}>
        <div className="w-full max-w-5xl">
          <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.3em] text-cyan-300/80">
            <SlideIcon className="h-4 w-4" />
            {ar ? slide.badge_ar : slide.badge_en}
          </div>
          <h1 className="mt-4 bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-4xl font-bold leading-tight text-transparent sm:text-6xl">
            {ar ? slide.title_ar : slide.title_en}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-xl">
            {ar ? slide.body_ar : slide.body_en}
          </p>

          {slide.metrics && (
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {slide.metrics.map((m) => (
                <div key={m.label_en} className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.06] p-4 backdrop-blur-xl">
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">{ar ? m.label_ar : m.label_en}</div>
                  <div className="mt-2 text-3xl font-bold text-cyan-200 sm:text-4xl">{m.value}</div>
                  {m.delta && (
                    <div className={cn(
                      "mt-1 text-xs font-bold",
                      m.tone === "up" ? "text-emerald-300" : m.tone === "down" ? "text-rose-300" : "text-slate-400",
                    )}>{m.delta}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {slide.bullets_en && (
            <ul className="mt-8 space-y-3">
              {(ar ? slide.bullets_ar! : slide.bullets_en).map((b, i) => (
                <li key={i} className="flex items-start gap-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.04] p-4 text-base text-slate-100 backdrop-blur-xl sm:text-lg">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/10 text-sm font-bold text-cyan-200">{i + 1}</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute inset-x-0 bottom-0 border-t border-cyan-300/15 bg-[#040816]/70 backdrop-blur-xl">
        <div className="h-1 bg-slate-800">
          <div className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <button
            onClick={() => setIdx((i) => Math.max(i - 1, 0))}
            disabled={idx === 0}
            className="flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-400/5 px-3 py-1.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-400/15 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> {ar ? "السابق" : "Prev"}
          </button>
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Slide ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === idx ? "w-8 bg-cyan-300" : "w-2 bg-slate-600 hover:bg-slate-400",
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400">{idx + 1} / {total}</span>
            <button
              onClick={() => setIdx((i) => Math.min(i + 1, total - 1))}
              disabled={idx === total - 1}
              className="flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 px-3 py-1.5 text-xs font-bold text-cyan-100 transition hover:from-cyan-500/30 hover:to-blue-600/30 disabled:opacity-30"
            >
              {ar ? "التالي" : "Next"} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
