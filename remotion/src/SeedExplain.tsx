import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Series } from "remotion";
import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";

const { fontFamily } = loadCairo("normal", { weights: ["400", "700", "900"], subsets: ["arabic", "latin"] });

export const SEED_FPS = 30;
const S = (sec: number) => Math.round(sec * SEED_FPS);

// scene durations
const D = { intro: 5, purpose: 5, orgSites: 6, sections: 6, hierarchy: 7, personnel: 5, safety: 5, outro: 4 };
export const SEED_DURATION = Object.values(D).reduce((a, b) => a + S(b), 0);

const CY = "#00D4FF";
const CY2 = "#3AE8FF";
const BG = "#061A2E";
const INK = "#EAF6FF";
const DIM = "#8FB6D6";
const GOLD = "#FBBF24";
const DANGER = "#F43F5E";

const Bg: React.FC = () => {
  const f = useCurrentFrame();
  const shift = (f / 6) % 100;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 20%, #0b2a48 0%, ${BG} 55%, #020814 100%)` }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.15 }}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d={`M 60 0 L 0 0 0 60`} fill="none" stroke={CY} strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" transform={`translate(${shift} 0)`} />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(180deg, transparent ${shift}%, rgba(0,212,255,0.08) ${shift + 2}%, transparent ${shift + 5}%)`,
        mixBlendMode: "screen", pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ t: string; hue?: string }> = ({ t, hue = CY }) => (
  <span style={{
    display: "inline-block", padding: "8px 18px", borderRadius: 999,
    background: `${hue}22`, border: `1px solid ${hue}66`, color: hue,
    fontSize: 18, fontWeight: 700, letterSpacing: 3,
  }}>{t}</span>
);

const SceneWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ direction: "rtl", fontFamily, color: INK, padding: 80 }}>{children}</AbsoluteFill>
);

// ── Scene 1: Intro ──
const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const s = spring({ frame: f, fps: SEED_FPS, config: { damping: 20 } });
  const scale = interpolate(s, [0, 1], [0.85, 1]);
  const fadeOut = interpolate(f, [S(D.intro) - 15, S(D.intro)], [1, 0], { extrapolateRight: "clamp" });
  return (
    <SceneWrap>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: fadeOut }}>
        <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
          <Chip t="NEXIOS AI OS · SEED PREVIEW" />
          <div style={{ fontSize: 96, fontWeight: 900, marginTop: 30, letterSpacing: -1, textShadow: `0 0 40px ${CY}55` }}>
            بذرة المحاكاة التنظيمية
          </div>
          <div style={{ fontSize: 34, marginTop: 18, color: DIM, letterSpacing: 4 }}>
            supabase / seed.sql · مُعاينة قبل التطبيق
          </div>
          <div style={{ marginTop: 40, width: interpolate(s, [0, 1], [0, 520]), height: 2, background: `linear-gradient(90deg, transparent, ${CY}, transparent)`, marginInline: "auto" }} />
        </div>
      </div>
    </SceneWrap>
  );
};

// ── Scene 2: Purpose ──
const Purpose: React.FC = () => {
  const f = useCurrentFrame();
  const items = [
    "محاكاة إدارة الأمن الصناعي بالمنطقة الغربية",
    "هرم تنظيمي: مدير ← مدراء ← مشرفون ← موظفون",
    "مؤسسة واحدة + ٣ مواقع + ٥ أقسام",
    "بيئة تطوير محلية فقط (لا تُطبَّق على الإنتاج)",
  ];
  return (
    <SceneWrap>
      <Chip t="GOAL · الغَرَض" />
      <div style={{ fontSize: 64, fontWeight: 900, marginTop: 24, maxWidth: 1400 }}>
        ماذا يفعل هذا الملف؟
      </div>
      <div style={{ marginTop: 60, display: "flex", flexDirection: "column", gap: 26, maxWidth: 1500 }}>
        {items.map((t, i) => {
          const en = spring({ frame: f - i * 12, fps: SEED_FPS, config: { damping: 22 } });
          return (
            <div key={i} style={{
              opacity: en, transform: `translateX(${interpolate(en, [0, 1], [40, 0])}px)`,
              fontSize: 38, fontWeight: 700, display: "flex", alignItems: "center", gap: 22,
            }}>
              <span style={{
                width: 14, height: 14, borderRadius: "50%", background: CY,
                boxShadow: `0 0 20px ${CY}, 0 0 8px ${CY2}`,
              }} />
              {t}
            </div>
          );
        })}
      </div>
    </SceneWrap>
  );
};

// ── Scene 3: Org + Sites ──
const OrgSites: React.FC = () => {
  const f = useCurrentFrame();
  const orgSpring = spring({ frame: f, fps: SEED_FPS, config: { damping: 20 } });
  const sites = [
    { code: "SEC-WR-HQ", ar: "المقر الرئيسي", en: "HQ — Western Region", sens: "critical", guards: 24, hue: DANGER },
    { code: "SEC-WR-SUB1", ar: "محطة التحويل الرئيسية", en: "Main Substation", sens: "high", guards: 12, hue: GOLD },
    { code: "SEC-WR-DEP1", ar: "مستودع المعدات الصناعية", en: "Industrial Equipment Depot", sens: "medium", guards: 8, hue: CY },
  ];
  return (
    <SceneWrap>
      <Chip t="SECTION A · المؤسسة والمواقع" />
      <div style={{
        marginTop: 28, opacity: orgSpring, transform: `scale(${interpolate(orgSpring, [0, 1], [0.9, 1])})`,
        padding: 28, borderRadius: 20, border: `1px solid ${CY}55`,
        background: `linear-gradient(180deg, ${CY}18, transparent)`,
        boxShadow: `0 20px 80px -20px ${CY}55`, maxWidth: 1500,
      }}>
        <div style={{ fontSize: 22, letterSpacing: 4, color: CY }}>ORGANIZATION</div>
        <div style={{ fontSize: 42, fontWeight: 900, marginTop: 8 }}>
          الشركة السعودية للكهرباء — الأمن الصناعي
        </div>
        <div style={{ fontSize: 22, color: DIM, marginTop: 8, direction: "ltr", textAlign: "right" }}>
          slug: sec-industrial-security · plan: enterprise · region: western
        </div>
      </div>

      <div style={{ marginTop: 34, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {sites.map((st, i) => {
          const en = spring({ frame: f - 18 - i * 10, fps: SEED_FPS, config: { damping: 22 } });
          return (
            <div key={i} style={{
              opacity: en, transform: `translateY(${interpolate(en, [0, 1], [30, 0])}px)`,
              padding: 22, borderRadius: 16, border: `1px solid ${st.hue}66`,
              background: `linear-gradient(180deg, ${st.hue}18, rgba(0,0,0,0.2))`,
            }}>
              <div style={{ fontFamily: "monospace", direction: "ltr", fontSize: 16, color: st.hue, letterSpacing: 2 }}>{st.code}</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{st.ar}</div>
              <div style={{ fontSize: 16, color: DIM, marginTop: 4, direction: "ltr", textAlign: "right" }}>{st.en}</div>
              <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, padding: "4px 10px", borderRadius: 8, background: `${st.hue}22`, color: st.hue, fontWeight: 700, letterSpacing: 2 }}>{st.sens.toUpperCase()}</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: INK }}>{st.guards} <span style={{ fontSize: 14, color: DIM, fontWeight: 400 }}>حارس</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </SceneWrap>
  );
};

// ── Scene 4: Sections ──
const Sections: React.FC = () => {
  const f = useCurrentFrame();
  const rows = [
    ["DEPT-OPS", "قسم التشغيل الأمني", "Security Operations", 6],
    ["DEPT-CCTV", "قسم المراقبة والكاميرات", "Surveillance & CCTV", 5],
    ["DEPT-ERT", "قسم الاستجابة للطوارئ", "Emergency Response", 5],
    ["DEPT-PATROL", "قسم الدوريات الميدانية", "Field Patrols", 4],
    ["DEPT-GOV", "قسم التحكم والحوكمة", "Control & Governance", 3],
  ] as const;
  return (
    <SceneWrap>
      <Chip t="SECTIONS · الأقسام الخمسة" />
      <div style={{ fontSize: 56, fontWeight: 900, marginTop: 20 }}>٥ أقسام تشغيلية</div>
      <div style={{
        marginTop: 40, borderRadius: 18, border: `1px solid ${CY}33`,
        background: "rgba(6,26,46,0.65)", overflow: "hidden",
      }}>
        {rows.map((r, i) => {
          const en = spring({ frame: f - i * 8, fps: SEED_FPS, config: { damping: 22 } });
          return (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "220px 1fr 1fr 120px",
              alignItems: "center", gap: 20, padding: "20px 26px",
              borderTop: i === 0 ? "none" : `1px solid ${CY}22`,
              opacity: en, background: i % 2 ? "rgba(0,212,255,0.03)" : "transparent",
            }}>
              <span style={{ fontFamily: "monospace", direction: "ltr", fontSize: 18, color: CY, letterSpacing: 2 }}>{r[0]}</span>
              <span style={{ fontSize: 28, fontWeight: 800 }}>{r[1]}</span>
              <span style={{ fontSize: 20, color: DIM, direction: "ltr", textAlign: "right" }}>{r[2]}</span>
              <span style={{ fontSize: 26, fontWeight: 900, color: GOLD, textAlign: "left" }}>{r[3]}<span style={{ fontSize: 14, color: DIM, marginInlineStart: 6 }}>موظف</span></span>
            </div>
          );
        })}
      </div>
    </SceneWrap>
  );
};

// ── Scene 5: Hierarchy ──
const Hierarchy: React.FC = () => {
  const f = useCurrentFrame();
  const tiers = [
    { count: 1, label: "مدير الإدارة", role: "admin / admin", hue: DANGER },
    { count: 3, label: "المدراء", role: "manager / manager", hue: GOLD },
    { count: 4, label: "المشرفون", role: "member / operator", hue: CY2 },
    { count: 6, label: "الموظفون", role: "member / viewer", hue: CY },
  ];
  return (
    <SceneWrap>
      <Chip t="HIERARCHY · الهرم التنظيمي والصلاحيات" />
      <div style={{ fontSize: 52, fontWeight: 900, marginTop: 18 }}>١٤ حسابًا · ٤ مستويات</div>
      <div style={{ marginTop: 50, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        {tiers.map((t, i) => {
          const en = spring({ frame: f - i * 14, fps: SEED_FPS, config: { damping: 20 } });
          const width = interpolate(en, [0, 1], [0, 400 + i * 180]);
          return (
            <div key={i} style={{
              width, height: 84, borderRadius: 14,
              background: `linear-gradient(90deg, ${t.hue}44, ${t.hue}18)`,
              border: `1px solid ${t.hue}88`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 28px", opacity: en,
              boxShadow: `0 10px 40px -10px ${t.hue}88`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <span style={{
                  width: 54, height: 54, borderRadius: 12,
                  background: t.hue, color: BG,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26, fontWeight: 900,
                }}>{t.count}</span>
                <span style={{ fontSize: 28, fontWeight: 800 }}>{t.label}</span>
              </div>
              <span style={{ fontFamily: "monospace", direction: "ltr", fontSize: 16, color: INK, opacity: 0.85, letterSpacing: 2 }}>
                {t.role}
              </span>
            </div>
          );
        })}
      </div>
    </SceneWrap>
  );
};

// ── Scene 6: Personnel emails ──
const Personnel: React.FC = () => {
  const f = useCurrentFrame();
  const groups = [
    ["director@sec.demo"],
    ["ops.mgr@sec.demo", "cctv.mgr@sec.demo", "ert.mgr@sec.demo"],
    ["sup.shiftA@sec.demo", "sup.shiftB@sec.demo", "sup.cctv@sec.demo", "sup.patrol@sec.demo"],
    ["guard1@sec.demo", "guard2@sec.demo", "operator1@sec.demo", "operator2@sec.demo", "tech1@sec.demo", "tech2@sec.demo"],
  ];
  const hues = [DANGER, GOLD, CY2, CY];
  const labels = ["مدير", "مدراء", "مشرفون", "موظفون"];
  return (
    <SceneWrap>
      <Chip t="ACCOUNTS · حسابات auth.users التجريبية" />
      <div style={{ fontSize: 46, fontWeight: 900, marginTop: 18 }}>١٤ بريدًا · كلمة مرور موحّدة</div>
      <div style={{ marginTop: 36, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {groups.map((g, i) => {
          const en = spring({ frame: f - i * 10, fps: SEED_FPS, config: { damping: 22 } });
          return (
            <div key={i} style={{
              opacity: en, transform: `translateY(${interpolate(en, [0, 1], [20, 0])}px)`,
              padding: 20, borderRadius: 14, border: `1px solid ${hues[i]}66`,
              background: `linear-gradient(180deg, ${hues[i]}18, rgba(0,0,0,0.25))`,
              minHeight: 320,
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: hues[i] }}>{labels[i]}</div>
              <div style={{ fontSize: 14, color: DIM, marginTop: 2, letterSpacing: 2 }}>× {g.length}</div>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {g.map((em, j) => (
                  <div key={j} style={{
                    fontFamily: "monospace", direction: "ltr", textAlign: "left",
                    fontSize: 15, color: INK, padding: "6px 10px",
                    background: "rgba(0,0,0,0.35)", borderRadius: 6,
                    border: `1px solid ${hues[i]}22`,
                  }}>{em}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SceneWrap>
  );
};

// ── Scene 7: Safety ──
const Safety: React.FC = () => {
  const f = useCurrentFrame();
  const items = [
    { hue: "#34D399", t: "القسم (أ) — مؤسسة/مواقع/أقسام: آمن و idempotent" },
    { hue: DANGER, t: "القسم (ب) — يُنشئ auth.users: تطوير محلي فقط" },
    { hue: GOLD, t: "كلمة المرور التجريبية: Nexios#Demo2026 — غيّرها/احذفها" },
    { hue: CY, t: "التشغيل: supabase db reset (لا يُطبَّق عبر db push)" },
  ];
  return (
    <SceneWrap>
      <Chip t="SAFETY · قبل التطبيق" hue={DANGER} />
      <div style={{ fontSize: 60, fontWeight: 900, marginTop: 18 }}>⚠️ اقرأ قبل التنفيذ</div>
      <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 20 }}>
        {items.map((it, i) => {
          const en = spring({ frame: f - i * 10, fps: SEED_FPS, config: { damping: 22 } });
          return (
            <div key={i} style={{
              opacity: en, transform: `translateX(${interpolate(en, [0, 1], [40, 0])}px)`,
              padding: "22px 26px", borderRadius: 14,
              background: `linear-gradient(90deg, ${it.hue}22, transparent)`,
              border: `1px solid ${it.hue}77`, display: "flex", alignItems: "center", gap: 20,
            }}>
              <span style={{ width: 10, height: 44, background: it.hue, borderRadius: 4, boxShadow: `0 0 20px ${it.hue}` }} />
              <span style={{ fontSize: 32, fontWeight: 700 }}>{it.t}</span>
            </div>
          );
        })}
      </div>
    </SceneWrap>
  );
};

// ── Scene 8: Outro ──
const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const s = spring({ frame: f, fps: SEED_FPS, config: { damping: 22 } });
  return (
    <SceneWrap>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Chip t="READY TO APPLY?" hue={CY} />
        <div style={{ fontSize: 84, fontWeight: 900, marginTop: 24, textShadow: `0 0 40px ${CY}66`, textAlign: "center", transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})` }}>
          ١ إدارة · ٣ مواقع · ٥ أقسام · ١٤ حسابًا
        </div>
        <div style={{ marginTop: 22, fontSize: 26, color: DIM, letterSpacing: 4 }}>
          راجع · طبّق محليًا · بدّل كلمة المرور
        </div>
        <div style={{ marginTop: 40, width: interpolate(s, [0, 1], [0, 640]), height: 2, background: `linear-gradient(90deg, transparent, ${CY}, transparent)` }} />
      </div>
    </SceneWrap>
  );
};

export const SeedExplain: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Bg />
      <Series>
        <Series.Sequence durationInFrames={S(D.intro)}><Intro /></Series.Sequence>
        <Series.Sequence durationInFrames={S(D.purpose)}><Purpose /></Series.Sequence>
        <Series.Sequence durationInFrames={S(D.orgSites)}><OrgSites /></Series.Sequence>
        <Series.Sequence durationInFrames={S(D.sections)}><Sections /></Series.Sequence>
        <Series.Sequence durationInFrames={S(D.hierarchy)}><Hierarchy /></Series.Sequence>
        <Series.Sequence durationInFrames={S(D.personnel)}><Personnel /></Series.Sequence>
        <Series.Sequence durationInFrames={S(D.safety)}><Safety /></Series.Sequence>
        <Series.Sequence durationInFrames={S(D.outro)}><Outro /></Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
