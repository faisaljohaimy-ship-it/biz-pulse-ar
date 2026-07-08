import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { TwinBackground } from "./scenes/TwinBackground";
import {
  LayoutDashboard,
  Brain,
  Vote,
  ShieldAlert,
  Workflow,
  Presentation,
  Network,
  Sparkles,
  Mic,
  Command,
  Users,
  Building2,
  BookOpen,
  Bot,
  GitBranch,
  FileText,
  Activity,
  Zap,
  Target,
  AlertTriangle,
  Database,
  Settings,
  Lock,
  Cpu,
  Eye,
  Briefcase,
  TrendingUp,
  MessageSquare,
  Plug,
  ChevronRight,
  Search,
  BarChart3,
  Folder,
  Brush,
  Layers,
  Shield,
  Globe,
} from "lucide-react";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

// =============== SECTIONS ===============
type Cmd = { keys: string; desc: string };
type ModuleItem = {
  icon: React.FC<{ size: number; color: string; strokeWidth?: number }>;
  label: string;
  route: string;
  desc: string;
};

type Section = {
  key: string;
  kind: "intro" | "module" | "commands" | "platform" | "outro";
  tone: string;
  icon: React.FC<{ size: number; color: string; strokeWidth?: number }>;
  title: string;
  subtitle: string;
  caption: string;
  modules?: ModuleItem[];
  metrics?: Array<{ l: string; v: string }>;
  commands?: Cmd[];
  duration: number;
};

const SECTIONS: Section[] = [
  {
    key: "intro",
    kind: "intro",
    tone: "#22d3ee",
    icon: Sparkles,
    title: "NEXUS AI OS",
    subtitle: "Complete System Walkthrough · Part 04",
    caption: "Every module · Every command · Every workflow",
    duration: 110,
  },
  // 1
  {
    key: "cockpit",
    kind: "module",
    tone: "#22d3ee",
    icon: LayoutDashboard,
    title: "Executive Cockpit",
    subtitle: "Single pane of glass for the entire enterprise",
    caption: "Unified, real-time view of every KPI, signal and live stream",
    modules: [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        route: "/dashboard",
        desc: "Primary command surface",
      },
      {
        icon: Activity,
        label: "Enterprise Pulse",
        route: "/cockpit",
        desc: "Live operational heartbeat",
      },
      {
        icon: Briefcase,
        label: "Daily Briefing",
        route: "/briefing",
        desc: "AI-curated morning report",
      },
      { icon: TrendingUp, label: "Outcomes", route: "/outcomes", desc: "Goal-to-result tracking" },
    ],
    metrics: [
      { l: "Health", v: "96%" },
      { l: "Live KPIs", v: "184" },
      { l: "Streams", v: "23" },
    ],
    duration: 165,
  },
  // 2
  {
    key: "intelligence",
    kind: "module",
    tone: "#a78bfa",
    icon: Brain,
    title: "AI Intelligence Layer",
    subtitle: "Signals · Agents · Reasoning",
    caption: "Continuous extraction of signals from every data source",
    modules: [
      {
        icon: Brain,
        label: "Intelligence",
        route: "/intelligence",
        desc: "Signal & insight engine",
      },
      { icon: Bot, label: "AI Agents", route: "/agents", desc: "Autonomous worker fleet" },
      { icon: Cpu, label: "AI Ops", route: "/ai-ops", desc: "Model performance & cost" },
      {
        icon: MessageSquare,
        label: "Assistant",
        route: "/assistant",
        desc: "Conversational analyst",
      },
    ],
    metrics: [
      { l: "Signals", v: "4.2K" },
      { l: "Confidence", v: "94%" },
      { l: "Models", v: "12" },
    ],
    duration: 165,
  },
  // 3
  {
    key: "decisions",
    kind: "module",
    tone: "#fbbf24",
    icon: Vote,
    title: "Board Decisions & Governance",
    subtitle: "Decide, record, and audit at board level",
    caption: "Every strategic decision tracked, justified and reversible",
    modules: [
      { icon: Vote, label: "Decisions", route: "/decisions", desc: "Decision intake & vote" },
      { icon: Presentation, label: "Boardroom", route: "/boardroom", desc: "Live board session" },
      { icon: Lock, label: "Governance", route: "/governance", desc: "Policies & controls" },
      { icon: BookOpen, label: "Knowledge", route: "/knowledge", desc: "Institutional memory" },
    ],
    metrics: [
      { l: "Pending", v: "14" },
      { l: "Approved", v: "47" },
      { l: "Avg Time", v: "2.1d" },
    ],
    duration: 165,
  },
  // 4
  {
    key: "risk",
    kind: "module",
    tone: "#f43f5e",
    icon: ShieldAlert,
    title: "Risk & Resilience",
    subtitle: "Detect · Contain · Recover",
    caption: "Operational risk and crisis containment in real time",
    modules: [
      { icon: ShieldAlert, label: "Risk Center", route: "/risk", desc: "Heatmap & mitigations" },
      {
        icon: AlertTriangle,
        label: "Crisis Room",
        route: "/crisis",
        desc: "Live incident response",
      },
      { icon: Eye, label: "Forgotten", route: "/forgotten", desc: "Blind-spot detector" },
      { icon: Target, label: "Critical Tasks", route: "/tasks", desc: "P0 / P1 task queue" },
    ],
    metrics: [
      { l: "Critical", v: "2" },
      { l: "Mitigated", v: "31" },
      { l: "Coverage", v: "94%" },
    ],
    duration: 165,
  },
  // 5
  {
    key: "execution",
    kind: "module",
    tone: "#34d399",
    icon: Workflow,
    title: "Execution Engine",
    subtitle: "From decision to delivery",
    caption: "Automate workflows and orchestrate work across every department",
    modules: [
      { icon: Workflow, label: "Workflows", route: "/workflows", desc: "Automated pipelines" },
      {
        icon: GitBranch,
        label: "Orchestration",
        route: "/orchestration",
        desc: "Cross-team choreography",
      },
      {
        icon: Zap,
        label: "Transformation",
        route: "/transformation",
        desc: "Change-program tracker",
      },
      {
        icon: Building2,
        label: "Departments",
        route: "/departments",
        desc: "Per-unit performance",
      },
    ],
    metrics: [
      { l: "Workflows", v: "86" },
      { l: "On-Track", v: "78%" },
      { l: "Automations", v: "240" },
    ],
    duration: 165,
  },
  // 6
  {
    key: "twin",
    kind: "module",
    tone: "#7dd3fc",
    icon: Network,
    title: "Digital Twin",
    subtitle: "3D navigation across the entire enterprise",
    caption: "A living model of the organisation — drill into any node",
    modules: [
      { icon: Network, label: "Digital Twin", route: "/digital-twin", desc: "3D enterprise graph" },
      { icon: Users, label: "Team", route: "/team", desc: "People & capacity" },
      { icon: Briefcase, label: "Portfolio", route: "/portfolio", desc: "Initiatives & bets" },
      { icon: Database, label: "Memory", route: "/memory", desc: "Long-term context store" },
    ],
    metrics: [
      { l: "Nodes", v: "1,284" },
      { l: "Edges", v: "9,710" },
      { l: "Depth", v: "5 lvl" },
    ],
    duration: 150,
  },
  // 7 — Command Palette
  {
    key: "commands",
    kind: "commands",
    tone: "#f0abfc",
    icon: Command,
    title: "Command Palette",
    subtitle: "Every action · One keystroke · ⌘K",
    caption: "Operate the entire system from a single command surface",
    commands: [
      { keys: "⌘K", desc: "Open command palette" },
      { keys: "G  D", desc: "Go to Dashboard" },
      { keys: "G  I", desc: "Go to Intelligence" },
      { keys: "G  R", desc: "Go to Risk Center" },
      { keys: "G  B", desc: "Go to Boardroom" },
      { keys: "G  T", desc: "Go to Digital Twin" },
      { keys: "N  D", desc: "New Decision" },
      { keys: "N  W", desc: "New Workflow" },
      { keys: "N  T", desc: "New Task" },
      { keys: "A  R", desc: "Approve Risk Mitigation" },
      { keys: "A  D", desc: "Approve Decision" },
      { keys: "/ risk", desc: "Search risks" },
      { keys: "/ kpi", desc: "Search live KPIs" },
      { keys: "?  ", desc: "Show keyboard shortcuts" },
    ],
    duration: 220,
  },
  // 8 — Voice
  {
    key: "voice",
    kind: "module",
    tone: "#fda4af",
    icon: Mic,
    title: "Voice & Conversational Control",
    subtitle: "Speak to the enterprise",
    caption: "Natural-language commands trigger real workflows",
    modules: [
      { icon: Mic, label: "Voice Console", route: "/voice", desc: "Speech-to-action" },
      { icon: MessageSquare, label: "Assistant", route: "/assistant", desc: "Multi-turn analyst" },
      { icon: FileText, label: "Prompts", route: "/prompts", desc: "Reusable prompt library" },
      { icon: BookOpen, label: "Knowledge", route: "/knowledge", desc: "Grounded retrieval" },
    ],
    metrics: [
      { l: "Languages", v: "AR · EN" },
      { l: "Latency", v: "210ms" },
      { l: "Accuracy", v: "97%" },
    ],
    duration: 150,
  },
  // 9 — Platform
  {
    key: "platform",
    kind: "platform",
    tone: "#94a3b8",
    icon: Settings,
    title: "Platform · Admin · Integrations",
    subtitle: "The operating substrate underneath every module",
    caption: "Security, integrations, files, and the marketplace of capabilities",
    modules: [
      { icon: Plug, label: "Integrations", route: "/integrations", desc: "Connect any system" },
      { icon: Lock, label: "Admin", route: "/admin", desc: "Tenants & RBAC" },
      { icon: Settings, label: "Settings", route: "/settings", desc: "Per-user preferences" },
      { icon: Folder, label: "Files", route: "/files", desc: "Documents & evidence" },
      { icon: Layers, label: "Marketplace", route: "/marketplace", desc: "Agents & extensions" },
      {
        icon: Users,
        label: "Chief of Staff",
        route: "/chief-of-staff",
        desc: "Executive automation",
      },
      { icon: BarChart3, label: "Analytics", route: "/analytics", desc: "Cross-module reporting" },
      { icon: Search, label: "Analyst", route: "/analyst", desc: "Ad-hoc deep dives" },
    ],
    duration: 200,
  },
  // 10 — outro
  {
    key: "outro",
    kind: "outro",
    tone: "#22d3ee",
    icon: Sparkles,
    title: "One System. One Source of Truth.",
    subtitle: "NEXUS AI Operating System",
    caption: "Decide · Execute · Govern — at the speed of the enterprise",
    duration: 140,
  },
];

const TOTAL = SECTIONS.reduce((s, x) => s + x.duration, 0);
export const PART4_DURATION = TOTAL;

// ============ Scene ============
const Header: React.FC<{ s: Section; enter: number; slideX: number }> = ({ s, enter, slideX }) => {
  const Icon = s.icon;
  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        left: 80,
        right: 80,
        display: "flex",
        alignItems: "center",
        gap: 24,
        transform: `translateX(${slideX}px)`,
        opacity: enter,
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 22,
          background: `${s.tone}22`,
          border: `2px solid ${s.tone}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 40px ${s.tone}66`,
        }}
      >
        <Icon size={48} color={s.tone} strokeWidth={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, letterSpacing: 5, color: s.tone, fontWeight: 700 }}>
          {s.subtitle.toUpperCase()}
        </div>
        <div
          style={{ fontSize: 54, fontWeight: 900, color: "#fff", lineHeight: 1.05, marginTop: 6 }}
        >
          {s.title}
        </div>
      </div>
    </div>
  );
};

const SectionScene: React.FC<{ s: Section }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const exit = interpolate(frame, [durationInFrames - 22, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = enter * (1 - exit);
  const slideX = interpolate(enter, [0, 1], [-60, 0]);
  const sweep = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" });

  if (s.kind === "intro") {
    const iconScale = interpolate(enter, [0, 1], [0.5, 1]);
    const subFade = spring({ frame: frame - 25, fps, config: { damping: 22 } });
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          <div style={{ transform: `scale(${iconScale})`, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                inset: -40,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${s.tone}55, transparent 70%)`,
                filter: "blur(24px)",
              }}
            />
            <Img
              src={staticFile("images/nexus-icon.png")}
              style={{
                width: 200,
                height: 200,
                borderRadius: 40,
                boxShadow: `0 30px 80px -10px ${s.tone}88`,
              }}
            />
          </div>
          <div style={{ textAlign: "center", opacity: enter }}>
            <div
              style={{
                fontSize: 88,
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1.05,
                letterSpacing: 2,
              }}
            >
              {s.title}
            </div>
            <div
              style={{
                marginTop: 14,
                fontSize: 22,
                color: "#7fb8ff",
                letterSpacing: 6,
                fontWeight: 600,
              }}
            >
              {s.subtitle.toUpperCase()}
            </div>
            <div
              style={{
                marginTop: 28,
                fontSize: 22,
                color: "#cfe7ff",
                opacity: subFade,
                letterSpacing: 1,
              }}
            >
              {s.caption}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (s.kind === "outro") {
    const iconScale = interpolate(enter, [0, 1], [0.6, 1]);
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{ transform: `scale(${iconScale})`, display: "inline-block", marginBottom: 30 }}
          >
            <Img
              src={staticFile("images/nexus-icon.png")}
              style={{
                width: 140,
                height: 140,
                borderRadius: 28,
                boxShadow: `0 30px 80px -10px ${s.tone}88`,
              }}
            />
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#fff",
              lineHeight: 1.1,
              maxWidth: 1200,
            }}
          >
            {s.title}
          </div>
          <div style={{ marginTop: 18, fontSize: 22, color: "#7fb8ff", letterSpacing: 6 }}>
            {s.subtitle.toUpperCase()}
          </div>
          <div
            style={{
              marginTop: 30,
              fontSize: 24,
              color: s.tone,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            {s.caption}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}
      >
        <div
          style={{
            width: 380 * sweep + 60,
            height: 380 * sweep + 60,
            borderRadius: "50%",
            border: `2px solid ${s.tone}`,
            opacity: 0.35,
            boxShadow: `0 0 80px ${s.tone}55, inset 0 0 50px ${s.tone}33`,
          }}
        />
      </AbsoluteFill>

      <Header s={s} enter={enter} slideX={slideX} />

      <div
        style={{
          position: "absolute",
          top: 220,
          left: 80,
          right: 80,
          padding: "14px 22px",
          borderRadius: 14,
          background: `linear-gradient(90deg, ${s.tone}22, transparent)`,
          borderLeft: `4px solid ${s.tone}`,
          fontSize: 20,
          color: "#e2f0ff",
          fontWeight: 500,
        }}
      >
        {s.caption}
      </div>

      {s.kind === "module" && s.modules && (
        <div
          style={{
            position: "absolute",
            top: 310,
            left: 80,
            right: 80,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 18,
          }}
        >
          {s.modules.map((m, i) => {
            const e = spring({
              frame: frame - 18 - i * 7,
              fps,
              config: { damping: 16, stiffness: 130 },
            });
            const MIcon = m.icon;
            return (
              <div
                key={i}
                style={{
                  padding: 22,
                  borderRadius: 18,
                  background: "linear-gradient(180deg, rgba(10,20,40,0.85), rgba(4,8,20,0.7))",
                  border: `1px solid ${s.tone}55`,
                  boxShadow: `0 20px 50px -15px ${s.tone}44`,
                  opacity: e,
                  transform: `translateY(${interpolate(e, [0, 1], [20, 0])}px)`,
                  minHeight: 230,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: `${s.tone}22`,
                    border: `1px solid ${s.tone}88`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  <MIcon size={26} color={s.tone} strokeWidth={2} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                  {m.label}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: s.tone,
                    fontFamily: "ui-monospace, monospace",
                    marginBottom: 10,
                  }}
                >
                  {m.route}
                </div>
                <div style={{ fontSize: 13, color: "#9bb6d6", lineHeight: 1.4 }}>{m.desc}</div>
              </div>
            );
          })}
        </div>
      )}

      {s.kind === "platform" && s.modules && (
        <div
          style={{
            position: "absolute",
            top: 300,
            left: 80,
            right: 80,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          {s.modules.map((m, i) => {
            const e = spring({
              frame: frame - 14 - i * 4,
              fps,
              config: { damping: 16, stiffness: 130 },
            });
            const MIcon = m.icon;
            return (
              <div
                key={i}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: "rgba(10,20,40,0.7)",
                  border: `1px solid ${s.tone}44`,
                  opacity: e,
                  transform: `translateY(${interpolate(e, [0, 1], [16, 0])}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: `${s.tone}22`,
                    border: `1px solid ${s.tone}66`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MIcon size={22} color={s.tone} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: "#9bb6d6", marginTop: 2 }}>{m.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {s.kind === "commands" && s.commands && (
        <div
          style={{
            position: "absolute",
            top: 300,
            left: 80,
            right: 80,
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
          }}
        >
          {s.commands.map((c, i) => {
            const e = spring({
              frame: frame - 12 - i * 4,
              fps,
              config: { damping: 18, stiffness: 140 },
            });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 18px",
                  borderRadius: 12,
                  background: "rgba(10,20,40,0.75)",
                  border: `1px solid ${s.tone}44`,
                  opacity: e,
                  transform: `translateX(${interpolate(e, [0, 1], [-20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    minWidth: 130,
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: `${s.tone}22`,
                    border: `1px solid ${s.tone}88`,
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 16,
                    fontWeight: 700,
                    color: s.tone,
                    textAlign: "center",
                    letterSpacing: 2,
                  }}
                >
                  {c.keys}
                </div>
                <ChevronRight size={16} color="#7892b4" />
                <div style={{ flex: 1, fontSize: 16, color: "#e2f0ff", fontWeight: 500 }}>
                  {c.desc}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {s.metrics && (
        <div
          style={{
            position: "absolute",
            bottom: 130,
            left: 80,
            right: 80,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {s.metrics.map((mt, i) => {
            const e = spring({ frame: frame - 70 - i * 6, fps, config: { damping: 18 } });
            return (
              <div
                key={i}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  opacity: e,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontSize: 13, color: "#9bb6d6", letterSpacing: 2 }}>
                  {mt.l.toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: s.tone,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {mt.v}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 65,
          left: 80,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#34d399",
            boxShadow: "0 0 10px #34d399",
          }}
        />
        <div style={{ fontSize: 11, color: "#9bb6d6", letterSpacing: 3 }}>
          LIVE · SECURE · STREAMING
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Part4Video: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pulse = Math.sin((frame / durationInFrames) * Math.PI * 2) * 0.05 + 0.95;

  let acc = 0;
  return (
    <AbsoluteFill style={{ background: "#04060d", fontFamily, color: "#e2f0ff" }}>
      <TwinBackground />
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 35%, rgba(2,4,10,0.88) 100%)",
          opacity: pulse,
          pointerEvents: "none",
        }}
      />

      {SECTIONS.map((s) => {
        const from = acc;
        acc += s.duration;
        return (
          <Sequence key={s.key} from={from} durationInFrames={s.duration}>
            <SectionScene s={s} />
          </Sequence>
        );
      })}

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 50,
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: 0.85,
          }}
        >
          <Img
            src={staticFile("images/nexus-icon.png")}
            style={{ width: 44, height: 44, borderRadius: 10 }}
          />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>NEXUS</div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#7fb8ff" }}>
              AI OPERATING SYSTEM · EN
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
