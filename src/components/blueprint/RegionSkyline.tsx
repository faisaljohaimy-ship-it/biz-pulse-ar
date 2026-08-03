/**
 * «أفق المناطق الأربع» — لوحة الصفحة الرئيسية الفنية (نسخة الهولوغرام).
 *
 * بانوراما صناعية بإسقاط هولوغرامي ثلاثي الأبعاد: كل منشأة تُبنى من وجه
 * أمامي شفاف متوهّج بلون منطقتها + وجوه عمق مُزاحة (٩-، ٦-) تصنع المجسّم،
 * فوق بِركة إسقاط ضوئية عند القاعدة، وخلف الجميع خطوط مسح أفقية ووميض
 * بطيء — لغة الهولوغرام لا الرسم التخطيطي. العناقيد الأربعة: برج نقل
 * شبكي بعوازله · محطة تحويل بمحوّلين وجسر قضبان · حقل صهاريج بسلّمه
 * ومدخنته · منشأة بنوافذ مضيئة ورافعة برجية كاملة الأذرع.
 *
 * الألوان من `regions.ts` تمرّ متغيّرات (`--sk-hue`)، والحركة خصائص
 * مستقلّة، واللوحة زينة محضة (`aria-hidden`) — كل معلومة فيها مقروءة
 * نصًّا في أزرار المناطق فوقها.
 */
import { REGIONS, REGION_ACCENT_HEX } from "@/lib/regions";

const W = 1200;
const HORIZON = 200;
/** مراكز العناقيد الأربعة على الأفق — بترتيب مصدر المناطق الوحيد. */
const XS = [150, 450, 750, 1050];
/** نقاط تعلّق خط الطاقة — قمم فعلية: البرج، صاري المحطة، المدخنة، الرافعة. */
const TOPS: Array<[number, number]> = [
  [150, 86],
  [450, 110],
  [790, 100],
  [1067, 86],
];

/** برج نقل شبكي — وجهان متصلان بعمق، ذراع عزل، ومصباح تحذير. */
function Pylon({ x }: { x: number }) {
  return (
    <g>
      {/* الإطار الخلفي المُزاح — عمق المجسّم */}
      <path
        className="nx-sk-depth"
        strokeWidth="1.2"
        d={`M${x - 39} 194 L${x - 17} 86 M${x + 21} 194 L${x - 1} 86 M${x - 17} 86 h16
            M${x - 33} 164 h48 M${x - 28} 140 h38
            M${x - 8} 92 L${x - 17} 86 M${x + 8} 92 L${x - 1} 86
            M${x - 30} 200 L${x - 39} 194 M${x + 30} 200 L${x + 21} 194`}
      />
      {/* الهيكل الأمامي المتوهّج */}
      <path
        className="nx-sk-hot"
        strokeWidth="1.8"
        d={`M${x - 30} 200 L${x - 8} 92 M${x + 30} 200 L${x + 8} 92 M${x - 8} 92 h16`}
      />
      {/* التشبيك الشبكي */}
      <path
        className="nx-sk-detail"
        strokeWidth="1.1"
        d={`M${x - 24} 170 h48 M${x - 19} 146 h38 M${x - 14} 122 h28
            M${x - 24} 170 L${x + 19} 146 M${x + 24} 170 L${x - 19} 146
            M${x - 19} 146 L${x + 14} 122 M${x + 19} 146 L${x - 14} 122
            M${x - 14} 122 L${x + 8} 92 M${x + 14} 122 L${x - 8} 92`}
      />
      {/* ذراع العزل وعوازلها المتدلية */}
      <path className="nx-sk-hot" strokeWidth="2" d={`M${x - 27} 106 h54`} />
      <path
        className="nx-sk-detail"
        strokeWidth="1.2"
        d={`M${x - 20} 106 v7 M${x + 20} 106 v7 M${x} 106 v7`}
      />
      <circle className="nx-sk-glass" cx={x - 20} cy={115} r="1.8" />
      <circle className="nx-sk-glass" cx={x + 20} cy={115} r="1.8" />
      <circle className="nx-sk-glass" cx={x} cy={115} r="1.8" />
      <circle className="nx-sk-beacon" cx={x} cy={86} r="2.6" />
    </g>
  );
}

/** محطة تحويل — محوّلان مجسّمان بمشعّات وعوازل، وجسر قضبان بصاري. */
function Substation({ x }: { x: number }) {
  return (
    <g>
      {/* جسر القضبان: قائمان وعارضة وصاري مركزي */}
      <path
        className="nx-sk-hot"
        strokeWidth="1.8"
        d={`M${x - 46} 200 V128 M${x + 46} 200 V128 M${x - 50} 128 h100 M${x} 128 V112`}
      />
      {/* سلاسل العوازل وأسلاك الهبوط */}
      <path
        className="nx-sk-detail"
        strokeWidth="1"
        d={`M${x - 28} 128 v5 M${x} 128 v5 M${x + 28} 128 v5
            M${x - 28} 139 L${x - 31} 150 M${x + 28} 139 L${x + 25} 142`}
      />
      {[x - 28, x, x + 28].map((cx) =>
        [134, 137].map((cy) => (
          <ellipse key={`${cx}-${cy}`} className="nx-sk-detail" cx={cx} cy={cy} rx="2.6" ry="1.1" />
        )),
      )}
      {/* المحوّل الأيسر: وجه + سقف + جانب + مشعّات + جلب عزل */}
      <path
        className="nx-sk-depth"
        d={`M${x - 42} 156 L${x - 51} 150 H${x - 21} L${x - 12} 156 Z`}
      />
      <path className="nx-sk-depth" d={`M${x - 51} 150 V194 L${x - 42} 200 V156 Z`} />
      <rect className="nx-sk-face" x={x - 42} y={156} width="30" height="44" strokeWidth="1.4" />
      <path
        className="nx-sk-detail"
        strokeWidth="1"
        d={`M${x - 37} 162 v32 M${x - 32} 162 v32 M${x - 27} 162 v32 M${x - 22} 162 v32`}
      />
      <path
        className="nx-sk-detail"
        strokeWidth="1.2"
        d={`M${x - 36} 156 v-8 M${x - 27} 156 v-8 M${x - 18} 156 v-8`}
      />
      <circle className="nx-sk-glass" cx={x - 36} cy={146} r="1.7" />
      <circle className="nx-sk-glass" cx={x - 27} cy={146} r="1.7" />
      <circle className="nx-sk-glass" cx={x - 18} cy={146} r="1.7" />
      {/* المحوّل الأيمن الأكبر */}
      <path className="nx-sk-depth" d={`M${x + 8} 148 L${x - 1} 142 H${x + 33} L${x + 42} 148 Z`} />
      <rect className="nx-sk-face" x={x + 8} y={148} width="34" height="52" strokeWidth="1.4" />
      <path
        className="nx-sk-detail"
        strokeWidth="1"
        d={`M${x + 13} 154 v40 M${x + 19} 154 v40 M${x + 25} 154 v40 M${x + 31} 154 v40 M${x + 37} 154 v40`}
      />
      <path
        className="nx-sk-detail"
        strokeWidth="1.2"
        d={`M${x + 14} 148 v-9 M${x + 25} 148 v-9 M${x + 36} 148 v-9`}
      />
      <circle className="nx-sk-glass" cx={x + 14} cy={137} r="1.7" />
      <circle className="nx-sk-glass" cx={x + 25} cy={137} r="1.7" />
      <circle className="nx-sk-glass" cx={x + 36} cy={137} r="1.7" />
      <circle className="nx-sk-beacon" cx={x} cy={110} r="2.4" />
    </g>
  );
}

/** حقل صهاريج — أسطوانتان بلحامات وسلّم، ومدخنة مطوّقة مضيئة الرأس. */
function Tanks({ x }: { x: number }) {
  return (
    <g>
      {/* الصهريج الخلفي الصغير — عمق المشهد */}
      <path className="nx-sk-depth" d={`M${x + 3} 164 v30 a13 5 0 0 0 26 0 v-30`} />
      <ellipse className="nx-sk-depth" cx={x + 16} cy={164} rx="13" ry="5" />
      {/* الصهريج الرئيسي: جسم + قبة + لحامات + سلّم */}
      <path
        className="nx-sk-face"
        strokeWidth="1.4"
        d={`M${x - 46} 150 v44 a18 7 0 0 0 36 0 v-44`}
      />
      <ellipse className="nx-sk-face" cx={x - 28} cy={150} rx="18" ry="7" strokeWidth="1.4" />
      <path
        className="nx-sk-detail"
        strokeWidth="1"
        d={`M${x - 46} 165 a18 7 0 0 0 36 0 M${x - 46} 180 a18 7 0 0 0 36 0`}
      />
      <path
        className="nx-sk-detail"
        strokeWidth="1.1"
        d={`M${x - 13} 150 v46 M${x - 9} 150 v46 M${x - 13} 158 h4 M${x - 13} 166 h4 M${x - 13} 174 h4 M${x - 13} 182 h4 M${x - 13} 190 h4`}
      />
      {/* المدخنة المخروطية وأطواقها */}
      <path
        className="nx-sk-face"
        strokeWidth="1.4"
        d={`M${x + 36} 200 L${x + 38} 104 h5 L${x + 45} 200 Z`}
      />
      <path
        className="nx-sk-detail"
        strokeWidth="1"
        d={`M${x + 37.4} 128 h6.4 M${x + 36.9} 152 h7.4 M${x + 36.4} 176 h8.6`}
      />
      <circle className="nx-sk-beacon" cx={x + 40.5} cy={100} r="2.6" />
    </g>
  );
}

/** منشأة برافعة برجية — مبنى مجسّم بنوافذ مضيئة ورافعة كاملة الأذرع. */
function Plant({ x }: { x: number }) {
  const lit = new Set([0, 5, 7, 9, 10]);
  return (
    <g>
      {/* المبنى: سقف وجانب بعمق ثم الوجه ونوافذه */}
      <path
        className="nx-sk-depth"
        d={`M${x - 48} 144 L${x - 57} 138 H${x - 15} L${x - 6} 144 Z`}
      />
      <path className="nx-sk-depth" d={`M${x - 57} 138 V194 L${x - 48} 200 V144 Z`} />
      <path className="nx-sk-depth" d={`M${x - 40} 138 v-6 h10 v6`} />
      <rect className="nx-sk-face" x={x - 48} y={144} width="42" height="56" strokeWidth="1.4" />
      <path className="nx-sk-hot" strokeWidth="1.6" d={`M${x - 50} 144 h46`} />
      {Array.from({ length: 12 }, (_, i) => {
        const wx = x - 42 + (i % 3) * 13;
        const wy = 152 + Math.floor(i / 3) * 11;
        return lit.has(i) ? (
          <rect key={i} className="nx-sk-glass" x={wx} y={wy} width="7" height="6" rx="1" />
        ) : (
          <rect
            key={i}
            className="nx-sk-detail"
            x={wx}
            y={wy}
            width="7"
            height="6"
            rx="1"
            fill="none"
            strokeWidth="0.9"
          />
        );
      })}
      {/* الرافعة: صارٍ مشبّك، قمة، ذراع أمامية بعربة وخطاف، ذراع خلفية بثقل */}
      <path className="nx-sk-hot" strokeWidth="1.6" d={`M${x + 14} 200 V104 M${x + 20} 200 V104`} />
      <path
        className="nx-sk-detail"
        strokeWidth="1"
        d={`M${x + 14} 192 L${x + 20} 184 M${x + 20} 192 L${x + 14} 184
            M${x + 14} 176 L${x + 20} 168 M${x + 20} 176 L${x + 14} 168
            M${x + 14} 160 L${x + 20} 152 M${x + 20} 160 L${x + 14} 152
            M${x + 14} 144 L${x + 20} 136 M${x + 20} 144 L${x + 14} 136
            M${x + 14} 128 L${x + 20} 120 M${x + 20} 128 L${x + 14} 120`}
      />
      <path
        className="nx-sk-hot"
        strokeWidth="1.6"
        d={`M${x + 14} 104 L${x + 17} 88 L${x + 20} 104`}
      />
      <path
        className="nx-sk-hot"
        strokeWidth="1.6"
        d={`M${x + 20} 104 H${x + 64} M${x + 14} 104 H${x - 4}`}
      />
      <path
        className="nx-sk-detail"
        strokeWidth="1"
        d={`M${x + 20} 109 H${x + 58} M${x + 24} 104 L${x + 28} 109 M${x + 32} 104 L${x + 36} 109 M${x + 40} 104 L${x + 44} 109 M${x + 48} 104 L${x + 52} 109
            M${x + 17} 88 L${x + 56} 100 M${x + 17} 88 L${x - 2} 100`}
      />
      <rect className="nx-sk-face" x={x - 6} y={104} width="9" height="9" strokeWidth="1.2" />
      <path
        className="nx-sk-detail"
        strokeWidth="1.1"
        d={`M${x + 46} 104 v22 M${x + 44} 126 h4 l-2 4 Z`}
      />
      <circle className="nx-sk-beacon" cx={x + 17} cy={86} r="2.6" />
    </g>
  );
}

const CLUSTERS = [Pylon, Substation, Tanks, Plant] as const;

/** مقاطع خط الطاقة بين القمم — كل مقطع بلون منطقة وصوله. */
const wire = (a: [number, number], b: [number, number]) =>
  `M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2} ${Math.max(a[1], b[1]) + 48} ${b[0]} ${b[1]}`;

export function RegionSkyline({ ar }: { ar: boolean }) {
  /** العربية تُقرأ من اليمين: أول المناطق يسكن أقصى يمين الأفق. */
  const ordered = ar ? [...REGIONS].reverse() : REGIONS;
  return (
    <svg
      viewBox={`0 0 ${W} 240`}
      className="nx-sk w-full"
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id="nx-sk-sky">
          <rect x="0" y="0" width={W} height={HORIZON - 1} />
        </clipPath>
        {/* خطوط المسح — بصمة شاشة الإسقاط الهولوغرامي */}
        <pattern id="nx-sk-scanp" width="4" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0.5" x2="4" y2="0.5" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>

      {/* الشمس الهندسية — توريقٌ يشرق خلف الأفق ولا يكتمل. قطرها محسوب
          ليبقى تحت انحناء الأسلاك فلا يتشابك الرمز مع الشبكة. */}
      <g clipPath="url(#nx-sk-sky)">
        <g className="nx-sk-sun">
          <rect x="536" y="141" width="128" height="128" fill="none" strokeWidth="1.4" />
          <rect
            x="536"
            y="141"
            width="128"
            height="128"
            fill="none"
            strokeWidth="1.4"
            transform="rotate(45 600 205)"
          />
          <circle cx="600" cy="205" r="42" fill="none" strokeWidth="1.4" />
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i * Math.PI) / 8;
            return (
              <line
                key={i}
                x1={600 + 98 * Math.cos(a)}
                y1={205 + 98 * Math.sin(a)}
                x2={600 + 112 * Math.cos(a)}
                y2={205 + 112 * Math.sin(a)}
                strokeWidth="1.4"
              />
            );
          })}
        </g>
      </g>

      {/* قباب التوهّج — سماء كل منطقة بلونها */}
      {ordered.map((region, i) => (
        <ellipse
          key={`d-${region.id}`}
          className="nx-sk-dome"
          style={{ ["--sk-hue" as string]: REGION_ACCENT_HEX[region.id] }}
          cx={XS[i]}
          cy={HORIZON}
          rx="115"
          ry="72"
        />
      ))}

      {/* خط الأفق وصداه */}
      <path className="nx-sk-horizon" d={`M0 ${HORIZON} H${W}`} strokeWidth="1.5" />
      <path
        className="nx-sk-line"
        strokeWidth="0.8"
        d={`M40 214 H${W - 40} M110 226 H${W - 110}`}
      />

      {/* خط الطاقة: أساس منقّط + نبضات تسري بلون منطقة الوصول */}
      {TOPS.slice(0, -1).map((a, i) => {
        const b = TOPS[i + 1];
        const d = wire(a, b);
        const hue = REGION_ACCENT_HEX[ordered[i + 1].id];
        return (
          <g key={`w-${i}`} style={{ ["--sk-hue" as string]: hue, ["--sk-i" as string]: i }}>
            <path className="nx-sk-wire" d={d} />
            <path className="nx-sk-pulse" d={d} />
          </g>
        );
      })}

      {/* العناقيد الأربعة: بِركة إسقاط ثم المجسّم الهولوغرامي ثم الاسم */}
      {ordered.map((region, i) => {
        const Cluster = CLUSTERS[i % CLUSTERS.length];
        return (
          <g key={region.id} style={{ ["--sk-hue" as string]: REGION_ACCENT_HEX[region.id] }}>
            <ellipse className="nx-sk-base" cx={XS[i]} cy={201} rx="82" ry="9" />
            <g className="nx-sk-holo" style={{ ["--sk-i" as string]: i }}>
              <Cluster x={XS[i]} />
            </g>
            <text x={XS[i]} y={228} textAnchor="middle" className="nx-sk-name">
              {ar ? region.shortAr : region.shortEn}
            </text>
          </g>
        );
      })}

      {/* غلالة المسح فوق مشهد الإسقاط كاملًا */}
      <rect
        className="nx-sk-scan"
        x="0"
        y="64"
        width={W}
        height={HORIZON - 65}
        fill="url(#nx-sk-scanp)"
      />
    </svg>
  );
}

export default RegionSkyline;
