/**
 * أدوات رسم على Canvas 2D: دُفعات خطوطٍ مقسّمة بالألوان وشفافيّتها
 * ومحارف توهّجٍ مرسومة مسبقًا. كلّ شيء حتميّ.
 */
import type { RGB } from "./palette";

export const pack = (c: RGB): number =>
  (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);

/** دفعة خطوط: تُجمَّع بمفتاح (لون، شفافية مكمّمة، عرض مكمَّم) وتُرسم بمسارٍ واحد لكل مفتاح. */
export class LineBatch {
  private m = new Map<number, number[]>();

  add(
    rgb: number,
    alpha: number,
    width: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): void {
    const aq = Math.round(alpha * 24);
    if (aq <= 0) return;
    const wq = Math.min(31, Math.max(1, Math.round(width * 4)));
    const key = rgb * 1024 + Math.min(24, aq) * 32 + wq;
    let arr = this.m.get(key);
    if (!arr) {
      arr = [];
      this.m.set(key, arr);
    }
    arr.push(x1, y1, x2, y2);
  }

  flush(ctx: CanvasRenderingContext2D): void {
    ctx.lineCap = "round";
    for (const [key, arr] of this.m) {
      const wq = key % 32;
      const aq = Math.floor(key / 32) % 32;
      const rgb = Math.floor(key / 1024);
      ctx.strokeStyle = `rgba(${(rgb >> 16) & 255},${(rgb >> 8) & 255},${rgb & 255},${(aq / 24).toFixed(3)})`;
      ctx.lineWidth = wq / 4;
      ctx.beginPath();
      for (let i = 0; i < arr.length; i += 4) {
        ctx.moveTo(arr[i], arr[i + 1]);
        ctx.lineTo(arr[i + 2], arr[i + 3]);
      }
      ctx.stroke();
    }
    this.m.clear();
  }
}

/** دفعة نقاط (مربّعات صغيرة) بمفتاح لون/شفافية. */
export class DotBatch {
  private m = new Map<number, number[]>();

  add(rgb: number, alpha: number, x: number, y: number, size: number): void {
    const aq = Math.round(alpha * 16);
    if (aq <= 0) return;
    const sq = Math.min(63, Math.max(1, Math.round(size * 4)));
    const key = rgb * 2048 + Math.min(16, aq) * 64 + sq;
    let arr = this.m.get(key);
    if (!arr) {
      arr = [];
      this.m.set(key, arr);
    }
    arr.push(x, y);
  }

  flush(ctx: CanvasRenderingContext2D): void {
    for (const [key, arr] of this.m) {
      const sq = key % 64;
      const aq = Math.floor(key / 64) % 32;
      const rgb = Math.floor(key / 2048);
      const s = sq / 4;
      ctx.fillStyle = `rgba(${(rgb >> 16) & 255},${(rgb >> 8) & 255},${rgb & 255},${(aq / 16).toFixed(3)})`;
      ctx.beginPath();
      const rad = Math.max(0.5, s / 2);
      for (let i = 0; i < arr.length; i += 2) {
        ctx.moveTo(arr[i] + rad, arr[i + 1]);
        ctx.arc(arr[i], arr[i + 1], rad, 0, 6.2832);
      }
      ctx.fill();
    }
    this.m.clear();
  }
}

type Maker = (w: number, h: number) => HTMLCanvasElement;

/** محارف توهّج دائريّة ناعمة بلونٍ مكمّم، تُرسم بـ drawImage. */
export class Sprites {
  private cache = new Map<number, HTMLCanvasElement>();
  constructor(private make: Maker) {}

  glow(rgb: number): HTMLCanvasElement {
    let c = this.cache.get(rgb);
    if (c) return c;
    c = this.make(128, 128);
    const g = c.getContext("2d");
    if (!g) throw new Error("no 2d context");
    const r = (rgb >> 16) & 255;
    const gg = (rgb >> 8) & 255;
    const b = rgb & 255;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, `rgba(${r},${gg},${b},1)`);
    grad.addColorStop(0.12, `rgba(${r},${gg},${b},0.62)`);
    grad.addColorStop(0.35, `rgba(${r},${gg},${b},0.2)`);
    grad.addColorStop(0.65, `rgba(${r},${gg},${b},0.05)`);
    grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    this.cache.set(rgb, c);
    return c;
  }

  /** قرصٌ ناعم الحافّة (بوكيه): مسطّح الوسط. */
  disc(rgb: number): HTMLCanvasElement {
    const key = rgb + 0x1000000;
    let c = this.cache.get(key);
    if (c) return c;
    c = this.make(128, 128);
    const g = c.getContext("2d");
    if (!g) throw new Error("no 2d context");
    const r = (rgb >> 16) & 255;
    const gg = (rgb >> 8) & 255;
    const b = rgb & 255;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, `rgba(${r},${gg},${b},0.5)`);
    grad.addColorStop(0.7, `rgba(${r},${gg},${b},0.6)`);
    grad.addColorStop(0.9, `rgba(${r},${gg},${b},0.9)`);
    grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    this.cache.set(key, c);
    return c;
  }
}
