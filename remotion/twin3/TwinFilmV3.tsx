/**
 * فيلم التوأم الرقمي v3 — نسخةٌ فوتوغرافية (عشرون صورة مولَّدة بالذكاء الاصطناعي، قدّمها المالك) بدل الرسم المسطّح.
 * الزمن نفسه تمامًا كالنسخة الثانية (المشاهد والإشارات والعناوين ومقطوعة الموسيقى المقفلة عليها).
 *
 *  8.0  مسح ضوءٍ ليّن (قطعٌ مائل) من لقطة البوّابة إلى المحطة
 *  10.8 / 19.8 / 29.8  سحبٌ أفقيّ على الإيقاع (تمويه حركة أفقيّ) بين لقطتين
 *  23.55–24.25  عبورٌ بالتكبير + وهج من أفق المدينة إلى البوّابة
 *  37.2–38.6    تقريبٌ على شاشة التوأم في غرفة التحكّم ثم ذوبانٌ إلى لقطة التوأم
 *  53.5 → النهاية  ثبات: كلّ الحركة مجمَّدة (الزمن يُحصَر عند FREEZE)
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Brand } from "./Brand";
import { Captions } from "./captions";
import { clamp, easeInOut, lerp, prog } from "./kit/ease";
import { S1Hero, S1Radio } from "./scenes/S1";
import { S2City, S2Gen, S2Relay, S2Step, S2Tr1, S2Tr2 } from "./scenes/S2";
import { S3Cam, S3Ctrl, S3Drone, S3Gate, S3Pat, S3Scan, S3Wall } from "./scenes/S3";
import { S4Alert, S4Ping, S4Reveal } from "./scenes/S4";
import { S5Network } from "./scenes/S5";
import { FPS } from "./timeline";
import "./fonts";
import { Grain } from "./kit/grain";

const FREEZE = 53.5;

interface Whip {
  a: number;
  b: number;
  dir: 1 | -1;
}
interface LayerDef {
  id: string;
  z: number;
  from: number;
  to: number;
  fade?: readonly [number, number];
  inWhip?: Whip;
  outWhip?: Whip;
  render: (t: number) => React.ReactNode;
}

const LAYERS: ReadonlyArray<LayerDef> = [
  { id: "s1hero", z: 1, from: 0, to: 5.8, render: (t) => <S1Hero t={t} /> },
  {
    id: "s2gen",
    z: 1.5,
    from: 7.5,
    to: 11.3,
    outWhip: { a: 10.8, b: 11.2, dir: 1 },
    render: (t) => <S2Gen t={t} />,
  },
  {
    id: "s1radio",
    z: 2,
    from: 5.35,
    to: 8.45,
    fade: [5.35, 5.65],
    render: (t) => <S1Radio t={Math.min(t, 8.0)} />,
  },
  {
    id: "s2step",
    z: 3,
    from: 10.8,
    to: 14.3,
    inWhip: { a: 10.8, b: 11.2, dir: 1 },
    render: (t) => <S2Step t={t} />,
  },
  {
    id: "s2tr1",
    z: 4,
    from: 13.75,
    to: 18.3,
    fade: [13.75, 14.25],
    render: (t) => <S2Tr1 t={t} />,
  },
  {
    id: "s2tr2",
    z: 5,
    from: 17.7,
    to: 20.3,
    fade: [17.7, 18.2],
    outWhip: { a: 19.8, b: 20.2, dir: 1 },
    render: (t) => <S2Tr2 t={t} />,
  },
  {
    id: "s2relay",
    z: 6,
    from: 19.8,
    to: 22.3,
    inWhip: { a: 19.8, b: 20.2, dir: 1 },
    render: (t) => <S2Relay t={t} />,
  },
  {
    id: "s2city",
    z: 7,
    from: 21.8,
    to: 24.45,
    fade: [21.8, 22.2],
    render: (t) => <S2City t={t} />,
  },
  {
    id: "s3gate",
    z: 8,
    from: 23.8,
    to: 27.4,
    fade: [23.85, 24.35],
    render: (t) => <S3Gate t={t} />,
  },
  {
    id: "s3scan",
    z: 9,
    from: 26.8,
    to: 30.3,
    fade: [26.8, 27.25],
    outWhip: { a: 29.8, b: 30.2, dir: 1 },
    render: (t) => <S3Scan t={t} />,
  },
  {
    id: "s3cam",
    z: 10,
    from: 29.8,
    to: 32.6,
    inWhip: { a: 29.8, b: 30.2, dir: 1 },
    render: (t) => <S3Cam t={t} />,
  },
  { id: "s3pat", z: 11, from: 32.0, to: 34.6, fade: [32.0, 32.45], render: (t) => <S3Pat t={t} /> },
  {
    id: "s3drone",
    z: 12,
    from: 33.9,
    to: 36.5,
    fade: [33.9, 34.35],
    render: (t) => <S3Drone t={t} />,
  },
  {
    id: "s3ctrl",
    z: 13,
    from: 35.9,
    to: 38.0,
    fade: [35.9, 36.35],
    render: (t) => <S3Ctrl t={t} />,
  },
  {
    id: "s3wall",
    z: 14,
    from: 37.2,
    to: 39.0,
    fade: [37.35, 37.7],
    render: (t) => <S3Wall t={t} />,
  },
  {
    id: "s4reveal",
    z: 15,
    from: 38.0,
    to: 41.2,
    fade: [38.0, 38.6],
    render: (t) => <S4Reveal t={t} />,
  },
  {
    id: "s4ping",
    z: 16,
    from: 40.7,
    to: 44.4,
    fade: [40.7, 41.15],
    render: (t) => <S4Ping t={t} />,
  },
  {
    id: "s4alert",
    z: 17,
    from: 43.4,
    to: 50.8,
    fade: [43.4, 43.95],
    render: (t) => <S4Alert t={t} />,
  },
  { id: "s5", z: 18, from: 49.6, to: 99, fade: [49.6, 50.4], render: (t) => <S5Network t={t} /> },
];

/** مرشّح تمويه أفقيّ بقيمةٍ معرَّفة لكلّ إطار. */
const HBlur: React.FC<{ id: string; sd: number }> = ({ id, sd }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id={id} x="-10%" y="-5%" width="120%" height="110%" colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation={`${sd.toFixed(2)} 0`} />
    </filter>
  </svg>
);

const Layer: React.FC<{ def: LayerDef; t: number; extra?: React.CSSProperties }> = ({
  def,
  t,
  extra,
}) => {
  if (t < def.from || t > def.to) return null;
  let opacity = def.fade ? easeInOut(prog(t, def.fade[0], def.fade[1])) : 1;
  let tx = 0;
  let blur = 0;
  if (def.inWhip) {
    const p = easeInOut(prog(t, def.inWhip.a, def.inWhip.b));
    tx += def.inWhip.dir * (1 - p) * 300;
    blur = Math.max(blur, (1 - p) * 16);
    opacity *= clamp(p * 2.2);
  }
  if (def.outWhip) {
    const p = easeInOut(prog(t, def.outWhip.a, def.outWhip.b));
    tx += -def.outWhip.dir * p * 170;
    blur = Math.max(blur, Math.sin(Math.PI * p) * 14 + p * 4);
  }
  const fid = `hb-${def.id}`;
  return (
    <AbsoluteFill
      style={{
        zIndex: def.z * 10,
        opacity,
        transform: tx ? `translateX(${tx.toFixed(1)}px)` : undefined,
        filter: blur > 0.4 ? `url(#${fid})` : undefined,
        overflow: "hidden",
        ...extra,
      }}
    >
      {blur > 0.4 && <HBlur id={fid} sd={blur} />}
      {def.render(t)}
    </AbsoluteFill>
  );
};

/** مسح الضوء عند 8.0: قصٌّ مائل يكشف لقطة المحطة من اليمين إلى اليسار. */
const sweepGeom = (t: number) => {
  const u = easeInOut(prog(t, 7.62, 8.38));
  const xb = lerp(1560, -380, u);
  const skew = 130;
  return { u, xb, skew, op: Math.sin(Math.PI * clamp(u)) * 0.34 };
};

export const TwinFilmV3: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const ta = Math.min(t, FREEZE);

  // قصّ لقطة البوّابة الافتتاحية أثناء المسح
  const sw = sweepGeom(ta);
  const sweeping = ta >= 7.6 && ta < 8.42;
  const gateClip: React.CSSProperties | undefined = sweeping
    ? {
        clipPath: `polygon(-400px -10px, ${sw.xb + sw.skew}px -10px, ${sw.xb - sw.skew}px 730px, -400px 730px)`,
      }
    : undefined;

  // عبور التكبير 23.55–24.25: المنشأة تتّسع وتذوب في البوّابة
  const zt = easeInOut(prog(ta, 23.55, 24.25));
  const indScale = lerp(1, 1.22, zt);
  const gateIn = 1 + 0.2 * (1 - easeInOut(prog(ta, 23.85, 24.6)));
  const glow = Math.sin(Math.PI * clamp((ta - 23.7) / 0.7)) * 0.3;

  const heroScrim = easeInOut(prog(ta, 0.6, 1.6)) * (1 - easeInOut(prog(ta, 4.0, 4.7)));

  return (
    <AbsoluteFill style={{ background: "#03070f" }}>
      {LAYERS.map((def) => {
        let extra: React.CSSProperties | undefined;
        if (def.id === "s1radio") extra = gateClip;
        if (def.id === "s2city" && ta > 23.5)
          extra = { transform: `scale(${indScale})`, transformOrigin: "640px 470px" };
        if (def.id === "s3gate" && ta < 24.7)
          extra = { transform: `scale(${gateIn})`, transformOrigin: "640px 400px" };
        return <Layer key={def.id} def={def} t={ta} extra={extra} />;
      })}

      {/* وهج العبور بالتكبير */}
      {glow > 0.002 && (
        <AbsoluteFill
          style={{
            zIndex: 300,
            background:
              "radial-gradient(ellipse 60% 60% at 50% 62%, rgba(255,242,208,1), rgba(255,216,138,0.4) 50%, rgba(255,216,138,0) 100%)",
            opacity: glow,
            mixBlendMode: "screen",
          }}
        />
      )}
      {/* شريط مسح الضوء */}
      {sweeping && sw.op > 0.01 && (
        <AbsoluteFill style={{ zIndex: 310, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: sw.xb - 70,
              top: -40,
              width: 140,
              height: 800,
              transform: "skewX(-10deg)",
              background:
                "linear-gradient(90deg, rgba(191,247,255,0), rgba(217,251,255,0.5) 45%, rgba(255,255,255,1) 50%, rgba(217,251,255,0.5) 55%, rgba(191,247,255,0))",
              opacity: sw.op,
              mixBlendMode: "screen",
            }}
          />
        </AbsoluteFill>
      )}

      {/* مظلّة علوية لقراءة العنوان البطل فوق السماء */}
      {heroScrim > 0.01 && (
        <AbsoluteFill
          style={{
            zIndex: 320,
            background:
              "linear-gradient(200deg, rgba(2,8,20,0.62) 0%, rgba(2,8,20,0.22) 38%, rgba(2,8,20,0) 62%)",
            opacity: heroScrim,
          }}
        />
      )}

      {/* درجةٌ لونية خفيفة (تيل في الظلال ودفءٌ في الأسفل) + فينييت */}
      <AbsoluteFill
        style={{
          zIndex: 330,
          background:
            "linear-gradient(180deg, rgba(10,50,80,0.14), rgba(0,0,0,0) 45%, rgba(255,140,60,0.06))",
          mixBlendMode: "soft-light",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          zIndex: 340,
          background:
            "radial-gradient(ellipse 78% 82% at 50% 50%, rgba(2,5,13,0) 55%, rgba(2,5,13,0.5) 100%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill style={{ zIndex: 400 }}>
        <Captions t={ta} />
        <Brand t={ta} />
      </AbsoluteFill>
      <AbsoluteFill style={{ zIndex: 410, pointerEvents: "none" }}>
        <Grain strength={0.01} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
