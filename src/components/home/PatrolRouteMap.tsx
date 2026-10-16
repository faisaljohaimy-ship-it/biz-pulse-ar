/**
 * خريطة مسارات الدوريات — **رسمٌ توضيحي** بأسلوب صورة المالك (قرار N3،
 * ٢٠٢٦/١٠/١٤: «صور توضيحية موسومة (موصى به)»؛ و«خريطة الدوريات تُرسم SVG
 * بحسب الوضع، لا صورة»).
 *
 * - **لا هندسة مسار حقيقية في المخطط** (§9): الشوارع والمسارات ونقاط التفتيش
 *   والمركبات هنا رسمٌ ثابت مأخوذ من الصورة (مقيسٌ على بكسلاتها 290×199)، لا
 *   مواقع حيّة. فالرسم يُعلن ذلك بنفسه: `role="img"` باسمٍ يقول «صورة توضيحية
 *   — لا بثّ مرتبط»، وبطاقته تكتب الوسم ظاهرًا.
 * - **ألوانه رموزٌ لا قيم** (المواد ٣٢–٣٤): كل عنصر صنفٌ تُلوّنه
 *   `styles/home/home-ops.css` من طبقة الرموز، فينقلب مع الوضع (أرضٌ فاتحة
 *   وشوارع بيضاء فاتحًا؛ أرضٌ ليلية وشوارع أفتح منها داكنًا). لا `fill`
 *   بقيمةٍ نهائية هنا، ورموز الدبابيس `currentColor`.
 * - **حتمي**: الشوارع الثانوية تُولَّد مرّةً عند تحميل الوحدة من مولّدٍ ببذرةٍ
 *   ثابتة، فيتطابق رسم الخادم والعميل حرفًا (لا عدم تطابقٍ عند الإرواء).
 * - `preserveAspectRatio="xMinYMid slice"`: الرسم يملأ خانته في كل عرض، وما
 *   يُقصّ عند الضيق طرفه الأيمن — وهو ما تغطّيه أرقام البطاقة أصلًا.
 */
import { BusFront, CarFront, type LucideIcon } from "lucide-react";

/** مقاس الخريطة في الصورة (بكسلات 1536×1024). */
const W = 290;
const H = 199;

/* ── مولّد الشوارع الثانوية — بذرة ثابتة (mulberry32) ─────────────────── */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

/**
 * عائلة شوارع متوازية تقريبًا بزاوية `deg`، كل `step` بكسل، بانحناءٍ خفيف
 * وانقطاعاتٍ عشوائية ثابتة — شبكة مدينةٍ لا شبكة مربّعات.
 */
function streetFamily(rand: () => number, deg: number, step: number, drop: number): string {
  const rad = (deg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  // العمودي على الاتجاه — عليه تتوزّع الخطوط.
  const nx = -dy;
  const ny = dx;
  const cx = W / 2;
  const cy = H / 2;
  const reach = Math.hypot(W, H) / 2 + 10;
  let d = "";
  for (let off = -reach; off <= reach; off += step * (0.8 + rand() * 0.4)) {
    const ox = cx + nx * off;
    const oy = cy + ny * off;
    // أربع قطع على طول الخطّ، تسقط بعضها فتنشأ الأزقّة والكتل.
    const cuts = [
      -reach,
      -reach / 2 + (rand() - 0.5) * 30,
      (rand() - 0.5) * 30,
      reach / 2 + (rand() - 0.5) * 30,
      reach,
    ];
    for (let i = 0; i < cuts.length - 1; i++) {
      if (rand() < drop) continue;
      const bend = (rand() - 0.5) * 6;
      const t0 = cuts[i];
      const t1 = cuts[i + 1];
      const tm = (t0 + t1) / 2;
      d +=
        `M${f1(ox + dx * t0)} ${f1(oy + dy * t0)}` +
        `Q${f1(ox + dx * tm + nx * bend)} ${f1(oy + dy * tm + ny * bend)} ${f1(ox + dx * t1)} ${f1(oy + dy * t1)}`;
    }
  }
  return d;
}

const rand = mulberry32(20261013);
const MINOR_STREETS =
  streetFamily(rand, -21, 15, 0.22) +
  streetFamily(rand, 66, 19, 0.3) +
  streetFamily(rand, 24, 37, 0.45);

/** الطرق الرئيسية — مرسومة باليد على مواضعها في الصورة. */
const MAJOR_ROADS = [
  "M-4 121 C40 110 80 98 128 84 S220 52 296 34",
  "M30 203 C52 168 74 140 92 104 S118 32 132 -4",
  "M-4 34 C40 42 84 58 128 88 S218 146 296 166",
  "M146 -4 C150 40 154 84 162 124 S178 182 184 203",
  "M-4 174 C40 162 84 160 122 172 S180 194 204 203",
] as const;

/** طرق ثانوية عريضة (أعرض من الأزقّة، أنحف من الرئيسية). */
const MID_ROADS = [
  "M8 -4 C14 40 22 90 40 132 S66 190 72 203",
  "M60 -4 C70 30 92 60 104 64",
  "M196 -4 C200 50 214 100 240 140 S270 188 278 203",
  "M-4 82 C30 80 60 72 84 60",
] as const;

/** الحدائق (خضراء) والماء (أزرق) والكتل الملوّنة الباهتة كما رُسمت. */
const PARKS = [
  "M7 60 L18 51 L27 62 L16 71 Z",
  "M140 149 L150 144 L170 160 L163 167 Z",
  "M214 6 L230 2 L236 14 L220 18 Z",
] as const;
const WATER = "M140 203 C146 192 152 186 158 184 C164 182 168 188 166 203 Z";
const TINTS: readonly (readonly [number, number, number, number, "rose" | "violet" | "emerald"])[] =
  [
    [104, 80, 9, 5, "rose"],
    [52, 150, 6, 7, "violet"],
    [92, 186, 8, 5, "rose"],
    [178, 112, 7, 6, "violet"],
    [30, 98, 6, 4, "emerald"],
    [124, 20, 7, 4, "violet"],
    [210, 72, 8, 5, "rose"],
  ];

/* ── المسارات ونقاطها — مقيسة من خطوط الصورة الزرقاء ─────────────────── */

const ROUTES = [
  // الحلقة العليا: من الدبوس الأول إلى الثاني.
  "M54 32 L62 36 L72 31 L83 27 L88 26 L97 30 L105 37 L113 43 L119 48",
  "M62 36 L61 44 L58 48 L50 51 L48 58 L52 62 L62 62 L67 60 L72 50 L78 40 L83 31 L88 26",
  // النزول غربًا من نقطة التفتيش الخضراء إلى الحمراء.
  "M25 55 L30 63 L36 70 L46 72 L55 77 L53 85 L49 96 L46 100 L36 104 L25 111 L29 122 L33 133 L38 141 L42 145",
  // من الحمراء شرقًا تحت الدبوس الرابع إلى ملتقى الجنوب.
  "M42 145 L48 139 L57 134 L67 128 L72 132 L77 135 L88 134 L96 132 L104 135 L110 137",
  // العمود الشرقي: من الدبوس الثاني نزولًا إلى الملتقى.
  "M122 64 L121 76 L123 88 L124 100 L123 104 L119 110 L117 122 L112 132 L110 137",
  // الفرع إلى البوابة ونقطة التفتيش الخضراء الثانية.
  "M124 104 L130 108 L137 109 L144 103 L147 93",
  "M144 103 L151 103 L155 103",
  // إلى الدبوس الخامس جنوبًا.
  "M110 137 L118 141 L125 145 L130 150 L133 158 L137 168",
] as const;

/** عُقد المسار: [x, y, ممتلئة؟]. */
const NODES: readonly (readonly [number, number, boolean])[] = [
  [54, 32, false],
  [88, 26, true],
  [105, 37, true],
  [62, 36, true],
  [50, 51, false],
  [55, 77, true],
  [46, 100, true],
  [25, 111, true],
  [36, 70, false],
  [77, 135, true],
  [108, 137, true],
  [118, 141, true],
  [124, 104, true],
  [121, 79, false],
  [96, 132, false],
];

/** نقاط التفتيش كما رُسمت: حلقاتٌ ملوّنة بقلبٍ من لون الأرض. */
const CHECKPOINTS: readonly (readonly [number, number, "ok" | "late" | "info"])[] = [
  [25, 55, "ok"],
  [158, 103, "ok"],
  [42, 145, "late"],
  [168, 177, "info"],
];

/** دبابيس المركبات: [x, y (مركز الرأس), الرمز، داكن؟]. */
type PinGlyph = "car" | "bus" | "gate";
const PINS: readonly (readonly [number, number, PinGlyph, boolean])[] = [
  [35, 22, "bus", true],
  [122, 51, "car", false],
  [151, 78, "gate", false],
  [67, 113, "car", false],
  [138, 171, "car", true],
];

/** رأس الدبوس كما قِيس (قطره ≈ 20px على 1536×1024). */
const PIN_R = 10;

/** دبوس الخريطة: رأسٌ دائري وذيلٌ مدبّب يشير إلى الموضع. */
function pinPath(cx: number, cy: number, r = PIN_R): string {
  const tip = cy + r + 4.5;
  return (
    `M${cx} ${tip}` +
    `C${cx - 2} ${f1(tip - 3)} ${f1(cx - r)} ${f1(cy + r * 0.55)} ${f1(cx - r)} ${cy}` +
    `A${r} ${r} 0 1 1 ${f1(cx + r)} ${cy}` +
    `C${f1(cx + r)} ${f1(cy + r * 0.55)} ${cx + 2} ${f1(tip - 3)} ${cx} ${tip}Z`
  );
}

const PIN_ICON: Record<Exclude<PinGlyph, "gate">, LucideIcon> = { car: CarFront, bus: BusFront };

/** رمز البوابة المقوّسة كما رُسم (قوسٌ وبابٌ داخله) — لا رمز مطابق في المكتبة. */
function GateGlyph({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M5 21V10a7 7 0 0 1 14 0v11" />
      <path d="M9.5 21v-6.5a2.5 2.5 0 0 1 5 0V21" />
    </svg>
  );
}

export const PATROL_MAP_VIEWBOX = `0 0 ${W} ${H}`;

export function PatrolRouteMap({ label, className }: { label: string; className?: string }) {
  // رمز المركبة داخل الرأس ≈ 10px كما رُسم.
  const glyph = 8.8;
  return (
    <svg
      viewBox={PATROL_MAP_VIEWBOX}
      preserveAspectRatio="xMinYMid slice"
      role="img"
      aria-label={label}
      focusable="false"
      className={className ? `nx-patrol-map ${className}` : "nx-patrol-map"}
    >
      <title>{label}</title>
      <rect className="pm-ground" x="0" y="0" width={W} height={H} />
      {TINTS.map(([x, y, w, h, tone]) => (
        <rect
          key={`${x}-${y}`}
          className="pm-tint"
          data-tone={tone}
          x={x}
          y={y}
          width={w}
          height={h}
          rx="1.5"
        />
      ))}
      {PARKS.map((d) => (
        <path key={d} className="pm-park" d={d} />
      ))}
      <path className="pm-water" d={WATER} />
      <path className="pm-street" d={MINOR_STREETS} />
      {MID_ROADS.map((d) => (
        <path key={d} className="pm-street pm-street-mid" d={d} />
      ))}
      {MAJOR_ROADS.map((d) => (
        <path key={d} className="pm-street pm-street-major" d={d} />
      ))}

      {/* أثر المشي المتقطّع ودبوسه الصغير أعلى اليسار كما رُسم. */}
      <path className="pm-trail" d="M16 30 L16 40 L20 48 L24 53" />
      <path className="pm-trail-pin" d={pinPath(16, 26, 2.6)} />

      {ROUTES.map((d) => (
        <path key={`glow-${d}`} className="pm-route-glow" d={d} />
      ))}
      {ROUTES.map((d) => (
        <path key={d} className="pm-route" d={d} />
      ))}
      {NODES.map(([x, y, solid]) => (
        <circle
          key={`${x}-${y}`}
          className={solid ? "pm-node pm-node-solid" : "pm-node"}
          cx={x}
          cy={y}
          r={solid ? 1.9 : 2.3}
        />
      ))}
      {CHECKPOINTS.map(([x, y, tone]) => (
        <circle key={`${x}-${y}`} className="pm-check" data-tone={tone} cx={x} cy={y} r="3.4" />
      ))}

      {/* علامة البلاغ الزرقاء (فقاعةٌ بقلبٍ فاتح) كما رُسمت جنوب الملتقى. */}
      <g className="pm-ping">
        <circle cx="126" cy="159" r="5.2" />
        <path className="pm-ping-mark" d="M123.6 160.9 L124.1 159.2 A2.4 2.4 0 1 1 125.2 160.5 Z" />
      </g>

      {PINS.map(([x, y, glyph_, deep]) => {
        const Icon = glyph_ === "gate" ? null : PIN_ICON[glyph_];
        const gx = x - glyph / 2 - 0.5;
        const gy = y - glyph / 2 - 0.5;
        return (
          <g key={`${x}-${y}`} className={deep ? "pm-pin pm-pin-deep" : "pm-pin"}>
            <path className="pm-pin-body" d={pinPath(x, y)} />
            {Icon ? (
              <Icon
                x={gx}
                y={gy}
                size={glyph + 1}
                strokeWidth={2.6}
                className="pm-pin-glyph"
                aria-hidden
                focusable="false"
              />
            ) : (
              <g className="pm-pin-glyph">
                <GateGlyph x={gx} y={gy} size={glyph + 1} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
