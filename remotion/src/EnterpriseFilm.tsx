import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import efDur from "../public/audio/ef-durations.json";
import efEn from "../public/audio/ef-en.json";
import dxDur from "../public/audio/dx-durations.json";

export const FILM_FPS = 30;
const PAD = 0.3;

const cairo = `'Cairo','Tajawal','Noto Sans Arabic',sans-serif`;
const inter = `'Inter','SF Pro Display',sans-serif`;

type Seg = {
  audio: string;          // file under audio/
  dur: number;            // seconds
  image: string;          // file under public/
  ar: string;
  en: string;
  section: string;        // PART label
  caption: string;        // short scene caption EN
  kind: "scene" | "product";
};

// Arabic lines (mirror gen-film-narration.mjs)
const AR_EF = [
  "في عالمٍ تُدار فيه المؤسسات بسرعة البيانات. القرار التالي يصنع المستقبل.",
  "غرفُ القيادة الكبرى. بنوكٌ، حكومات، طاقة، مطارات. آلاف الإشارات في كل ثانية، وقرارٌ واحد لا يحتمل الخطأ.",
  "نِكسيوس. نظام التشغيل الذكي للمؤسسات. ليس فكرة، ليس عرضاً تقديمياً، بل منصة جاهزة للتشغيل.",
  "الرئيس التنفيذي يرى مؤسسته بالكامل في شاشة واحدة. مدير المعلومات يراقب الأداء لحظياً. مسؤول الأمن السيبراني يتلقى التنبيهات قبل وقوع الحدث.",
  "محرك الذكاء يجمع البيانات، يكشف الأنماط، يقيس المخاطر، ويولّد التوصية المدعومة بالأدلة. من البيانات إلى القرار في ثوانٍ.",
  "تكاملٌ أصيل مع ساب، ومايكروسوفت، وأوراكل، وسيلز فورس، وسيرفس ناو، ومستودعات البيانات. تدفقٌ آمن، حوكمةٌ كاملة، وسجلُ تدقيقٍ لكل حركة.",
  "خفضٌ ملموس في التكاليف. تسريعٌ في القرار. ارتفاعٌ في الإنتاجية. حوكمةٌ تنفيذية شاملة. وامتثالٌ مستمر للمعايير الدولية والوطنية.",
  "في قاعة مجلس الإدارة، تتحول الأرقام إلى استراتيجية، والاستراتيجية إلى تنفيذ، والتنفيذ إلى أثرٍ يُقاس.",
  "نِكسيوس. جاهزٌ للحكومات. جاهزٌ للبنوك. جاهزٌ للمؤسسات. جاهزٌ للاستحواذ. نظام تشغيل المؤسسة القادمة.",
];

// Arabic for product walkthrough (mirror gen-demo-narration.mjs dx-01..dx-11)
const AR_DX_PROD = [
  "يبدأ المستخدم بتسجيل دخول آمن موحد. هوية واحدة. صلاحيات مدققة. وصول لحظي.",
  "قمرة القيادة التنفيذية. مؤشرات صحة المؤسسة، التنبيهات الحرجة، والمهام المفتوحة، في شاشة واحدة.",
  "محرك الذكاء يجمع الإشارات من كل النظم، يحلل الأنماط، ويولد رؤى استراتيجية فورية.",
  "مركز القرارات. توصيات مدعومة بالذكاء الاصطناعي، مع درجة ثقة، وأثر مالي، ومالك تنفيذي لكل قرار.",
  "مركز المخاطر يرصد المخاطر التشغيلية والمالية والامتثالية، ويصنفها حسب الأثر والاحتمالية.",
  "مركز قيادة التكاملات. ربط حي مع SAP و Microsoft 365 و Outlook و Teams و SharePoint.",
  "وكلاء ذاتيون مستقلون. وكيل المالية، ووكيل المخاطر، ووكيل المبيعات، يعملون على مدار الساعة.",
  "تدفق البيانات يصل من مصادر المؤسسة إلى نواة نِكسيوس، حيث يُحلَّل ويُحوَّل إلى قرارات وتقارير وأتمتة.",
  "حوكمة كاملة. سياسات، ومراجعة، وضوابط أمن سيبراني، مع توافق ISO و SOC و NCA.",
  "تحليلات تنفيذية. تقارير لحظية، ومؤشرات أداء، ومقارنات تاريخية.",
  "الموجز التنفيذي. تقرير ذكي يولَّد تلقائياً، جاهز للمدير التنفيذي والمستثمر والجهة الحكومية.",
];
const EN_DX_PROD = [
  "Unified secure sign-in. One identity. Audited permissions. Real-time access.",
  "Executive Cockpit. Enterprise health, critical alerts, and open tasks — on one screen.",
  "The Intelligence Engine ingests signals from every system, detects patterns, and surfaces instant strategic insight.",
  "Decision Center. AI-backed recommendations with confidence score, financial impact, and an accountable owner.",
  "Risk Center monitors operational, financial, and compliance risks — ranked by impact and likelihood.",
  "Integration Command. Live links to SAP, Microsoft 365, Outlook, Teams, SharePoint.",
  "Autonomous agents. Finance agent, Risk agent, Sales agent — running 24×7.",
  "Data flows from enterprise sources into the NEEXIOS core — analyzed and turned into decisions, reports, and automation.",
  "Full governance. Policies, audit, and cyber controls — ISO, SOC, and NCA aligned.",
  "Executive analytics. Real-time reports, KPIs, and historical comparisons.",
  "The Executive Brief. An AI-generated report ready for the CEO, the investor, and the regulator.",
];

const SEGS: Seg[] = [
  // PART 1 — Executive Opening
  { audio: "audio/ef-00.mp3", dur: efDur[0], image: "film/06-skyline.jpg", ar: AR_EF[0], en: efEn[0], section: "PART 01 · EXECUTIVE OPENING", caption: "The world runs on data", kind: "scene" },
  { audio: "audio/ef-01.mp3", dur: efDur[1], image: "film/01-command-center.jpg", ar: AR_EF[1], en: efEn[1], section: "PART 01 · EXECUTIVE OPENING", caption: "Command at scale", kind: "scene" },
  { audio: "audio/ef-02.mp3", dur: efDur[2], image: "tour/02-cockpit.png", ar: AR_EF[2], en: efEn[2], section: "PART 02 · THE PLATFORM", caption: "NEEXIOS — Enterprise AI OS", kind: "product" },

  // PART 2 — Real product walkthrough (11 scenes)
  { audio: "audio/dx-01.mp3", dur: dxDur[1], image: "tour/01-login.png",        ar: AR_DX_PROD[0],  en: EN_DX_PROD[0],  section: "PART 02 · PRODUCT WALKTHROUGH", caption: "Secure Sign-In",         kind: "product" },
  { audio: "audio/dx-02.mp3", dur: dxDur[2], image: "tour/02-cockpit.png",      ar: AR_DX_PROD[1],  en: EN_DX_PROD[1],  section: "PART 02 · PRODUCT WALKTHROUGH", caption: "Executive Cockpit",     kind: "product" },
  { audio: "audio/dx-03.mp3", dur: dxDur[3], image: "tour/03-intelligence.png", ar: AR_DX_PROD[2],  en: EN_DX_PROD[2],  section: "PART 02 · PRODUCT WALKTHROUGH", caption: "Intelligence Engine",  kind: "product" },
  { audio: "audio/dx-04.mp3", dur: dxDur[4], image: "tour/04-decisions.png",    ar: AR_DX_PROD[3],  en: EN_DX_PROD[3],  section: "PART 02 · PRODUCT WALKTHROUGH", caption: "Decision Center",      kind: "product" },
  { audio: "audio/dx-05.mp3", dur: dxDur[5], image: "tour/05-risk.png",         ar: AR_DX_PROD[4],  en: EN_DX_PROD[4],  section: "PART 02 · PRODUCT WALKTHROUGH", caption: "Risk Center",          kind: "product" },
  { audio: "audio/dx-06.mp3", dur: dxDur[6], image: "tour/06-integrations.png", ar: AR_DX_PROD[5],  en: EN_DX_PROD[5],  section: "PART 02 · PRODUCT WALKTHROUGH", caption: "Integration Command",  kind: "product" },
  { audio: "audio/dx-08.mp3", dur: dxDur[8], image: "tour/07-agents.png",       ar: AR_DX_PROD[6],  en: EN_DX_PROD[6],  section: "PART 02 · PRODUCT WALKTHROUGH", caption: "Autonomous Agents",    kind: "product" },
  { audio: "audio/dx-07.mp3", dur: dxDur[7], image: "tour/08-boardroom.png",    ar: AR_DX_PROD[7],  en: EN_DX_PROD[7],  section: "PART 02 · PRODUCT WALKTHROUGH", caption: "Data Architecture",    kind: "product" },
  { audio: "audio/dx-09.mp3", dur: dxDur[9], image: "tour/09-governance.png",   ar: AR_DX_PROD[8],  en: EN_DX_PROD[8],  section: "PART 02 · PRODUCT WALKTHROUGH", caption: "Governance",           kind: "product" },
  { audio: "audio/dx-10.mp3", dur: dxDur[10],image: "tour/10-analytics.png",    ar: AR_DX_PROD[9],  en: EN_DX_PROD[9],  section: "PART 02 · PRODUCT WALKTHROUGH", caption: "Analytics",            kind: "product" },
  { audio: "audio/dx-11.mp3", dur: dxDur[11],image: "tour/11-briefing.png",     ar: AR_DX_PROD[10], en: EN_DX_PROD[10], section: "PART 02 · PRODUCT WALKTHROUGH", caption: "Executive Brief",      kind: "product" },

  // PART 3 — Humans
  { audio: "audio/ef-03.mp3", dur: efDur[3], image: "film/02-ceo.jpg",     ar: AR_EF[3], en: efEn[3], section: "PART 03 · LEADERS IN ACTION", caption: "CEO · CIO · CISO · Analyst", kind: "scene" },

  // PART 4 — AI in action
  { audio: "audio/ef-04.mp3", dur: efDur[4], image: "film/03-soc.jpg",     ar: AR_EF[4], en: efEn[4], section: "PART 04 · AI IN ACTION",       caption: "Data → Pattern → Risk → Decision", kind: "scene" },

  // PART 5 — Integrations (architecture diagram scene)
  { audio: "audio/ef-05.mp3", dur: efDur[5], image: "film/05-analyst.jpg", ar: AR_EF[5], en: efEn[5], section: "PART 05 · ENTERPRISE INTEGRATIONS", caption: "Native to your stack",    kind: "scene" },

  // PART 6 — Business impact
  { audio: "audio/ef-06.mp3", dur: efDur[6], image: "film/07-gov.jpg",     ar: AR_EF[6], en: efEn[6], section: "PART 06 · MEASURABLE IMPACT",  caption: "Faster · Cheaper · Compliant", kind: "scene" },

  // PART 7 — Boardroom
  { audio: "audio/ef-07.mp3", dur: efDur[7], image: "film/04-boardroom.jpg", ar: AR_EF[7], en: efEn[7], section: "PART 07 · THE BOARDROOM",    caption: "Numbers become strategy",    kind: "scene" },

  // Closing
  { audio: "audio/ef-08.mp3", dur: efDur[8], image: "film/01-command-center.jpg", ar: AR_EF[8], en: efEn[8], section: "NEEXIOS · neexios.com",   caption: "Ready for deployment",     kind: "scene" },
];

const SEG_FRAMES = SEGS.map((s) => Math.round((s.dur + PAD) * FILM_FPS));
const STARTS: number[] = SEG_FRAMES.reduce<number[]>((a, _, i) => { a.push(i === 0 ? 0 : a[i-1] + SEG_FRAMES[i-1]); return a; }, []);
export const FILM_DURATION = STARTS[STARTS.length - 1] + SEG_FRAMES[SEG_FRAMES.length - 1] + 60;

const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.75) 100%)", pointerEvents: "none" }} />
);

const FilmGrain: React.FC = () => (
  <AbsoluteFill style={{
    backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 3px)",
    mixBlendMode: "overlay", pointerEvents: "none",
  }} />
);

const LetterBox: React.FC = () => (
  <>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, background: "#000" }} />
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "#000" }} />
  </>
);

const SegmentView: React.FC<{ seg: Seg; segFrame: number; segDur: number; index: number }> = ({ seg, segFrame, segDur, index }) => {
  const { fps } = useVideoConfig();
  const enter = spring({ frame: segFrame, fps, config: { damping: 22, stiffness: 110 } });
  const exit = interpolate(segFrame, [segDur - 14, segDur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = enter * (1 - exit);
  const slide = interpolate(enter, [0, 1], [40, 0]);

  // Ken Burns — alternate direction
  const dir = index % 2 === 0 ? 1 : -1;
  const kbScale = interpolate(segFrame, [0, segDur], [1.04, 1.14]);
  const kbX = interpolate(segFrame, [0, segDur], [0, dir * 30]);

  const isProduct = seg.kind === "product";

  return (
    <AbsoluteFill style={{ background: "#03060d" }}>
      <AbsoluteFill style={{ transform: `scale(${kbScale}) translateX(${kbX}px)`, transformOrigin: "center" }}>
        <Img src={staticFile(seg.image)} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: isProduct ? 0.95 : 0.88 }} />
      </AbsoluteFill>
      <AbsoluteFill style={{
        background: isProduct
          ? "linear-gradient(180deg, rgba(3,6,13,0.55) 0%, rgba(3,6,13,0.12) 25%, rgba(3,6,13,0.2) 60%, rgba(3,6,13,0.9) 100%)"
          : "linear-gradient(180deg, rgba(3,6,13,0.45) 0%, rgba(3,6,13,0.1) 30%, rgba(3,6,13,0.35) 65%, rgba(3,6,13,0.92) 100%)",
      }} />
      <Vignette />
      <FilmGrain />
      <LetterBox />

      {/* Section badge top-left */}
      <div style={{
        position: "absolute", top: 84, left: 64,
        display: "flex", alignItems: "center", gap: 14,
        transform: `translateY(${-slide}px)`, opacity,
      }}>
        <div style={{ width: 4, height: 42, background: "#FFD24A", borderRadius: 2 }} />
        <div>
          <div style={{ fontFamily: inter, color: "#FFD24A", fontSize: 16, fontWeight: 700, letterSpacing: 5, textTransform: "uppercase" }}>
            {seg.section}
          </div>
          <div style={{ fontFamily: inter, color: "rgba(255,255,255,0.7)", fontSize: 14, letterSpacing: 3, marginTop: 4 }}>
            {seg.caption}
          </div>
        </div>
      </div>

      {/* NEEXIOS top-right */}
      <div style={{
        position: "absolute", top: 88, right: 64,
        fontFamily: inter, fontSize: 22, fontWeight: 700,
        color: "rgba(255,255,255,0.92)", letterSpacing: 8,
      }}>NEEXIOS</div>

      {/* Arabic title — large, bottom-right */}
      <div dir="rtl" style={{
        position: "absolute", bottom: 170, right: 80, left: 80,
        display: "flex", flexDirection: "column", alignItems: "flex-end",
        transform: `translateY(${slide}px)`, opacity,
      }}>
        <div style={{
          fontFamily: cairo, color: "#fff", fontSize: 56, fontWeight: 800,
          lineHeight: 1.35, textShadow: "0 6px 28px rgba(0,0,0,0.85)", maxWidth: "92%",
          textAlign: "right",
        }}>{seg.ar}</div>
      </div>

      {/* English subtitle — burned in bottom */}
      <div style={{
        position: "absolute", bottom: 84, left: 80, right: 80,
        textAlign: "center", opacity,
      }}>
        <div style={{
          display: "inline-block",
          fontFamily: inter, color: "#fff", fontSize: 26, fontWeight: 500,
          lineHeight: 1.4, letterSpacing: 0.3,
          background: "rgba(0,0,0,0.55)", padding: "10px 22px", borderRadius: 6,
          textShadow: "0 2px 10px rgba(0,0,0,0.6)",
        }}>{seg.en}</div>
      </div>
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const pct = Math.min(1, frame / (FILM_DURATION - 60));
  return (
    <div style={{
      position: "absolute", top: 60, left: 0, right: 0, height: 3,
      background: "rgba(255,255,255,0.08)",
    }}>
      <div style={{ width: `${pct * 100}%`, height: "100%", background: "linear-gradient(90deg, #FFD24A 0%, #FFB000 100%)" }} />
    </div>
  );
};

export const EnterpriseFilm: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#03060d" }}>
      {SEGS.map((seg, i) => {
        const start = STARTS[i];
        const dur = SEG_FRAMES[i];
        if (frame < start || frame >= start + dur + 4) return null;
        return (
          <Sequence key={i} from={start} durationInFrames={dur} layout="none">
            <SegmentView seg={seg} segFrame={frame - start} segDur={dur} index={i} />
            <Audio src={staticFile(seg.audio)} />
          </Sequence>
        );
      })}
      <ProgressBar />
    </AbsoluteFill>
  );
};
