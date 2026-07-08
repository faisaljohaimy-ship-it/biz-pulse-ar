import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import {
  LayoutDashboard,
  Brain,
  Gavel,
  ShieldAlert,
  Workflow,
  Boxes,
  GitBranch,
  Users,
  Database,
  Store,
  Bot,
  Activity,
  MousePointer2,
} from "lucide-react";

const NODES = [
  {
    id: "cockpit",
    label: "قمرة القيادة",
    meta: "مؤشرات حية",
    icon: LayoutDashboard,
    x: 50,
    y: 18,
    hue: "#22d3ee",
  },
  {
    id: "intel",
    label: "الذكاء الاصطناعي",
    meta: "٤٢٠٠ إشارة",
    icon: Brain,
    x: 22,
    y: 30,
    hue: "#a78bfa",
  },
  {
    id: "board",
    label: "قرارات المجلس",
    meta: "٣٢ قرار نشط",
    icon: Gavel,
    x: 78,
    y: 30,
    hue: "#f0abfc",
  },
  {
    id: "risk",
    label: "المخاطر والصلابة",
    meta: "كل الأنظمة آمنة",
    icon: ShieldAlert,
    x: 12,
    y: 55,
    hue: "#fbbf24",
  },
  {
    id: "exec",
    label: "محرك التنفيذ",
    meta: "٨٦ سير عمل",
    icon: Workflow,
    x: 88,
    y: 55,
    hue: "#34d399",
  },
  {
    id: "twin",
    label: "التوأم الرقمي",
    meta: "ثلاثي الأبعاد",
    icon: Boxes,
    x: 50,
    y: 52,
    hue: "#7fb8ff",
  },
  {
    id: "int",
    label: "التكاملات",
    meta: "١٨ ربط فعّال",
    icon: GitBranch,
    x: 22,
    y: 78,
    hue: "#67e8f9",
  },
  {
    id: "agents",
    label: "وكلاء الذكاء",
    meta: "٤٨ وكيل نشط",
    icon: Bot,
    x: 78,
    y: 78,
    hue: "#34d399",
  },
  {
    id: "admin",
    label: "الإدارة والصلاحيات",
    meta: "أدوار وSSO",
    icon: Users,
    x: 38,
    y: 90,
    hue: "#94a3b8",
  },
  {
    id: "data",
    label: "بحيرة البيانات",
    meta: "١٫٤ تيرا",
    icon: Database,
    x: 62,
    y: 90,
    hue: "#22d3ee",
  },
  { id: "market", label: "المتجر", meta: "١٢٠ وحدة", icon: Store, x: 50, y: 70, hue: "#f43f5e" },
];

const KPIS: Record<string, Array<{ l: string; v: string; d: string }>> = {
  cockpit: [
    { l: "النجم الشمالي", v: "+١٨٪", d: "ربع/ربع" },
    { l: "الأرباح", v: "٤٢م$", d: "+٦٪" },
    { l: "الرضا", v: "٧٢", d: "+٤" },
  ],
  intel: [
    { l: "إشارات/س", v: "٣٤٠", d: "+٢٢٪" },
    { l: "الثقة", v: "٩٤٪", d: "+٢" },
    { l: "النماذج", v: "١٢", d: "+١" },
  ],
  board: [
    { l: "القرارات", v: "٣٢", d: "مفتوحة" },
    { l: "معتمدة", v: "٢١", d: "+٥" },
    { l: "متوسط الدورة", v: "٣٫٤ يوم", d: "-١٫٢" },
  ],
  risk: [
    { l: "النتائج", v: "٠ حرج", d: "نظيف" },
    { l: "التغطية", v: "٩٨٪", d: "+١" },
    { l: "زمن الاستجابة", v: "١١د", d: "-٣د" },
  ],
  exec: [
    { l: "السيناريوهات", v: "٨٦", d: "+٩" },
    { l: "آلي", v: "٩٢٪", d: "+٤" },
    { l: "ساعات/أسبوع", v: "٣٤٠", d: "+٢٢٪" },
  ],
  twin: [
    { l: "العقد", v: "١١", d: "حية" },
    { l: "الكمون", v: "٤٢مث", d: "-٦" },
    { l: "العرض", v: "٦٠ إطار", d: "ثابت" },
  ],
  int: [
    { l: "الروابط", v: "١٨/٢٠", d: "+٢" },
    { l: "الأخطاء", v: "١٫٣٪", d: "+٠٫٤" },
    { l: "المزامنة", v: "٨٤٢ك/يوم", d: "+١١٪" },
  ],
  agents: [
    { l: "مهام/س", v: "١٫٢ك", d: "+١٨٪" },
    { l: "النجاح", v: "٩٧٫٤٪", d: "+٠٫٦" },
    { l: "تكلفة/مهمة", v: "٠٫٠٤$", d: "-١٢٪" },
  ],
  admin: [
    { l: "الأدوار", v: "١٤", d: "صلاحيات" },
    { l: "SSO", v: "SAML", d: "متصل" },
    { l: "التدقيق", v: "١٢/١٢", d: "ناجح" },
  ],
  data: [
    { l: "الحجم", v: "١٫٤ تيرا", d: "+٨٠ جيجا" },
    { l: "الجودة", v: "٩٨٫٢٪", d: "+٠٫٣" },
    { l: "النَسَب", v: "١٠٠٪", d: "متتبع" },
  ],
  market: [
    { l: "الوحدات", v: "١٢٠", d: "+١٢" },
    { l: "مثبتة", v: "٣٤", d: "+٣" },
    { l: "الناشرون", v: "٢٦", d: "+٢" },
  ],
};

const BEAT = 95;
const BEATS = [0, 1, 2, 5, 3, 4, 7, 6, 10, 8, 9];
export const PART6_ORBIT_DURATION = BEAT * BEATS.length;

export const Part6OrbitSceneAR: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const stageRight = 360,
    stageTop = 110;
  const stageWidth = width - stageRight - 60;
  const stageHeight = height - stageTop - 90;
  const stageLeft = 60;

  const beatIdx = Math.min(BEATS.length - 1, Math.floor(frame / BEAT));
  const localFrame = frame - beatIdx * BEAT;
  const target = NODES[BEATS[beatIdx]];
  const prev = NODES[BEATS[Math.max(0, beatIdx - 1)]];

  const travel = interpolate(localFrame, [0, 32], [0, 1], { extrapolateRight: "clamp" });
  const eased = 1 - Math.pow(1 - travel, 3);
  const px = (prev.x + (target.x - prev.x) * eased) / 100;
  const py = (prev.y + (target.y - prev.y) * eased) / 100;
  const cursorX = stageLeft + px * stageWidth;
  const cursorY = stageTop + py * stageHeight;

  const clickT = interpolate(localFrame, [34, 56], [0, 1], { extrapolateRight: "clamp" });
  const clickPulse = Math.sin(clickT * Math.PI);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: stageLeft,
          top: stageTop,
          width: stageWidth,
          height: stageHeight,
          borderRadius: 28,
          border: "1px solid rgba(34,211,238,0.18)",
          background: "linear-gradient(180deg, rgba(8,16,32,0.55), rgba(4,8,18,0.35))",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.04), 0 40px 100px -30px rgba(34,211,238,0.25)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 18,
            right: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
            direction: "rtl",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: "#34d399",
              boxShadow: "0 0 10px #34d399",
            }}
          />
          <span style={{ fontSize: 12, letterSpacing: 1, color: "#9bb6d6" }}>
            نكسوس · جولة النظام الكاملة · مباشر
          </span>
        </div>

        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {[20, 32, 44].map((r) => (
            <ellipse
              key={r}
              cx={50}
              cy={54}
              rx={r * 1.4}
              ry={r * 0.55}
              fill="none"
              stroke="rgba(34,211,238,0.16)"
              strokeWidth={0.1}
              strokeDasharray="0.5 1"
            />
          ))}
          {NODES.map((n) => {
            if (NODES[BEATS[beatIdx]].id === n.id) return null;
            const op = 0.06 + clickPulse * 0.22;
            return (
              <line
                key={n.id}
                x1={target.x}
                y1={target.y}
                x2={n.x}
                y2={n.y}
                stroke={target.hue}
                strokeOpacity={op}
                strokeWidth={0.13}
              />
            );
          })}
        </svg>

        {NODES.map((n, i) => {
          const active = n.id === target.id;
          const Icon = n.icon;
          const enter = spring({ frame: frame - i * 3, fps, config: { damping: 18 } });
          const scale = (active ? 1.14 + clickPulse * 0.08 : 1) * enter;
          const halo = active ? 0.6 + clickPulse * 0.4 : 0.12;
          return (
            <div
              key={n.id}
              style={{
                position: "absolute",
                left: `${n.x}%`,
                top: `${n.y}%`,
                transform: `translate(-50%, -50%) scale(${scale})`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: -22,
                  borderRadius: 28,
                  background: `radial-gradient(circle, ${n.hue}55, transparent 70%)`,
                  opacity: halo,
                  filter: "blur(10px)",
                }}
              />
              <div
                style={{
                  position: "relative",
                  width: 148,
                  padding: "12px 14px",
                  borderRadius: 18,
                  direction: "rtl",
                  background: active
                    ? `linear-gradient(180deg, ${n.hue}33, rgba(8,16,32,0.85))`
                    : "linear-gradient(180deg, rgba(20,32,55,0.85), rgba(8,16,32,0.75))",
                  border: `1px solid ${active ? n.hue : "rgba(120,180,255,0.18)"}`,
                  boxShadow: active
                    ? `0 20px 50px -15px ${n.hue}99, inset 0 1px 0 rgba(255,255,255,0.08)`
                    : "0 10px 30px -10px rgba(0,0,0,0.5)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      background: `${n.hue}33`,
                      border: `1px solid ${n.hue}88`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={15} color={n.hue} strokeWidth={2.2} />
                  </div>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      marginInlineStart: "auto",
                      background: "#34d399",
                      boxShadow: "0 0 8px #34d399",
                    }}
                  />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginTop: 9 }}>
                  {n.label}
                </div>
                <div style={{ fontSize: 10.5, color: "#9bb6d6", marginTop: 2 }}>{n.meta}</div>
              </div>
            </div>
          );
        })}

        <DrillDrawer node={target} kpis={KPIS[target.id]} localFrame={localFrame} />
      </div>

      <RightRail activeKey={target.id} />
      <TopBar route={`/${target.id}`} label={target.label} />

      <div
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          pointerEvents: "none",
          transform: "translate(-6px, -4px)",
          filter: "drop-shadow(0 4px 12px rgba(34,211,238,0.7))",
        }}
      >
        <MousePointer2 size={28} color="#fff" strokeWidth={1.5} fill="rgba(34,211,238,0.9)" />
        {clickPulse > 0 && (
          <div
            style={{
              position: "absolute",
              left: -20,
              top: -20,
              width: 40 + clickPulse * 60,
              height: 40 + clickPulse * 60,
              borderRadius: "50%",
              border: `2px solid ${target.hue}`,
              opacity: 1 - clickPulse,
              transform: "translate(-50%, -50%)",
              marginLeft: 8,
              marginTop: 6,
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};

const RightRail: React.FC<{ activeKey: string }> = ({ activeKey }) => {
  const items = NODES.map((n) => ({ k: n.id, l: n.label, i: n.icon, hue: n.hue }));
  return (
    <div
      style={{
        position: "absolute",
        top: 110,
        right: 60,
        width: 280,
        padding: 18,
        borderRadius: 24,
        direction: "rtl",
        background: "linear-gradient(180deg, rgba(10,18,36,0.7), rgba(4,8,18,0.4))",
        border: "1px solid rgba(120,180,255,0.12)",
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 2, color: "#7fb8ff", marginBottom: 12 }}>
        خريطة النظام
      </div>
      {items.map((it) => {
        const active = it.k === activeKey;
        const Icon = it.i;
        return (
          <div
            key={it.k}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              marginBottom: 4,
              borderRadius: 10,
              background: active
                ? `linear-gradient(270deg, ${it.hue}22, transparent)`
                : "transparent",
              border: `1px solid ${active ? it.hue + "66" : "transparent"}`,
              transform: active ? "translateX(-6px)" : "translateX(0)",
            }}
          >
            <Icon size={14} color={active ? it.hue : "#7892b4"} strokeWidth={2} />
            <div
              style={{
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? "#fff" : "#8aa4c4",
              }}
            >
              {it.l}
            </div>
            {active && (
              <div
                style={{
                  marginInlineStart: "auto",
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: it.hue,
                  boxShadow: `0 0 8px ${it.hue}`,
                }}
              />
            )}
          </div>
        );
      })}
      <div
        style={{
          marginTop: 12,
          padding: "10px 12px",
          borderRadius: 10,
          background: "rgba(167,139,250,0.08)",
          border: "1px solid rgba(167,139,250,0.25)",
          fontSize: 11,
          color: "#c7b6ff",
        }}
      >
        ⌘K · افتح لوحة الأوامر
      </div>
    </div>
  );
};

const TopBar: React.FC<{ route: string; label: string }> = ({ route, label }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame % BEAT, [0, 10, 85, BEAT], [0.4, 1, 1, 0.4]);
  return (
    <div
      style={{
        position: "absolute",
        top: 50,
        left: 60,
        right: 360,
        display: "flex",
        alignItems: "center",
        gap: 14,
        direction: "rtl",
      }}
    >
      <div style={{ fontSize: 11, color: "#5a7494", letterSpacing: 2 }}>جولة كاملة · مباشر</div>
      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 14, color: "#9bb6d6", opacity: op }}>← {label}</div>
      <div
        style={{
          padding: "6px 14px",
          borderRadius: 999,
          background: "rgba(34,211,238,0.1)",
          border: "1px solid rgba(34,211,238,0.3)",
          fontSize: 12,
          color: "#7fb8ff",
          letterSpacing: 1,
          fontFamily: "monospace",
          opacity: op,
          direction: "ltr",
        }}
      >
        nexus://app{route}
      </div>
    </div>
  );
};

const DrillDrawer: React.FC<{
  node: (typeof NODES)[number];
  kpis: (typeof KPIS)[string];
  localFrame: number;
}> = ({ node, kpis, localFrame }) => {
  const fps = 30;
  const enter = spring({ frame: localFrame - 28, fps, config: { damping: 20, stiffness: 140 } });
  const Icon = node.icon;
  const onRightSide = node.x < 50;
  return (
    <div
      style={{
        position: "absolute",
        [onRightSide ? "right" : "left"]: 30,
        top: 90,
        width: 380,
        direction: "rtl",
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [20, 0])}px)`,
        padding: 22,
        borderRadius: 20,
        background: "linear-gradient(180deg, rgba(10,20,40,0.92), rgba(4,8,18,0.85))",
        border: `1px solid ${node.hue}66`,
        boxShadow: `0 30px 80px -20px ${node.hue}88`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `${node.hue}33`,
            border: `1px solid ${node.hue}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={22} color={node.hue} strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{node.label}</div>
          <div style={{ fontSize: 11, color: "#9bb6d6", marginTop: 2 }}>{node.meta}</div>
        </div>
      </div>
      {kpis.map((k, i) => {
        const e = spring({ frame: localFrame - 38 - i * 6, fps, config: { damping: 18 } });
        return (
          <div
            key={k.l}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: 10,
              marginBottom: 6,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              opacity: e,
              transform: `translateX(${interpolate(e, [0, 1], [-12, 0])}px)`,
            }}
          >
            <div style={{ fontSize: 12, color: "#9bb6d6" }}>{k.l}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 11, color: "#34d399" }}>{k.d}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: node.hue }}>{k.v}</div>
            </div>
          </div>
        );
      })}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderRadius: 10,
          background: `${node.hue}1a`,
          border: `1px solid ${node.hue}44`,
          fontSize: 12,
          color: node.hue,
          fontWeight: 700,
        }}
      >
        <Activity size={14} />
        <span>افتح الوحدة</span>
      </div>
    </div>
  );
};
