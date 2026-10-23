/**
 * ثوابت الزمن — الصوت مقفل عليها. 56.0 ث = 1680 إطارًا · 30 إطارًا/ث ·
 * 120 نبضة/د (النبضة 0.5 ث والمازورة 2 ث).
 */
export const FPS = 30;
export const SECONDS = 56;
export const FRAMES = SECONDS * FPS;
export const W = 1280;
export const H = 720;
export const BPM = 120;
export const BEAT = 60 / BPM;

/** حدود المشاهد (ثوانٍ). */
export const SCENE = {
  s1: [0, 8],
  s2: [8, 24],
  s3: [24, 38],
  s4: [38, 50],
  s5: [50, 56],
} as const;

/** الإشارات المرئية (ثوانٍ) — ما يقع فعلًا في الصورة. */
export const CUE = {
  // S1
  s1TitleIn: 1.0,
  s1TitleOut: 4.5,
  s1RadioUp: 5.5,
  s1Sweep: 8.0,
  // S2
  gen: 8.0,
  stepUp: 11.0,
  lines: 14.0,
  nearSub: 18.0,
  stepDown: 20.0,
  city: 22.0,
  s2Out: 24.0,
  // S3
  gate: 24.0,
  scanZoom: 27.0,
  cameras: 30.0,
  patrol: 32.0,
  drone: 34.0,
  control: 36.0,
  s3Out: 38.0,
  // S4
  twinStart: 38.0,
  ping: 41.0,
  alarm: 44.0,
  guide: 46.0,
  resolved: 48.0,
  // S5
  pullback: 50.0,
  brand: 52.0,
  hold: 53.5,
} as const;

export interface CaptionDef {
  id: string;
  text: string;
  from: number;
  to: number;
  style: "hero" | "chip";
}

/** العناوين على الشاشة (لا أرقام ولا أسماء جهات). «…» مركّبةٌ من ثلاث نقاط لأن الخطّ بلا U+2026. */
export const CAPTIONS: CaptionDef[] = [
  { id: "c1", text: "محطات الطاقة... حراسةٌ لا تنام", from: 1.0, to: 4.5, style: "hero" },
  { id: "c2a", text: "توليد الكهرباء", from: 8.4, to: 10.6, style: "chip" },
  { id: "c2b", text: "رفع الجهد", from: 11.4, to: 13.6, style: "chip" },
  { id: "c2c", text: "النقل عبر الأسلاك", from: 14.4, to: 16.6, style: "chip" },
  { id: "c2d", text: "خفض الجهد في المحطة", from: 20.4, to: 22.4, style: "chip" },
  { id: "c2e", text: "التوزيع إلى المدن", from: 22.4, to: 24.2, style: "chip" },
  { id: "c3a", text: "نقاط الدخول", from: 24.4, to: 27.0, style: "chip" },
  { id: "c3b", text: "الكاميرات والدوريات", from: 30.4, to: 33.8, style: "chip" },
  { id: "c3c", text: "المراقبة والتحكم", from: 36.2, to: 38.0, style: "chip" },
  { id: "c4a", text: "التوأم الرقمي: نسخةٌ حيّة للمحطة", from: 38.6, to: 41.8, style: "chip" },
  { id: "c4b", text: "يرصد وينذر", from: 42.0, to: 45.6, style: "chip" },
  { id: "c4c", text: "ويوجّه رجال الأمن", from: 46.2, to: 49.8, style: "chip" },
];

export const DISCLOSURE = "مشاهد توضيحية مرسومة — ليست تصويرًا لمنشأة حقيقية";
