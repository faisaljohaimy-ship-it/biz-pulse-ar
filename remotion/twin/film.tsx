/**
 * «التوأم الحيّ» — فيلم قصير سينمائيّ للتوأم الرقميّ.
 *
 * يحكي ما ترسمه `src/routes/-nx-twin-page.tsx` ساكنًا: أعمدة ضوء
 * ارتفاعها نسبة الامتثال حول قلبٍ نابض، وأنابيب يسري فيها التوجيه
 * ذهابًا والإفادة إيابًا. الفرق أنّ للفيلم كاميرا: دخولٌ يقترب،
 * نهوضُ الأعمدة من أرضها، سريان التوجيه، ثم استقرار.
 *
 * **الحلقة قيدٌ بنيويّ لا زينة.** الفيلم يُعرض دائرًا، فآخر إطار يجب أن
 * يصل بالأوّل بلا قطع مرئي. لذلك كل حركة هنا دالّة دوريّة في
 * `t = frame / durationInFrames` بدورة كاملة واحدة: الكاميرا تتنفّس
 * ذهابًا وإيابًا بدل أن تنزلق في اتجاه واحد، والسريان بعدد دورات صحيح،
 * والأعمدة تنهض ثمّ تنطوي إلى منصّاتها قبل الطرف — فتُقرأ الحلقة دورةَ
 * قياسٍ للتوأم تتكرّر، لا قفزةً في التركيب. ولا يُطفأ المشهد بين
 * الدورتين: القلب والأرض حاضران دائمًا، فلا ومضة سوداء عند الوصل.
 *
 * الصدق العددي (المادة ٢٧): الأرقام كلّها من `./data` — مولّد المحاكاة
 * المرجعية نفسه الذي تعرضه الصفحة — والشارة «بيانات محاكاة مرجعية»
 * ظاهرة في كل إطار. ومنطقة بلا نسبة مقيسة لا عمود لها ولا رقم، بل
 * «لم يُقَس» كما في الصفحة.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import {
  add,
  breathe,
  clamp01,
  frac,
  mix,
  outBack,
  project,
  ringPath,
  screenRight,
  smoothstep,
  win,
  type Camera,
  type V3,
} from "./projection";
import { COMPLIANCE_AVG, TWIN_REGIONS, towerHeight } from "./data";
import { ARABIC_STACK } from "./fonts";

const W = 1920;
const H = 1080;
/** أشرطة سينمائية خفيفة — تُضيّق الكادر إلى نسبة عريضة دون قصّ المعنى. */
const BAR = 116;
const BAND_MID = H / 2;

const INK = "#E9F6FF";
const INK_2 = "rgba(216, 240, 252, 0.74)";
const INK_3 = "rgba(216, 240, 252, 0.5)";
/** لون الشبكة والقلب — سماوي المنتج، لا لون منطقة بعينها. */
const CORE = "#6FD8FF";

/* ══════════════ الكاميرا ══════════════
   دورة واحدة: تبتعد عند الطرفين وتقترب في الوسط، وتقوس يسارًا ثم
   يمينًا. المشتقّة صفريّة عند t=0 وt=1 في البُعد والارتفاع، فالوصل غير
   محسوس؛ والسمت جيبٌ كامل فيعود إلى نقطته بسرعته نفسها. */
function cameraAt(t: number): Camera {
  // نفَسٌ مُلَيَّن مرّتين: يطيل المكوث قريبًا في الوسط ويهدّئ الطرفين.
  const s = smoothstep(smoothstep(breathe(t)));
  return {
    az: -0.28 + 0.3 * Math.sin(Math.PI * 2 * t),
    el: mix(0.46, 0.345, s),
    dist: mix(15.6, 12.3, s),
    focal: 1250,
    cx: W / 2,
    cy: BAND_MID + 132,
  };
}

/** مسار دائرة أفقية في العالم — تُسقَط قطعةً قطعة، فلا تقريب في الشكل. */
function circlePath(c: V3, radius: number, cam: Camera, steps = 64): string {
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    const q = project(
      { x: c.x + Math.cos(a) * radius, y: c.y + Math.sin(a) * radius, z: c.z },
      cam,
    );
    d += `${i === 0 ? "M" : "L"}${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
  }
  return `${d}Z`;
}

/* ══════════════ غلاف نهوض العمود ══════════════
   يبدأ من الصفر، ينهض بتجاوزٍ طفيف ثم يستقرّ، يمكث، وينطوي إلى منصّته
   قبل نهاية الدورة — فتساوي قيمتُه عند t=1 قيمتَها عند t=0. */
function towerEnvelope(t: number, index: number): number {
  const rise0 = 0.1 + index * 0.055;
  const rise1 = rise0 + 0.28;
  const fold0 = 0.87;
  const fold1 = 0.985;
  if (t < rise0) return 0;
  if (t < rise1) return outBack(win(t, rise0, rise1));
  if (t < fold0) return 1;
  return 1 - smoothstep(win(t, fold0, fold1));
}

/* ══════════════ المشهد ══════════════ */

interface SceneProps {
  t: number;
  cam: Camera;
  /** النسخة الخلفية المموّهة (bloom) تُخفي النصوص الدقيقة وتُبقي الضوء. */
  glow?: boolean;
}

const Scene: React.FC<SceneProps> = ({ t, cam, glow = false }) => {
  const hub: V3 = { x: 0, y: 0, z: 0 };
  const right = screenRight(cam);
  const sweep = t * Math.PI * 2;
  // نبض القلب: خمس نبضات في الدورة — عدد صحيح، فالوصل سليم.
  const beat = 0.5 - 0.5 * Math.cos(Math.PI * 2 * 5 * t);

  const hubProj = project(hub, cam);

  /** المجموعات تُرتَّب بالعمق: الأبعد يُرسم أوّلًا فيمرّ الأقرب فوقه. */
  const groups: Array<{ depth: number; node: React.ReactNode }> = [];

  // ── القلب: حلقات صدى تتّسع، وقرص نابض، وشعاع رأسي رفيع ──
  groups.push({
    depth: hubProj.depth,
    node: (
      <g key="hub">
        {[0, 1, 2].map((i) => {
          const u = frac(t * 2 + i / 3);
          const r = mix(0.5, 3.05, u);
          return (
            <path
              key={i}
              d={circlePath(hub, r, cam)}
              fill="none"
              stroke={CORE}
              strokeOpacity={(1 - u) * (1 - u) * 0.5}
              strokeWidth={Math.max(1, 2.4 * (hubProj.k / 130))}
            />
          );
        })}
        <path d={circlePath(hub, 0.95, cam)} fill="url(#hubGlow)" opacity={0.55 + 0.25 * beat} />
        <path
          d={circlePath(hub, 0.5, cam)}
          fill={CORE}
          fillOpacity={0.16 + 0.14 * beat}
          stroke={CORE}
          strokeOpacity={0.7}
          strokeWidth={Math.max(1, 2 * (hubProj.k / 130))}
        />
        <path d={circlePath(hub, 0.2, cam)} fill="#EAFBFF" fillOpacity={0.65 + 0.3 * beat} />
        {/* شعاع القلب الرأسي — يتنفّس مع النبض */}
        <polygon
          points={(() => {
            const w = 0.055;
            const top: V3 = { x: 0, y: 0, z: mix(0.9, 1.35, beat) };
            const a = project(add(hub, right, -w), cam);
            const b = project(add(hub, right, w), cam);
            const c = project(add(top, right, w * 0.35), cam);
            const d = project(add(top, right, -w * 0.35), cam);
            return [a, b, c, d].map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
          })()}
          fill="url(#hubBeam)"
          opacity={0.5 + 0.3 * beat}
        />
      </g>
    ),
  });

  // ── المناطق: منصّة، ضباب قاعدة، عمود، لبّ، قمّة، وسريان الأنبوب ──
  TWIN_REGIONS.forEach((region, i) => {
    const base: V3 = { x: region.pos.x, y: region.pos.y, z: 0 };
    const p = project(base, cam);
    const env = towerEnvelope(t, i);
    const accent = region.accent;

    // تنفّس طفيف بعد الاستقرار — دورتان كاملتان، فالحلقة سليمة.
    const settled = env >= 1 ? 1 + 0.014 * Math.sin(Math.PI * 2 * 2 * t) : 1;
    const h = region.pct === null ? 0 : towerHeight(region.pct) * env * settled;

    const topWorld: V3 = { x: base.x, y: base.y, z: h };
    const topProj = project(topWorld, cam);
    const wBeam = 0.155;
    const wCore = 0.052;

    const quad = (halfWidthBottom: number, halfWidthTop: number): string => {
      const a = project(add(base, right, -halfWidthBottom), cam);
      const b = project(add(base, right, halfWidthBottom), cam);
      const c = project(add(topWorld, right, halfWidthTop), cam);
      const d = project(add(topWorld, right, -halfWidthTop), cam);
      return [a, b, c, d].map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(" ");
    };

    const gid = `beam-${region.id}`;
    const cid = `core-${region.id}`;

    groups.push({
      depth: p.depth,
      node: (
        <g key={region.id}>
          <defs>
            <linearGradient
              id={gid}
              gradientUnits="userSpaceOnUse"
              x1={p.x}
              y1={p.y}
              x2={topProj.x}
              y2={topProj.y}
            >
              <stop offset="0" stopColor={accent} stopOpacity="0.05" />
              <stop offset="0.22" stopColor={accent} stopOpacity="0.34" />
              <stop offset="1" stopColor={accent} stopOpacity="0.12" />
            </linearGradient>
            <linearGradient
              id={cid}
              gradientUnits="userSpaceOnUse"
              x1={p.x}
              y1={p.y}
              x2={topProj.x}
              y2={topProj.y}
            >
              <stop offset="0" stopColor={accent} stopOpacity="0.35" />
              <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.82" />
              <stop offset="1" stopColor={accent} stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* ضباب القاعدة — يشتدّ بنهوض العمود */}
          <path
            d={circlePath(base, 1.15, cam)}
            fill="url(#padHaze)"
            opacity={0.22 + 0.4 * env}
            style={{ color: accent }}
          />
          {/* المنصّة */}
          <path
            d={circlePath(base, 0.62, cam)}
            fill={accent}
            fillOpacity={0.06 + 0.1 * env}
            stroke={accent}
            strokeOpacity={0.34 + 0.4 * env}
            strokeWidth={Math.max(1, 2.2 * (p.k / 130))}
          />
          <path
            d={circlePath(base, 0.36, cam)}
            fill="none"
            stroke={accent}
            strokeOpacity={0.2 + 0.3 * env}
            strokeWidth={Math.max(0.8, 1.3 * (p.k / 130))}
          />

          {/* سريان الأنبوب — التوجيه صادرًا من القلب، والإفادة عائدة إليه */}
          {[0, 1].map((n) => {
            const u = frac(t * 3 + i * 0.13 + n * 0.5);
            const q = project({ x: base.x * u, y: base.y * u, z: 0.045 }, cam);
            return (
              <circle
                key={`out-${n}`}
                cx={q.x}
                cy={q.y}
                r={Math.max(1.4, 4.2 * (q.k / 130))}
                fill={CORE}
                opacity={Math.sin(Math.PI * u) * 0.85}
              />
            );
          })}
          {[0, 1].map((n) => {
            const u = frac(t * 3 + i * 0.13 + n * 0.5 + 0.27);
            const v = 1 - u;
            const q = project({ x: base.x * v, y: base.y * v, z: 0.045 }, cam);
            return (
              <circle
                key={`back-${n}`}
                cx={q.x}
                cy={q.y}
                r={Math.max(1.2, 3.4 * (q.k / 130))}
                fill={accent}
                opacity={Math.sin(Math.PI * u) * 0.9 * env}
              />
            );
          })}

          {h > 0.02 && (
            <>
              <polygon points={quad(wBeam, wBeam * 0.86)} fill={`url(#${gid})`} />
              <polygon points={quad(wCore, wCore * 0.8)} fill={`url(#${cid})`} />
              {/* هالة القمّة تتنفّس، والقمّة نفسها قرص ناصع */}
              <path
                d={circlePath(topWorld, 0.34, cam)}
                fill="url(#capHalo)"
                opacity={(0.5 + 0.35 * Math.sin(Math.PI * 2 * 3 * t + i)) * env}
                style={{ color: accent }}
              />
              <path d={circlePath(topWorld, 0.135, cam)} fill="#FFFFFF" fillOpacity={0.9 * env} />
            </>
          )}
        </g>
      ),
    });
  });

  groups.sort((a, b) => b.depth - a.depth);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <defs>
        <radialGradient id="hubGlow">
          <stop offset="0" stopColor={CORE} stopOpacity="0.5" />
          <stop offset="0.55" stopColor={CORE} stopOpacity="0.14" />
          <stop offset="1" stopColor={CORE} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="padHaze">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.34" />
          <stop offset="0.6" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="capHalo">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="0.45" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hubBeam" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.7" />
          <stop offset="1" stopColor={CORE} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* أرضية رادارية: حلقات متراكزة وأسياخ يمرّ عليها مسحٌ دائر مرّة
          واحدة في الدورة — فالمسح نفسه حلقة مغلقة. */}
      <g>
        {[0.9, 1.7, 2.5, 3.35, 4.25, 5.2].map((r, i) => (
          <path
            key={r}
            d={ringPath(r, 0, cam)}
            fill="none"
            stroke={CORE}
            strokeOpacity={0.16 - i * 0.017}
            strokeWidth={1.4}
          />
        ))}
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i / 36) * Math.PI * 2;
          const d = frac((a - sweep) / (Math.PI * 2));
          const lit = Math.pow(1 - d, 16);
          const p0 = project({ x: Math.cos(a) * 0.85, y: Math.sin(a) * 0.85, z: 0 }, cam);
          const p1 = project({ x: Math.cos(a) * 5.2, y: Math.sin(a) * 5.2, z: 0 }, cam);
          return (
            <line
              key={i}
              x1={p0.x}
              y1={p0.y}
              x2={p1.x}
              y2={p1.y}
              stroke={CORE}
              strokeOpacity={0.05 + 0.42 * lit}
              strokeWidth={1 + 1.6 * lit}
            />
          );
        })}
        {/* الأنابيب الأربعة على الأرض */}
        {TWIN_REGIONS.map((region) => {
          const a = project({ x: 0, y: 0, z: 0.02 }, cam);
          const b = project({ x: region.pos.x, y: region.pos.y, z: 0.02 }, cam);
          return (
            <line
              key={region.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={region.accent}
              strokeOpacity={0.3}
              strokeWidth={2}
            />
          );
        })}
      </g>

      {groups.map((g) => g.node)}
      {glow ? null : null}
    </svg>
  );
};

/* ══════════════ طبقة النصّ — عربية/RTL فوق المشهد ══════════════ */

const Labels: React.FC<{ t: number; cam: Camera }> = ({ t, cam }) => {
  const kRef = 140;
  return (
    <div style={{ position: "absolute", inset: 0, direction: "rtl" }}>
      {TWIN_REGIONS.map((region, i) => {
        const env = towerEnvelope(t, i);
        const base = { x: region.pos.x, y: region.pos.y, z: 0 };
        const p = project(base, cam);
        const h = region.pct === null ? 0 : towerHeight(region.pct) * env;
        const top = project({ x: base.x, y: base.y, z: h }, cam);
        const scale = 0.62 + 0.38 * (p.k / kRef);
        return (
          <React.Fragment key={region.id}>
            {/* اسم المنطقة — من `regions.ts`، حاضرٌ دائمًا تحت منصّته */}
            <div
              style={{
                position: "absolute",
                left: p.x,
                top: p.y + 0.34 * p.k,
                translate: "-50% 0",
                fontFamily: ARABIC_STACK,
                fontWeight: 700,
                fontSize: 30 * scale,
                letterSpacing: "0.01em",
                color: INK,
                textShadow: `0 0 24px ${region.accent}88, 0 2px 10px rgba(0,0,0,0.6)`,
                whiteSpace: "nowrap",
              }}
            >
              {region.nameAr}
            </div>
            {/* القيمة — لا تظهر إلّا مع عمودها؛ وما لم يُقَس يُقرأ نصًّا */}
            {region.pct === null ? (
              <div
                style={{
                  position: "absolute",
                  left: p.x,
                  top: p.y - 0.5 * p.k,
                  translate: "-50% -50%",
                  fontFamily: ARABIC_STACK,
                  fontSize: 22 * scale,
                  color: INK_3,
                  whiteSpace: "nowrap",
                }}
              >
                لم يُقَس
              </div>
            ) : (
              <div
                style={{
                  position: "absolute",
                  left: top.x,
                  top: top.y - 0.36 * top.k,
                  translate: "-50% -50%",
                  opacity: clamp01((env - 0.35) / 0.4),
                  scale: (0.86 + 0.14 * env).toFixed(3),
                  fontFamily: ARABIC_STACK,
                  fontWeight: 700,
                  fontSize: 34 * scale,
                  color: INK,
                  padding: `${5 * scale}px ${14 * scale}px`,
                  borderRadius: 999,
                  border: `1px solid ${region.accent}77`,
                  background: "rgba(4, 22, 34, 0.55)",
                  boxShadow: `0 0 34px ${region.accent}55`,
                  whiteSpace: "nowrap",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {`${region.pct}%`}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ══════════════ إطار العرض: الترويسة والشارة والمفتاح ══════════════ */

const Chrome: React.FC<{ t: number }> = ({ t }) => {
  // ظهورٌ واحد في أوّل الدورة يعود إلى حاله عند نهايتها.
  const inK = smoothstep(win(t, 0.02, 0.16));
  const out = 1 - smoothstep(win(t, 0.93, 1));
  const o = inK * out;
  const rise = (1 - inK) * 18;

  const label: React.CSSProperties = {
    fontFamily: ARABIC_STACK,
    color: INK_2,
    fontSize: 24,
    letterSpacing: "0.02em",
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        direction: "rtl",
        fontFamily: ARABIC_STACK,
        opacity: o,
      }}
    >
      {/* الترويسة — يمين الكادر، وهو مبتدأ القراءة في العربية */}
      <div
        style={{
          position: "absolute",
          top: BAR + 46,
          right: 108,
          textAlign: "right",
          translate: `0 ${rise}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "flex-end",
            color: CORE,
            fontSize: 25,
            letterSpacing: "0.06em",
          }}
        >
          <span>سَدِيد — التوأم الحيّ</span>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              background: CORE,
              boxShadow: `0 0 18px ${CORE}`,
              opacity: 0.55 + 0.45 * (0.5 - 0.5 * Math.cos(Math.PI * 2 * 5 * t)),
            }}
          />
        </div>
        <div
          style={{
            marginTop: 10,
            color: INK,
            fontWeight: 700,
            fontSize: 62,
            lineHeight: 1.18,
            textShadow: "0 4px 34px rgba(0,0,0,0.7)",
          }}
        >
          أربع مناطق، مشهد واحد
        </div>
        <div style={{ ...label, marginTop: 12, color: INK_3, fontSize: 25 }}>
          ارتفاع العمود هو نسبة الامتثال
        </div>
      </div>

      {/* متوسّط الامتثال — يسار الكادر، مشتقٌّ من الصفوف نفسها */}
      <div
        style={{
          position: "absolute",
          top: BAR + 52,
          left: 108,
          textAlign: "left",
          translate: `0 ${rise}px`,
        }}
      >
        <div
          style={{
            color: INK,
            fontWeight: 700,
            fontSize: 74,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            textShadow: `0 0 40px ${CORE}55`,
          }}
        >
          {COMPLIANCE_AVG === null ? "—" : `${COMPLIANCE_AVG}%`}
        </div>
        <div style={{ ...label, marginTop: 10 }}>متوسط الامتثال</div>
      </div>

      {/* مفتاح السريان — أسفل اليسار */}
      <div
        style={{
          position: "absolute",
          bottom: BAR + 46,
          left: 108,
          display: "flex",
          gap: 26,
          alignItems: "center",
          ...label,
          fontSize: 23,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: CORE,
              boxShadow: `0 0 14px ${CORE}`,
            }}
          />
          التوجيه صادرًا
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#22C55E",
              boxShadow: "0 0 14px #22C55E",
            }}
          />
          الإفادة عائدة
        </span>
      </div>

      {/* شارة الشفافية — حاضرة في كل إطار بلا استثناء */}
      <div
        style={{
          position: "absolute",
          bottom: BAR + 42,
          right: 108,
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "11px 22px",
          borderRadius: 999,
          border: "1px solid rgba(74, 190, 232, 0.34)",
          background: "rgba(150, 220, 255, 0.08)",
          color: INK_2,
          fontSize: 23,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            border: `2px solid ${INK_3}`,
          }}
        />
        بيانات محاكاة مرجعية
      </div>
    </div>
  );
};

/* ══════════════ الفيلم ══════════════ */

export const TwinFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // القسمة على المدّة كاملةً — لا على (المدّة − 1) — حتى يكون الإطار
  // الذي يلي الأخير هو الأوّل بالضبط.
  const t = frame / durationInFrames;
  const cam = cameraAt(t);
  const roll = 0.45 * Math.sin(Math.PI * 2 * t + Math.PI / 3);

  return (
    <AbsoluteFill style={{ backgroundColor: "#010A12", overflow: "hidden" }}>
      {/* عمق الخلفية: قاعٌ كحليّ وشفقان يتنفّسان بدورة كاملة */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(120% 80% at 50% 78%, #05283A 0%, #031723 38%, #010A12 78%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: "radial-gradient(46% 40% at 24% 34%, rgba(34,211,238,0.20), transparent 70%)",
          opacity: 0.5 + 0.5 * breathe(t),
        }}
      />
      <AbsoluteFill
        style={{
          background: "radial-gradient(52% 44% at 78% 26%, rgba(59,130,246,0.18), transparent 70%)",
          opacity: 0.5 + 0.5 * breathe(frac(t + 0.5)),
        }}
      />

      {/* الكادر يتمايل تمايلًا لا يكاد يُرى — يمنع جمود الصورة */}
      <AbsoluteFill style={{ rotate: `${roll}deg`, scale: "1.03" }}>
        {/* نسخة مموّهة تحت النسخة الحادّة: توهّج ضوئي بلا مرشّح مكلف */}
        <AbsoluteFill style={{ filter: "blur(26px)", opacity: 0.9, mixBlendMode: "screen" }}>
          <Scene t={t} cam={cam} glow />
        </AbsoluteFill>
        <AbsoluteFill style={{ filter: "blur(7px)", opacity: 0.55, mixBlendMode: "screen" }}>
          <Scene t={t} cam={cam} glow />
        </AbsoluteFill>
        <Scene t={t} cam={cam} />
        <Labels t={t} cam={cam} />
      </AbsoluteFill>

      {/* تعتيم الأطراف — يجمع العين على القلب */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(72% 62% at 50% 54%, transparent 42%, rgba(1,10,18,0.55) 82%, rgba(1,10,18,0.9) 100%)",
        }}
      />

      <Chrome t={t} />

      {/* حبيبات الفيلم — ساكنة، فلا وميض عند وصل الحلقة */}
      <AbsoluteFill
        style={{
          opacity: 0.05,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* الأشرطة السينمائية */}
      <div
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: BAR, background: "#000" }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: BAR,
          background: "#000",
        }}
      />
    </AbsoluteFill>
  );
};
