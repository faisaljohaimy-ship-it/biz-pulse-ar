import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";
import { loadFont as loadTajawal } from "@remotion/google-fonts/Tajawal";
import { TwinBackground } from "./scenes/TwinBackground";
import {
  LayoutDashboard, Brain, Vote, ShieldAlert, Workflow, Presentation,
  Network, Sparkles, Mic, Command, Users, Building2, BookOpen, Bot,
  GitBranch, FileText, Activity, Zap, Target, AlertTriangle, Database,
  Settings, Lock, Cpu, Eye, Briefcase, TrendingUp, MessageSquare, Plug
} from "lucide-react";

const cairo = loadCairo("normal", { weights: ["400", "600", "700", "800", "900"], subsets: ["arabic"] });
const tajawal = loadTajawal("normal", { weights: ["400", "500", "700", "800"], subsets: ["arabic"] });

const FONT = `${cairo.fontFamily}, ${tajawal.fontFamily}, sans-serif`;

// ============ SECTIONS (Arabic) ============
type Section = {
  key: string;
  title: string;        // big Arabic title
  subtitle: string;     // subtitle
  caption: string;      // narration line
  tone: string;
  icon: React.FC<{ size: number; color: string; strokeWidth?: number }>;
  modules: Array<{ icon: React.FC<{ size: number; color: string; strokeWidth?: number }>; label: string; desc: string }>;
  metrics?: Array<{ l: string; v: string }>;
  duration: number;     // frames
};

const SECTIONS: Section[] = [
  {
    key: "intro",
    title: "نظام Nexus",
    subtitle: "نظام التشغيل الذكي للمؤسسات",
    caption: "جولة شاملة في النظام وطريقة الاستخدام",
    tone: "#22d3ee",
    icon: Sparkles,
    modules: [],
    duration: 110,
  },
  {
    key: "cockpit",
    title: "قمرة القيادة التنفيذية",
    subtitle: "Executive Cockpit · Dashboard",
    caption: "لوحة موحّدة لجميع مؤشرات الأداء الحيّة لحظة بلحظة",
    tone: "#22d3ee",
    icon: LayoutDashboard,
    modules: [
      { icon: LayoutDashboard, label: "لوحة القيادة", desc: "Dashboard" },
      { icon: Activity,         label: "النبض المؤسسي", desc: "Enterprise Pulse" },
      { icon: Briefcase,        label: "الإحاطة اليومية", desc: "Briefing" },
      { icon: TrendingUp,       label: "النتائج", desc: "Outcomes" },
    ],
    metrics: [{ l: "الصحة", v: "96%" }, { l: "KPIs", v: "184" }, { l: "تدفقات", v: "23" }],
    duration: 150,
  },
  {
    key: "intelligence",
    title: "الذكاء الاصطناعي",
    subtitle: "AI Intelligence Layer",
    caption: "استخراج الإشارات وتحويل البيانات إلى قرارات",
    tone: "#a78bfa",
    icon: Brain,
    modules: [
      { icon: Brain,        label: "الذكاء", desc: "Intelligence" },
      { icon: Bot,          label: "وكلاء AI", desc: "AI Agents" },
      { icon: Cpu,          label: "AI Ops", desc: "Model Operations" },
      { icon: MessageSquare,label: "المساعد الذكي", desc: "Assistant" },
    ],
    metrics: [{ l: "الإشارات", v: "4.2K" }, { l: "الثقة", v: "94%" }, { l: "النماذج", v: "12" }],
    duration: 160,
  },
  {
    key: "decisions",
    title: "قرارات مجلس الإدارة",
    subtitle: "Board Decisions & Governance",
    caption: "تتبّع القرارات الاستراتيجية وحوكمتها بدقة كاملة",
    tone: "#fbbf24",
    icon: Vote,
    modules: [
      { icon: Vote,         label: "القرارات", desc: "Decisions" },
      { icon: Presentation, label: "غرفة المجلس", desc: "Boardroom" },
      { icon: Lock,         label: "الحوكمة", desc: "Governance" },
      { icon: BookOpen,     label: "المعرفة", desc: "Knowledge" },
    ],
    metrics: [{ l: "معلّقة", v: "14" }, { l: "معتمدة", v: "47" }, { l: "متوسط", v: "2.1d" }],
    duration: 150,
  },
  {
    key: "risk",
    title: "المخاطر والمرونة",
    subtitle: "Risk & Resilience",
    caption: "رصد المخاطر التشغيلية واحتواء الأزمات في الزمن الحقيقي",
    tone: "#f43f5e",
    icon: ShieldAlert,
    modules: [
      { icon: ShieldAlert,   label: "المخاطر", desc: "Risk" },
      { icon: AlertTriangle, label: "الأزمات", desc: "Crisis" },
      { icon: Eye,           label: "الكشف الاستباقي", desc: "Forgotten" },
      { icon: Target,        label: "المهام الحرجة", desc: "Tasks" },
    ],
    metrics: [{ l: "حرجة", v: "2" }, { l: "محتواة", v: "31" }, { l: "تغطية", v: "94%" }],
    duration: 150,
  },
  {
    key: "execution",
    title: "محرك التنفيذ",
    subtitle: "Execution Engine",
    caption: "أتمتة سير العمل وتنسيق العمليات عبر كل الإدارات",
    tone: "#34d399",
    icon: Workflow,
    modules: [
      { icon: Workflow,    label: "سير العمل", desc: "Workflows" },
      { icon: GitBranch,   label: "التنسيق", desc: "Orchestration" },
      { icon: Zap,         label: "التحوّل", desc: "Transformation" },
      { icon: Building2,   label: "الإدارات", desc: "Departments" },
    ],
    metrics: [{ l: "سير", v: "86" }, { l: "في المسار", v: "78%" }, { l: "أتمتة", v: "240" }],
    duration: 150,
  },
  {
    key: "twin",
    title: "التوأم الرقمي",
    subtitle: "Digital Twin · 3D Navigation",
    caption: "تنقّل ثلاثي الأبعاد بين عقد المؤسسة بالكامل",
    tone: "#7dd3fc",
    icon: Network,
    modules: [
      { icon: Network,    label: "التوأم الرقمي", desc: "Digital Twin" },
      { icon: Users,      label: "الفريق", desc: "Team" },
      { icon: Briefcase,  label: "المحفظة", desc: "Portfolio" },
      { icon: Database,   label: "الذاكرة", desc: "Memory" },
    ],
    duration: 140,
  },
  {
    key: "command",
    title: "لوحة الأوامر ⌘K",
    subtitle: "Command Palette",
    caption: "نفّذ أي أمر في النظام بضغطة زر",
    tone: "#f0abfc",
    icon: Command,
    modules: [
      { icon: Command, label: "تنفيذ أمر", desc: "افتح المخاطر الحرجة" },
      { icon: Command, label: "تنفيذ أمر", desc: "أنشئ قرار جديد" },
      { icon: Command, label: "تنفيذ أمر", desc: "شغّل تقرير المجلس" },
      { icon: Command, label: "تنفيذ أمر", desc: "اعرض نبض المؤسسة" },
    ],
    duration: 160,
  },
  {
    key: "platform",
    title: "المنصة والإدارة",
    subtitle: "Platform · Admin · Integrations",
    caption: "تكاملات وأمان وإعدادات شاملة لإدارة النظام",
    tone: "#94a3b8",
    icon: Settings,
    modules: [
      { icon: Plug,     label: "التكاملات", desc: "Integrations" },
      { icon: Lock,     label: "الإدارة", desc: "Admin" },
      { icon: Settings, label: "الإعدادات", desc: "Settings" },
      { icon: Mic,      label: "الصوت", desc: "Voice" },
    ],
    duration: 140,
  },
  {
    key: "outro",
    title: "مصدر الحقيقة الواحد",
    subtitle: "Single Source of Truth",
    caption: "نظام واحد · ذكاء واحد · قرار واحد",
    tone: "#22d3ee",
    icon: Sparkles,
    modules: [],
    duration: 130,
  },
];

const TOTAL = SECTIONS.reduce((s, x) => s + x.duration, 0);
export const PART3_DURATION = TOTAL;

// ============ Scene component ============
const SectionScene: React.FC<{ section: Section; isFirst?: boolean; isLast?: boolean }> = ({ section, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const tone = section.tone;
  const Icon = section.icon;

  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const exit = interpolate(frame, [durationInFrames - 20, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = enter * (1 - exit);
  const slideX = interpolate(enter, [0, 1], [-60, 0]);

  // Crosshair sweep
  const sweep = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" });

  if (isFirst) {
    // INTRO scene
    const iconScale = interpolate(enter, [0, 1], [0.5, 1]);
    const subFade = spring({ frame: frame - 25, fps, config: { damping: 22 } });
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity, direction: "rtl" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          <div style={{ transform: `scale(${iconScale})`, position: "relative" }}>
            <div style={{ position: "absolute", inset: -40, borderRadius: "50%", background: `radial-gradient(circle, ${tone}55, transparent 70%)`, filter: "blur(24px)" }} />
            <Img src={staticFile("images/nexus-icon.png")} style={{ width: 200, height: 200, borderRadius: 40, boxShadow: `0 30px 80px -10px ${tone}88` }} />
          </div>
          <div style={{ textAlign: "center", opacity: enter }}>
            <div style={{ fontSize: 84, fontWeight: 900, color: "#fff", lineHeight: 1.1, fontFamily: FONT }}>{section.title}</div>
            <div style={{ marginTop: 14, fontSize: 26, color: "#7fb8ff", fontWeight: 600, fontFamily: FONT }}>{section.subtitle}</div>
            <div style={{ marginTop: 26, fontSize: 20, color: "#cfe7ff", opacity: subFade, fontFamily: FONT, letterSpacing: 1 }}>
              {section.caption}
            </div>
            <div style={{ marginTop: 18, fontSize: 12, letterSpacing: 6, color: tone, opacity: subFade }}>
              PART 03 · COMPLETE WALKTHROUGH
            </div>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (isLast) {
    const iconScale = interpolate(enter, [0, 1], [0.6, 1]);
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity, direction: "rtl" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ transform: `scale(${iconScale})`, display: "inline-block", marginBottom: 30 }}>
            <Img src={staticFile("images/nexus-icon.png")} style={{ width: 140, height: 140, borderRadius: 28, boxShadow: `0 30px 80px -10px ${tone}88` }} />
          </div>
          <div style={{ fontSize: 72, fontWeight: 900, color: "#fff", fontFamily: FONT, lineHeight: 1.1 }}>{section.title}</div>
          <div style={{ marginTop: 16, fontSize: 22, color: "#7fb8ff", fontFamily: FONT }}>{section.subtitle}</div>
          <div style={{ marginTop: 36, fontSize: 28, color: tone, fontFamily: FONT, fontWeight: 700, letterSpacing: 2 }}>
            {section.caption}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // Standard module section — RTL layout: title right, modules grid
  return (
    <AbsoluteFill style={{ opacity, direction: "rtl", fontFamily: FONT }}>
      {/* Crosshair behind */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none", opacity: 0.6 }}>
        <div style={{
          width: 360 * sweep + 60, height: 360 * sweep + 60, borderRadius: "50%",
          border: `2px solid ${tone}`, opacity: 0.4,
          boxShadow: `0 0 80px ${tone}55, inset 0 0 50px ${tone}33`,
        }} />
      </AbsoluteFill>

      {/* Header card (top-right because RTL) */}
      <div style={{
        position: "absolute", top: 90, right: 80, left: 80,
        display: "flex", alignItems: "center", gap: 24, transform: `translateX(${-slideX}px)`,
      }}>
        <div style={{
          width: 96, height: 96, borderRadius: 22,
          background: `${tone}22`, border: `2px solid ${tone}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 40px ${tone}66`,
        }}>
          <Icon size={48} color={tone} strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, letterSpacing: 4, color: tone, fontWeight: 700 }}>{section.subtitle}</div>
          <div style={{ fontSize: 56, fontWeight: 900, color: "#fff", lineHeight: 1.1, marginTop: 6 }}>{section.title}</div>
        </div>
      </div>

      {/* Caption strip */}
      <div style={{
        position: "absolute", top: 230, right: 80, left: 80,
        padding: "14px 24px", borderRadius: 14,
        background: `linear-gradient(90deg, ${tone}22, transparent)`,
        borderRight: `4px solid ${tone}`,
        fontSize: 22, color: "#e2f0ff", fontWeight: 500,
      }}>
        {section.caption}
      </div>

      {/* Modules grid */}
      <div style={{
        position: "absolute", top: 320, right: 80, left: 80,
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(section.modules.length, 4)}, 1fr)`,
        gap: 20,
      }}>
        {section.modules.map((m, i) => {
          const mEnter = spring({ frame: frame - 20 - i * 8, fps, config: { damping: 16, stiffness: 130 } });
          const MIcon = m.icon;
          return (
            <div key={i} style={{
              padding: 24, borderRadius: 20,
              background: "linear-gradient(180deg, rgba(10,20,40,0.85), rgba(4,8,20,0.7))",
              border: `1px solid ${tone}55`,
              boxShadow: `0 20px 50px -15px ${tone}44`,
              opacity: mEnter,
              transform: `translateY(${interpolate(mEnter, [0, 1], [20, 0])}px)`,
              minHeight: 200,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: `${tone}22`, border: `1px solid ${tone}88`,
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
              }}>
                <MIcon size={28} color={tone} strokeWidth={2} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 13, color: "#7892b4", letterSpacing: 1, direction: "ltr", textAlign: "right" }}>{m.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Metrics row at the bottom (if present) */}
      {section.metrics && (
        <div style={{
          position: "absolute", bottom: 130, right: 80, left: 80,
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
        }}>
          {section.metrics.map((mt, i) => {
            const mEnter = spring({ frame: frame - 60 - i * 6, fps, config: { damping: 18 } });
            return (
              <div key={i} style={{
                padding: 18, borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                opacity: mEnter,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ fontSize: 14, color: "#9bb6d6", fontWeight: 600 }}>{mt.l}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: tone, fontVariantNumeric: "tabular-nums", direction: "ltr" }}>{mt.v}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live status */}
      <div style={{
        position: "absolute", bottom: 70, right: 80,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 10px #34d399" }} />
        <div style={{ fontSize: 12, color: "#9bb6d6", letterSpacing: 3, direction: "ltr" }}>LIVE · SECURE · STREAMING</div>
      </div>
    </AbsoluteFill>
  );
};

export const Part3Video: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pulse = Math.sin((frame / durationInFrames) * Math.PI * 2) * 0.05 + 0.95;

  let acc = 0;
  return (
    <AbsoluteFill style={{ background: "#04060d", fontFamily: FONT, color: "#e2f0ff" }}>
      <TwinBackground />
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at center, transparent 35%, rgba(2,4,10,0.88) 100%)",
        opacity: pulse, pointerEvents: "none",
      }} />

      {SECTIONS.map((s, i) => {
        const from = acc;
        acc += s.duration;
        return (
          <Sequence key={s.key} from={from} durationInFrames={s.duration}>
            <SectionScene section={s} isFirst={i === 0} isLast={i === SECTIONS.length - 1} />
          </Sequence>
        );
      })}

      {/* Persistent badge bottom-left (since RTL feel) */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{ position: "absolute", bottom: 40, left: 50, display: "flex", alignItems: "center", gap: 14, opacity: 0.85 }}>
          <Img src={staticFile("images/nexus-icon.png")} style={{ width: 44, height: 44, borderRadius: 10 }} />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>NEXUS</div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#7fb8ff" }}>AI OPERATING SYSTEM · AR</div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
