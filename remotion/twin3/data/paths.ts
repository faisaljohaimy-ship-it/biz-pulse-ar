/**
 * مساراتُ الأثر الضوئي الموضوعة يدويًّا فوق الصور (بكسلات المصدر 1672×941): مسوّدةٌ يدويّة بالتحقّق على
 * شبكة (tools/overlay.py) ثم التصاقٌ بحافّة السلك المرئية ±9px (tools/snap.py). مرجعٌ للأثر الضوئي لا بياناتٌ تشغيلية.
 * `lanes-*.json` المسوّدة اليدوية؛ `snapped-*.json` الناتج المستعمل.
 */
import s03 from "./snapped-03.json";
import s16 from "./snapped-16.json";
import s19 from "./snapped-19.json";
import { trace, type Pt, type Tr } from "../kit/fx";

type P = ReadonlyArray<ReadonlyArray<number>>;
const pts = (p: P): Pt[] => p.map((q) => ({ x: q[0], y: q[1] }));
const join = (...parts: P[]): Tr => trace(parts.flatMap((p) => pts(p)));

/** 03 — الأسلاك المضيئة المتّجهة إلى محطة التوليد. */
export const L03 = {
  A: trace(pts(s03.A)),
  B: trace(pts(s03.B)),
  F: trace(pts(s03.F)),
  D: trace(pts(s03.D)),
  E: trace(pts(s03.E)),
} as const;

/** 19 — الأسلاك المعلّقة بين البرج الكبير والبرج الثاني (تُكمل عبر هيكل البرج إلى الثالث). */
export const L19 = {
  W1: join(s19.w1, s19.x1),
  W2: join(s19.w2, s19.x2),
  W3: trace(pts(s19.w3)),
} as const;
export const L19_OCCLUDE: ReadonlyArray<readonly [number, number]> = [[770, 890]];

/** 16 — الأسلاك المضيئة عبر البرج الكبير (تعبر هيكله بقفزةٍ مظلَّلة). */
export const L16 = {
  A: join(s16.a1, s16.a2),
  B: join(s16.b1, s16.b2),
  D: trace(pts(s16.d2)),
} as const;
export const L16_OCCLUDE: ReadonlyArray<readonly [number, number]> = [[1255, 1440]];

/** مسار قضبان بالقرب من الطريق في 17 (أثر الإضاءة الأحمر). */
export const ROAD17 = trace(
  pts([
    [1190, 276],
    [1263, 289],
    [1400, 305],
    [1526, 316],
    [1663, 323],
  ]),
);
