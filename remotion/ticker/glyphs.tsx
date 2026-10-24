/**
 * سبعة رموز: أربع حالات (خطر · تحذير · سليم · معلومة) وثلاثة اتجاهات (صعود · هبوط · ثبات).
 * كل رمزٍ دالّةٌ خالصة في `useCurrentFrame()`؛ والحلقة 48 إطارًا فالإطار 48 ≡ 0.
 * وضعيّة الإطار الأخير/الساكنة = ما يظهر في `public/media/ticker/*.svg` (يدويّة، بالإحداثيات نفسها).
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import {
  C,
  Stage,
  Glyph,
  Halo,
  PulseRing,
  edge,
  breathe,
  seg,
  easeOutCubic,
  easeInCubic,
  easeInOutSine,
  polygonPath,
  circlePath,
  useLoop,
  stepped,
} from "./kit";

/* ───────────── الحالات ───────────── */

/** خطر: مثمّن أحمر، حلقة انتباه واحدة تنفصل عن حدّه كل ثانيتين (0.5 هرتز) وتخبو، وعلامة تعجّب بيضاء ثابتة. */
const DANGER_BASE = 10;
const DANGER_PATH = polygonPath(64, 64, 43, 8, 22.5);
export const StateDanger: React.FC = () => {
  const t = useLoop(useCurrentFrame());
  const p = seg(t, 0, 0.55);
  const D = edge(DANGER_BASE);
  const o = D + 7.5 * easeOutCubic(p);
  const alpha = 0.6 * (1 - p) ** 1.3 * seg(p, 0, 0.12);
  return (
    <Stage>
      <PulseRing
        id="rd"
        d={DANGER_PATH}
        color={C.danger}
        baseW={DANGER_BASE}
        o={o}
        th={4.5}
        alpha={alpha}
      />
      <Glyph d={DANGER_PATH} color={C.danger} baseW={DANGER_BASE}>
        <g fill={C.white}>
          <rect x="57.5" y="38" width="13" height="32" rx="6.5" />
          <circle cx="64" cy="84" r="7.5" />
        </g>
      </Glyph>
    </Stage>
  );
};

/**
 * تحذير: مثلّث كهرماني ثابت الحدّ، وهالةٌ لطيفة تتنفّس على أربع درجاتٍ مُدرَّجة (ألفاها ≤ 0.32) وعلامة تعجّب كحليّة.
 * لا تكبيرَ للشكل نفسه: تغيّر الحدود المنعَّمة في كل إطارٍ يضاعف حجم الملفّ (قِيس — RENDER.md).
 */
const WARN_BASE = 10;
const WARN_PATH = "M64 26L104 96H24Z";
export const StateWarning: React.FC = () => {
  const t = useLoop(useCurrentFrame());
  const b = stepped(breathe(t), 3);
  return (
    <Stage>
      <Halo d={WARN_PATH} color={C.warning} baseW={WARN_BASE} e={6 * b} alpha={0.32 * b} />
      <Glyph d={WARN_PATH} color={C.warning} baseW={WARN_BASE}>
        <g fill={C.navy}>
          <rect x="58.5" y="52" width="11" height="24" rx="5.5" />
          <circle cx="64" cy="86" r="6.5" />
        </g>
      </Glyph>
    </Stage>
  );
};

/** سليم: دائرة خضراء، علامة الصح ترسم نفسها ثم تُمحى قبل الحلقة التالية، وتوهّجٌ يتنفّس. */
const OK_BASE = 10;
const OK_PATH = circlePath(64, 64, 43);
const CHECK_D = "M42 66L58 82L88 48";
const CHECK_LEN = 80;
export const StateOk: React.FC = () => {
  const t = useLoop(useCurrentFrame());
  const b = stepped(breathe(t), 3);
  const draw = easeOutCubic(seg(t, 0.04, 0.38)) * (1 - easeInOutSine(seg(t, 0.86, 0.97)));
  return (
    <Stage>
      <Halo d={OK_PATH} color={C.ok} baseW={OK_BASE} e={5 * b} alpha={0.12 + 0.18 * b} />
      <Glyph d={OK_PATH} color={C.ok} baseW={OK_BASE}>
        {draw > 0.12 && (
          <path
            d={CHECK_D}
            fill="none"
            stroke={C.navy}
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={CHECK_LEN}
            strokeDashoffset={CHECK_LEN * (1 - draw)}
          />
        )}
      </Glyph>
    </Stage>
  );
};

/** معلومة: معيّن مدوَّر أزرق، حرف i كحليّ، وشرارة صغيرة تدور حوله دورةً كل ثانيتين مع ذيلٍ يخبو. */
const INFO_BASE = 14;
const INFO_PATH = "M64 30L98 64L64 98L30 64Z";
const sparklePath = (cx: number, cy: number, r: number, k: number) =>
  `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}` +
  `Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
export const StateInfo: React.FC = () => {
  const t = useLoop(useCurrentFrame());
  const ORBIT = 57;
  const tail = [
    { lag: 0.0, r: 6, a: 1 },
    { lag: 0.05, r: 3.4, a: 0.6 },
    { lag: 0.1, r: 2.2, a: 0.32 },
  ];
  const twinkle = 0.85 + 0.15 * Math.cos(4 * Math.PI * t);
  return (
    <Stage>
      <Glyph d={INFO_PATH} color={C.info} baseW={INFO_BASE}>
        <g fill={C.navy}>
          <circle cx="64" cy="48" r="6.5" />
          <rect x="58.5" y="60" width="11" height="24" rx="5.5" />
        </g>
      </Glyph>
      {tail.map(({ lag, r, a }, i) => {
        const ang = 2 * Math.PI * (t - lag) - Math.PI / 2;
        const cx = 64 + ORBIT * Math.cos(ang);
        const cy = 64 + ORBIT * Math.sin(ang);
        const rr = r * (i === 0 ? twinkle : 1);
        return (
          <path
            key={i}
            d={sparklePath(cx, cy, rr, rr * 0.28)}
            fill={C.white}
            stroke={C.navy}
            strokeWidth={i === 0 ? 2.5 : 1.5}
            strokeLinejoin="round"
            opacity={a}
          />
        );
      })}
    </Stage>
  );
};

/* ───────────── الاتجاهات ───────────── */

const ARROW_BASE = 8;
/** سهمٌ لأعلى: رأس 62→32 وساق حتى 94 (مضلّع واحد بوصلٍ دائريّ). */
const ARROW_UP = "M64 32L94 62H72V94H56V62H34Z";
/** سهمٌ لليمين (الثبات). */
const ARROW_RIGHT = "M100 64L70 34V56H32V72H70V94Z";

/**
 * صعود/هبوط: يطلع من أسفل بتلاشٍ ثم يثبت ثم يمضي للأعلى ويتلاشى؛ خطّا سرعةٍ جانبيّان يطولان بقدر السرعة.
 * الهبوط انعكاس رأسيّ للتركيب نفسه (فالذيل أعلى والسهم يسقط).
 */
const Trend: React.FC<{ dir: 1 | -1; color: string }> = ({ dir, color }) => {
  const t = useLoop(useCurrentFrame());
  const A = 26;
  let dy: number, v: number, alpha: number;
  if (t < 0.45) {
    const x = t / 0.45;
    dy = A * (1 - easeOutCubic(x));
    v = 3 * (1 - x) ** 2 * (A / 0.45);
    alpha = easeInOutSine(seg(t, 0, 0.2));
  } else if (t < 0.72) {
    dy = 0;
    v = 0;
    alpha = 1;
  } else {
    const x = (t - 0.72) / 0.28;
    dy = -A * easeInCubic(x);
    v = 3 * x * x * (A / 0.28);
    alpha = 1 - easeInOutSine(seg(t, 0.72, 1));
  }
  const speed = Math.min(1, v / 130);
  const L = 34 * speed;
  const tf = dir === 1 ? undefined : "translate(0 128) scale(1 -1)";
  return (
    <Stage>
      <g transform={tf}>
        <g opacity={alpha}>
          {L > 1 &&
            [36, 92].map((x) => (
              <line
                key={x}
                x1={x}
                x2={x}
                y1={80 + dy}
                y2={80 + dy + L}
                stroke={color}
                strokeWidth={7}
                strokeLinecap="round"
                opacity={0.55}
              />
            ))}
          <Glyph d={ARROW_UP} color={color} baseW={ARROW_BASE} transform={`translate(0 ${dy})`} />
        </g>
      </g>
    </Stage>
  );
};
export const TrendUp: React.FC = () => <Trend dir={1} color={C.ok} />;
export const TrendDown: React.FC = () => <Trend dir={-1} color={C.danger} />;

/** ثبات: سهمٌ أفقيّ رماديّ-أزرق ينزلق ±6 بكسل بجيب، وخطّا سرعةٍ خافتان حين يتجه يمينًا. */
export const TrendFlat: React.FC = () => {
  const t = useLoop(useCurrentFrame());
  const dx = 6 * Math.sin(2 * Math.PI * t);
  const c = Math.max(0, Math.cos(2 * Math.PI * t));
  const L = 24 * c;
  return (
    <Stage>
      {L > 1 &&
        [36, 92].map((y) => (
          <line
            key={y}
            y1={y}
            y2={y}
            x1={56 + dx - L}
            x2={56 + dx}
            stroke={C.flat}
            strokeWidth={7}
            strokeLinecap="round"
            opacity={0.5 * c}
          />
        ))}
      <Glyph d={ARROW_RIGHT} color={C.flat} baseW={ARROW_BASE} transform={`translate(${dx} 0)`} />
    </Stage>
  );
};
