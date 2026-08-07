/**
 * التوأم الرقمي المرسوم — مشهد المنطقة.
 *
 * ## ما كان، وما صار
 *
 * كانت `/sec/twin` شجرةً نصّية هرمية مثبَّتةً على المنطقة الغربية وحدها:
 * أسماءٌ وأعدادٌ تُطوى وتُفتح، بلا رسمٍ إطلاقًا. والمالك طلب أن **يُرسم**
 * التوأم لكل منطقة. فصار المشهد الرسم، والشجرة تبقى إلى جانبه — الرسم
 * يُري المكان، والشجرة تُري النصّ الدقيق. ولم تُحذف الشجرة.
 *
 * ## من أين تأتي «الواقعية» هنا
 *
 * لا من مكتبة ثلاثيّة الأبعاد — الهامش المتبقّي في ميزانية الأداء ٠٫٣٦
 * ميغابايت جافاسكربت، ومكتبة مشهدٍ تلتهمها وحدها. بل من الأدوات التي
 * تبني بها الرسوم المعمارية العمقَ أصلًا، وكلّها SVG خالص:
 *
 *  ١. **منظور جوّي** — الطبقة الوسطى تُطلى بلون الأفق بشفافية، فتبتعد.
 *  ٢. **وجهان لكل جسم** — مضاءٌ نحو الشمس ومظلمٌ عنها، من مصدرٍ واحد
 *     ثابت (`SUN`). الاتّجاه الواحد هو ما يجعل الأجسام تبدو في مكانٍ
 *     واحد بدل أن تبدو ملصقات.
 *  ٣. **ظلٌّ ملامس** — بيضاويّ ضبابيّ تحت كل بنية. الجسم بلا ظلٍّ يطفو.
 *  ٤. **حافّة لامعة** — خيطٌ فاتح على الحافّة المواجهة للشمس.
 *  ٥. **ضباب الأفق** — شريطٌ يفصل البعيد عن القريب.
 *
 * ## الوضعان
 *
 * لا لون هنا مكتوبٌ بالجافاسكربت. كل ألوان المشهد رموز CSS
 * (`--twin-*` في `styles.css`) تُعاد تعريفها تحت `html.dark`. فالمشهد
 * يتبع الوضع بلا قراءة حالة ولا إعادة رسم — وهي القاعدة نفسها المطبَّقة
 * على بقيّة النظام: اللون في طبقة الرموز، لا في الترميز.
 *
 * ## فخّ الكتلة الحاوية
 *
 * لا `filter` ولا `transform` ولا `will-change` على أي عنصر HTML يلفّ هذا
 * المكوّن — أيٌّ منها يُسقط كل `position: fixed` بداخله إلى نفسه، وقد
 * كسر ذلك خلفيّة الرئيسية ثلاث مرّات. المرشّحات هنا **داخل `<svg>`
 * وحدها** (`<filter>`)، وهي لا تُنشئ كتلةً حاوية لعناصر HTML.
 */
import { useId } from "react";
import type { RegionId } from "@/lib/regions";
import { REGION_ACCENT_HEX } from "@/lib/regions";
import {
  HORIZON_Y,
  SCENE_H,
  SCENE_W,
  SUN,
  TWIN_PROFILES,
  anchorPoints,
  type Structure,
  type TwinProfile,
} from "./region-twin-profiles";

/** حالة الأصل الحيّ. الشكل يحمل المعنى مع اللون، لا اللون وحده. */
export type AssetTone = "ok" | "warn" | "danger";

export interface TwinAsset {
  id: string;
  labelAr: string;
  tone: AssetTone;
}

interface Props {
  regionId: RegionId;
  /** أصول حيّة تُثبَّت على المشهد. الفراغ مقبول — يبقى المشهد. */
  assets?: TwinAsset[];
  className?: string;
}

/* ────────────────────────────  البنى  ──────────────────────────── */

/**
 * كل راسم يتلقّى `dim` (بعيد أم قريب). البعيد يفقد التفصيل لا الشكل —
 * فالتفصيل على مسافةٍ ضجيجٌ يفضح الرسم بدل أن يُقنع به.
 */
function Block({ s, dim }: { s: Structure; dim: boolean }) {
  const top = HORIZON_Y - s.h;
  const d = s.depth ?? 0;
  const cols = Math.max(2, Math.round(s.w / 34));
  const rows = Math.max(2, Math.round(s.h / 30));
  return (
    <g>
      {/* الوجه الجانبي المظلم — بعيدًا عن الشمس (يمينًا) */}
      {d > 0 && (
        <path
          d={`M${s.x + s.w} ${top} L${s.x + s.w + d} ${top + d * 0.42} L${s.x + s.w + d} ${HORIZON_Y} L${s.x + s.w} ${HORIZON_Y} Z`}
          fill="var(--twin-face-shadow)"
        />
      )}
      {/* السطح — الأشدّ إضاءةً لأنه يواجه السماء */}
      {d > 0 && (
        <path
          d={`M${s.x} ${top} L${s.x + d} ${top - d * 0.3} L${s.x + s.w + d} ${top + d * 0.42 - d * 0.72} L${s.x + s.w} ${top} Z`}
          fill="var(--twin-face-roof)"
        />
      )}
      {/* الوجه المضاء */}
      <rect x={s.x} y={top} width={s.w} height={s.h} fill="var(--twin-face-lit)" />
      {/* حافّة لامعة حيث تلقى الشمس */}
      <rect x={s.x} y={top} width={1.5} height={s.h} fill="var(--twin-rim)" opacity={0.85} />
      {!dim && (
        <g fill="var(--twin-window)">
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              // نافذةٌ مضاءة من كلّ ثلاث — الصفّ الكامل المضاء يبدو مطبوعًا.
              const lit = (r * cols + c) % 3 !== 1;
              if (!lit) return null;
              return (
                <rect
                  key={`${r}-${c}`}
                  x={s.x + 8 + c * ((s.w - 16) / cols)}
                  y={top + 10 + r * ((s.h - 18) / rows)}
                  width={Math.max(3, (s.w - 16) / cols - 7)}
                  height={Math.max(3, (s.h - 18) / rows - 9)}
                  opacity={0.28 + ((r * 7 + c * 3) % 5) * 0.11}
                />
              );
            }),
          )}
        </g>
      )}
    </g>
  );
}

function Tank({ s, dim, gid }: { s: Structure; dim: boolean; gid: (n: string) => string }) {
  const top = HORIZON_Y - s.h;
  const ry = Math.max(5, s.w * 0.16);
  return (
    <g>
      {/* جسم أسطواني: التدرّج الأفقي هو ما يجعله مستديرًا لا مسطّحًا */}
      <rect x={s.x} y={top} width={s.w} height={s.h} fill={`url(#${gid("cyl")})`} />
      {/* الغطاء العلوي */}
      <ellipse cx={s.x + s.w / 2} cy={top} rx={s.w / 2} ry={ry} fill="var(--twin-face-roof)" />
      {!dim && (
        <ellipse
          cx={s.x + s.w / 2}
          cy={top}
          rx={s.w / 2}
          ry={ry}
          fill="none"
          stroke="var(--twin-rim)"
          strokeWidth={1.2}
          opacity={0.7}
        />
      )}
      {!dim && (
        <>
          {/* أطواق التقوية — تقرأ المقاس وتُثبت الأسطوانة */}
          {[0.34, 0.62, 0.86].map((f) => (
            <rect
              key={f}
              x={s.x}
              y={top + s.h * f}
              width={s.w}
              height={1.4}
              fill="var(--twin-line)"
              opacity={0.55}
            />
          ))}
          {/* سلّم جانبي */}
          <rect
            x={s.x + s.w * 0.82}
            y={top + ry}
            width={2}
            height={s.h - ry}
            fill="var(--twin-line)"
            opacity={0.75}
          />
        </>
      )}
    </g>
  );
}

function Stack({
  s,
  dim,
  accent,
  gid,
}: {
  s: Structure;
  dim: boolean;
  accent: string;
  gid: (n: string) => string;
}) {
  const top = HORIZON_Y - s.h;
  const half = s.w / 2;
  const cx = s.x + half;
  // مدخنة مخروطية: القاعدة أعرض من الفوّهة.
  const mouth = half * 0.52;
  return (
    <g>
      <path
        d={`M${cx - mouth} ${top} L${cx + mouth} ${top} L${s.x + s.w} ${HORIZON_Y} L${s.x} ${HORIZON_Y} Z`}
        fill={`url(#${gid("cyl")})`}
      />
      <path
        d={`M${cx - mouth} ${top} L${cx - mouth + 2} ${top} L${s.x + 2.5} ${HORIZON_Y} L${s.x} ${HORIZON_Y} Z`}
        fill="var(--twin-rim)"
        opacity={0.8}
      />
      {!dim &&
        [0.28, 0.56, 0.82].map((f) => {
          const y = top + s.h * f;
          const w = mouth + (half - mouth) * f;
          return (
            <rect
              key={f}
              x={cx - w}
              y={y}
              width={w * 2}
              height={1.4}
              fill="var(--twin-line)"
              opacity={0.5}
            />
          );
        })}
      {s.flare && (
        <g className="nx-twin-flare">
          {/* الشعلة: لهبٌ ثم هالة. اللون من لهجة المنطقة لا من قيمة ثابتة. */}
          <circle cx={cx} cy={top - 18} r={34} fill={accent} opacity={0.16} />
          <path
            d={`M${cx} ${top - 74} C${cx - 24} ${top - 44} ${cx - 19} ${top - 6} ${cx} ${top - 1} C${cx + 19} ${top - 6} ${cx + 24} ${top - 44} ${cx} ${top - 74} Z`}
            fill={`url(#${gid("flame")})`}
          />
        </g>
      )}
    </g>
  );
}

function Pylon({ s }: { s: Structure }) {
  const top = HORIZON_Y - s.h;
  const halfTop = s.w * 0.17;
  const halfBase = s.w / 2;
  const cx = s.x + halfBase;
  const braces = Math.max(3, Math.round(s.h / 26));
  return (
    <g stroke="var(--twin-lattice)" strokeWidth={1.8} fill="none" strokeLinecap="round">
      <path d={`M${cx - halfTop} ${top} L${s.x} ${HORIZON_Y}`} />
      <path d={`M${cx + halfTop} ${top} L${s.x + s.w} ${HORIZON_Y}`} />
      {/* الذراعان الحاملان للأسلاك */}
      <path
        d={`M${cx - halfBase * 1.16} ${top + s.h * 0.16} L${cx + halfBase * 1.16} ${top + s.h * 0.16}`}
      />
      <path
        d={`M${cx - halfBase * 0.92} ${top + s.h * 0.36} L${cx + halfBase * 0.92} ${top + s.h * 0.36}`}
      />
      {Array.from({ length: braces }).map((_, i) => {
        const f0 = i / braces;
        const f1 = (i + 1) / braces;
        const y0 = top + s.h * f0;
        const y1 = top + s.h * f1;
        const w0 = halfTop + (halfBase - halfTop) * f0;
        const w1 = halfTop + (halfBase - halfTop) * f1;
        // ضفيرة متقاطعة — هي ما يقرأه العين كبرج شبكي لا كمثلّث مصمت.
        return (
          <path
            key={i}
            d={`M${cx - w0} ${y0} L${cx + w1} ${y1} M${cx + w0} ${y0} L${cx - w1} ${y1}`}
            opacity={0.82}
          />
        );
      })}
    </g>
  );
}

function Crane({ s }: { s: Structure }) {
  const top = HORIZON_Y - s.h;
  const mastX = s.x + s.w * 0.62;
  const jibY = top + s.h * 0.14;
  return (
    <g stroke="var(--twin-lattice)" strokeWidth={2.2} fill="none" strokeLinecap="round">
      {/* السارية والدعامة المائلة */}
      <path d={`M${mastX} ${top} L${mastX} ${HORIZON_Y}`} />
      <path d={`M${mastX} ${top + s.h * 0.3} L${s.x + s.w} ${HORIZON_Y}`} />
      {/* الذراع الأمامي والذراع الموازن */}
      <path d={`M${s.x} ${jibY} L${mastX + s.w * 0.26} ${jibY}`} strokeWidth={3} />
      <path d={`M${s.x + s.w * 0.1} ${top} L${mastX} ${jibY}`} />
      {/* حبل الرفع — الخيط الرأسي هو ما يجعلها رافعة لا هيكلًا */}
      <path
        d={`M${s.x + s.w * 0.16} ${jibY} L${s.x + s.w * 0.16} ${jibY + s.h * 0.38}`}
        strokeWidth={1.2}
        opacity={0.8}
      />
      <rect
        x={s.x + s.w * 0.16 - 6}
        y={jibY + s.h * 0.38}
        width={12}
        height={9}
        fill="var(--twin-face-shadow)"
        stroke="none"
      />
    </g>
  );
}

function Dome({ s, gid }: { s: Structure; gid: (n: string) => string }) {
  const top = HORIZON_Y - s.h;
  return (
    <g>
      <path
        d={`M${s.x} ${HORIZON_Y} A${s.w / 2} ${s.h} 0 0 1 ${s.x + s.w} ${HORIZON_Y} Z`}
        fill={`url(#${gid("dome")})`}
      />
      <path
        d={`M${s.x + s.w * 0.06} ${HORIZON_Y} A${s.w / 2} ${s.h} 0 0 1 ${s.x + s.w * 0.4} ${top + s.h * 0.1}`}
        fill="none"
        stroke="var(--twin-rim)"
        strokeWidth={1.6}
        opacity={0.7}
      />
    </g>
  );
}

function Shape({
  s,
  dim,
  accent,
  gid,
}: {
  s: Structure;
  dim: boolean;
  accent: string;
  gid: (n: string) => string;
}) {
  switch (s.kind) {
    case "block":
      return <Block s={s} dim={dim} />;
    case "tank":
      return <Tank s={s} dim={dim} gid={gid} />;
    case "stack":
      return <Stack s={s} dim={dim} accent={accent} gid={gid} />;
    case "pylon":
      return <Pylon s={s} />;
    case "crane":
      return <Crane s={s} />;
    case "dome":
      return <Dome s={s} gid={gid} />;
  }
}

/** الظلّ الملامس — بدونه تطفو البنية فوق الأرض مهما أُتقن وجهها. */
function ContactShadow({ s }: { s: Structure }) {
  const d = s.depth ?? 0;
  return (
    <ellipse
      cx={s.x + s.w / 2 + s.w * 0.16 + d * 0.4}
      cy={HORIZON_Y + 3}
      rx={s.w * 0.72 + d}
      ry={Math.max(4, s.w * 0.09)}
      fill="var(--twin-contact)"
    />
  );
}

/* ────────────────────────  مرابط الأصول  ──────────────────────── */

const TONE_VAR: Record<AssetTone, string> = {
  ok: "var(--tone-emerald)",
  warn: "var(--tone-amber)",
  danger: "var(--tone-rose)",
};

/**
 * الشكل يفرّق قبل اللون: دائرة سليم · مثلّث تحذير · مثمّن خطر — عرف لوحات
 * السلامة نفسه المطبَّق في `stat-tone`. والزوج أحمر/كهرماني هو الزوج الذي
 * يطمسه عمى الألوان الأحمر-الأخضر، على مشهدٍ وظيفته الإنذار
 * (WCAG 2.2 §1.4.1).
 */
function ToneMark({ tone }: { tone: AssetTone }) {
  const fill = TONE_VAR[tone];
  if (tone === "ok") return <circle r={5} fill={fill} />;
  if (tone === "warn") return <path d="M0 -6.4 L6 4.4 L-6 4.4 Z" fill={fill} />;
  const k = 7.6;
  const m = k * 0.414;
  return (
    <g>
      <path
        d={`M${-m} ${-k} L${m} ${-k} L${k} ${-m} L${k} ${m} L${m} ${k} L${-m} ${k} L${-k} ${m} L${-k} ${-m} Z`}
        fill={fill}
        stroke="var(--twin-rim)"
        strokeWidth={1.1}
        strokeLinejoin="miter"
      />
      {/* المثمّن عند هذا المقاس يُقرأ دائرةً مهما حُدَّت أضلاعه — فيسقط
          تمييز الشكل ويعود اللون وحده حاملًا للمعنى، وهو ما تمنعه
          WCAG 2.2 §1.4.1 على لوحةٍ وظيفتها الإنذار. فيُضاف علمُ تعجّبٍ
          داخله: لا يعتمد على مقاسٍ ولا على تمييز لونٍ إطلاقًا. */}
      <rect x={-1} y={-4.2} width={2} height={4.6} rx={1} fill="var(--twin-pin-halo)" />
      <circle cy={2.9} r={1.2} fill="var(--twin-pin-halo)" />
    </g>
  );
}

/* ──────────────────────────  المشهد  ────────────────────────── */

export function RegionTwinScene({ regionId, assets = [], className }: Props) {
  const profile: TwinProfile = TWIN_PROFILES[regionId];
  const accent = REGION_ACCENT_HEX[regionId];
  // المعرّفات فريدة لكل نسخة: مشهدان على صفحة واحدة يتشاركان `url(#…)`
  // فيسرق الثاني تدرّجات الأوّل — عطلٌ لا يظهر إلّا عند التكرار.
  const uid = useId().replace(/:/g, "");
  const ref = (name: string) => `${name}-${uid}`;
  const pins = anchorPoints(profile, assets.length);

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
        className="nx-twin-scene"
        role="img"
        aria-label={profile.captionAr}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={ref("sky")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--twin-sky-1)" />
            <stop offset="58%" stopColor="var(--twin-sky-2)" />
            <stop offset="100%" stopColor="var(--twin-sky-3)" />
          </linearGradient>
          <radialGradient id={ref("sun")}>
            <stop offset="0%" stopColor="var(--twin-sun)" stopOpacity="0.95" />
            <stop offset="45%" stopColor="var(--twin-sun)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--twin-sun)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={ref("cyl")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--twin-face-shadow)" />
            <stop offset="26%" stopColor="var(--twin-face-lit)" />
            <stop offset="42%" stopColor="var(--twin-face-roof)" />
            <stop offset="72%" stopColor="var(--twin-face-lit)" />
            <stop offset="100%" stopColor="var(--twin-face-shadow)" />
          </linearGradient>
          <radialGradient id={ref("dome")} cx="0.34" cy="0.2" r="0.9">
            <stop offset="0%" stopColor="var(--twin-face-roof)" />
            <stop offset="52%" stopColor="var(--twin-face-lit)" />
            <stop offset="100%" stopColor="var(--twin-face-shadow)" />
          </radialGradient>
          <linearGradient id={ref("flame")} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--tone-amber)" />
            <stop offset="55%" stopColor="var(--tone-amber)" stopOpacity="0.72" />
            <stop offset="100%" stopColor="var(--tone-rose)" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id={ref("water")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--twin-water-1)" />
            <stop offset="100%" stopColor="var(--twin-water-2)" />
          </linearGradient>
          <linearGradient id={ref("ground")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--twin-ground-0)" />
            <stop offset="18%" stopColor="var(--twin-ground-1)" />
            <stop offset="100%" stopColor="var(--twin-ground-2)" />
          </linearGradient>
          <linearGradient id={ref("haze")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--twin-haze)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--twin-haze)" stopOpacity="0.85" />
          </linearGradient>
          {/* المرشّح داخل SVG — لا يُنشئ كتلةً حاوية لعناصر HTML. */}
          <filter id={ref("soft")} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* ① السماء */}
        <rect width={SCENE_W} height={HORIZON_Y} fill={`url(#${ref("sky")})`} />
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r * 4.6} fill={`url(#${ref("sun")})`} />
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill="var(--twin-sun)" opacity="0.9" />

        {/* ② التضاريس البعيدة — تُطلى بلون الأفق فتبتعد */}
        <path d={profile.ridge} fill="var(--twin-ridge)" />

        {/* ③ الماء أو الأرض */}
        {profile.water ? (
          <>
            <rect
              y={HORIZON_Y - 34}
              width={SCENE_W}
              height={SCENE_H - HORIZON_Y + 34}
              fill={`url(#${ref("water")})`}
            />
            {/* انعكاس الشمس: خطوطٌ متناقصة العرض نحو الأفق */}
            <g fill="var(--twin-sun)" opacity="0.3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <rect
                  key={i}
                  x={SUN.x - (30 - i * 4)}
                  y={HORIZON_Y - 26 + i * 13}
                  width={(30 - i * 4) * 2}
                  height={3}
                  rx={1.5}
                  opacity={0.85 - i * 0.13}
                />
              ))}
            </g>
          </>
        ) : (
          <rect
            y={HORIZON_Y}
            width={SCENE_W}
            height={SCENE_H - HORIZON_Y}
            fill={`url(#${ref("ground")})`}
          />
        )}

        {/* ④ الطبقة الوسطى ثم ضباب الأفق فوقها — هو ما يفصل بعيدًا عن قريب */}
        <g opacity="0.72">
          {profile.mid.map((s, i) => (
            <Shape key={`m${i}`} s={s} dim accent={accent} gid={ref} />
          ))}
        </g>
        <rect
          y={HORIZON_Y - 54}
          width={SCENE_W}
          height={62}
          fill={`url(#${ref("haze")})`}
          pointerEvents="none"
        />

        {/* ⑤ المقدّمة: ظلٌّ ملامس ثم الجسم */}
        <g filter={`url(#${ref("soft")})`} opacity="0.55">
          {profile.near.map((s, i) => (
            <ContactShadow key={`cs${i}`} s={s} />
          ))}
        </g>
        {profile.near.map((s, i) => (
          <Shape key={`n${i}`} s={s} dim={false} accent={accent} gid={ref} />
        ))}

        {/* ⑥ خطّ الأساس — يمنع البنى من الغرق في الأرض */}
        <rect y={HORIZON_Y - 1} width={SCENE_W} height={2} fill="var(--twin-line)" opacity="0.4" />

        {/* ⑦ الأصول الحيّة */}
        {pins.map((p, i) => {
          const asset = assets[i];
          return (
            <g key={asset.id} transform={`translate(${p.x} ${p.y})`}>
              <title>{`${asset.labelAr} — ${asset.tone === "ok" ? "سليم" : asset.tone === "warn" ? "تحذير" : "خطر"}`}</title>
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={12}
                stroke="var(--twin-line)"
                strokeWidth={1.2}
                opacity={0.6}
              />
              <circle
                r={12}
                fill="var(--twin-pin-halo)"
                stroke="var(--twin-rim)"
                strokeWidth={1.2}
              />
              <ToneMark tone={asset.tone} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
