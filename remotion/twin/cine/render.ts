/**
 * مصيِّر «فيلم التوأم الرقمي السينمائي» — Canvas 2D خالص، بلا WebGL ولا صور.
 *
 * كلّ ما يُرى مرسومٌ بالكود: إسقاطٌ منظوريّ حقيقيّ بكاميرا مدارية، خطوطٌ
 * وأسطحٌ وجسيمات، توهّجٌ مُجمَّع (بلوم هرميّ)، ضبابيّة حركة بتراكم
 * عيّناتٍ فرعيّة، وعمقُ ميدانٍ مُحاكى بعرض الخط وحجم البقعة. لا نصّ ولا
 * رقم ولا شعار في أي إطار (المادة ٢٧) — النصوص كلّها HTML في الصفحة.
 *
 * الدالّة حتميّة: الإطار f يُنتج البكسلات نفسها دائمًا.
 */
import { TWIN_FILM_FPS, TWIN_T } from "../timeline";
import { DotBatch, LineBatch, Sprites, pack } from "./batch";
import {
  HUB_E,
  SLAB_H,
  type CamState,
  type P2,
  type View,
  camPath,
  handheld,
  kick,
  makeView,
  proj,
  projSeg,
} from "./camera";
import { FS, K, SCAN_DIR, buildFacility, type Facility } from "./facility";
import { BORDER, HUBS, NEIGHBOURS, PROVINCES, REGION_ORDER, type Pt, inPoly } from "./map";
import {
  clamp,
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  frac,
  hash,
  mix,
  outBack,
  rng,
  smooth,
  smoothWin,
  win,
} from "./math";
import {
  CYAN,
  EMERALD,
  ICE,
  MINT,
  NAVY,
  NAVY_DEEP,
  NAVY_LIFT,
  REGION_RGB,
  type RGB,
  mixRGB,
  rgba,
} from "./palette";
import type { RegionId } from "@/lib/regions";

type Ctx = CanvasRenderingContext2D;
export type MakeCanvas = (w: number, h: number) => HTMLCanvasElement;

interface Flare {
  x: number;
  y: number;
  r: number;
  a: number;
  c: number;
  streak: number;
}

/** عامل نصف قطر موجة الشبكة. */
const GRID_X = 2.285;
const GRID_Y = 2.5;
const PILLAR_H = 8.0;
/** سرعة الموجة الصادمة (وحدات/ث). */
const SHOCK_SPEED = 8;

const WHITE: RGB = [255, 255, 255];
const FACE_DARK: RGB = [6, 18, 34];
const FACE_LIT: RGB = [64, 158, 204];
const FACE_LIT_E: RGB = [58, 190, 142];
const FACE_DARK_E: RGB = [6, 26, 28];

/** نقطة في فضاء الكاميرا (للقصّ) */
interface CP {
  x: number;
  y: number;
  z: number;
}

export class TwinRenderer {
  readonly w: number;
  readonly h: number;
  readonly sc: number;
  private S: HTMLCanvasElement;
  private A: HTMLCanvasElement;
  private Rf: HTMLCanvasElement;
  private Q: HTMLCanvasElement;
  private E: HTMLCanvasElement;
  private F: HTMLCanvasElement;
  private noiseTile: HTMLCanvasElement;
  private T1: HTMLCanvasElement;
  private T2: HTMLCanvasElement;
  private sprites: Sprites;
  private fac: Facility;
  private flares: Flare[] = [];
  private stars: { dx: number; dy: number; dz: number; a: number; ph: number }[] = [];
  private dust: { x: number; y: number; z: number; ph: number; s: number }[] = [];
  private gridSegs: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    mx: number;
    my: number;
    r: number;
  }[] = [];
  private nodes: { x: number; y: number; ph: number; reg: RegionId }[] = [];
  private wseg: {
    ax: Float32Array;
    ay: Float32Array;
    az: Float32Array;
    bx: Float32Array;
    by: Float32Array;
    bz: Float32Array;
    c: Float32Array;
    kind: Uint8Array;
    wt: Float32Array;
    hue: Float32Array;
  };
  private pillarRegions: RegionId[] = REGION_ORDER;
  /** إعدادات للاختبار السريع */
  opts = {
    bloom: true,
    grain: 0.0,
    ca: true,
    motionBlur: true,
    scan: true,
    refl: true,
    dust: true,
    /** زاوية المصراع كنسبةٍ من الإطار (0.5 = 180°). */
    shutter: 0.5,
  };

  constructor(w: number, h: number, make: MakeCanvas) {
    this.w = w;
    this.h = h;
    this.sc = w / 1280;
    this.S = make(w, h);
    this.A = make(w, h);
    this.Rf = make(w, h);
    this.Q = make(Math.ceil(w / 4), Math.ceil(h / 4));
    this.E = make(Math.ceil(w / 8), Math.ceil(h / 8));
    this.F = make(Math.ceil(w / 16), Math.ceil(h / 16));
    this.sprites = new Sprites(make);
    this.fac = buildFacility();
    this.noiseTile = make(256, 256);
    this.T1 = make(w, h);
    this.T2 = make(w, h);
    this.initNoise();
    this.initStatic();
    const f = this.fac;
    const n = f.segs.length;
    this.wseg = {
      ax: new Float32Array(n),
      ay: new Float32Array(n),
      az: new Float32Array(n),
      bx: new Float32Array(n),
      by: new Float32Array(n),
      bz: new Float32Array(n),
      c: new Float32Array(n),
      kind: new Uint8Array(n),
      wt: new Float32Array(n),
      hue: new Float32Array(n),
    };
    for (let i = 0; i < n; i += 1) {
      const s = f.segs[i];
      this.wseg.ax[i] = HUBS.eastern.x + s.ax * FS;
      this.wseg.ay[i] = HUBS.eastern.y + s.ay * FS;
      this.wseg.az[i] = SLAB_H + s.az * FS;
      this.wseg.bx[i] = HUBS.eastern.x + s.bx * FS;
      this.wseg.by[i] = HUBS.eastern.y + s.by * FS;
      this.wseg.bz[i] = SLAB_H + s.bz * FS;
      this.wseg.c[i] = s.c;
      this.wseg.kind[i] = s.kind;
      this.wseg.wt[i] = s.w;
      this.wseg.hue[i] = s.hue;
    }
  }

  private initNoise(): void {
    const g = this.noiseTile.getContext("2d");
    if (!g) return;
    const id = g.createImageData(256, 256);
    const r = rng(777);
    for (let i = 0; i < 256 * 256; i += 1) {
      const v = Math.round(128 + (r() + r() - 1) * 120);
      id.data[i * 4] = v;
      id.data[i * 4 + 1] = v;
      id.data[i * 4 + 2] = v;
      id.data[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0);
  }

  private initStatic(): void {
    // نجوم
    const r = rng(4242);
    for (let i = 0; i < 90; i += 1) {
      const az = r() * Math.PI * 2;
      const el = (2 + r() * 58) * (Math.PI / 180);
      this.stars.push({
        dx: Math.sin(az) * Math.cos(el),
        dy: Math.cos(az) * Math.cos(el),
        dz: Math.sin(el),
        a: 0.18 + r() * 0.5,
        ph: r() * 10,
      });
    }
    // غبار حول المنشأة
    const rd = rng(1717);
    for (let i = 0; i < 190; i += 1) {
      this.dust.push({
        x: (rd() - 0.5) * 3.2,
        y: (rd() - 0.5) * 2.6,
        z: rd() * 1.5,
        ph: rd() * 20,
        s: 0.4 + rd() * 0.9,
      });
    }
    // الشبكة الأرضية: خطوط الطول/العرض بقطعٍ قصيرة
    const L = 62;
    const piece = 1.6;
    for (let i = -27; i <= 27; i += 1) {
      const x = i * GRID_X;
      for (let y = -L; y < L; y += piece) {
        this.gridSegs.push({
          x1: x,
          y1: y,
          x2: x,
          y2: y + piece,
          mx: x,
          my: y + piece / 2,
          r: Math.hypot(x, y + piece / 2),
        });
      }
    }
    for (let j = -25; j <= 25; j += 1) {
      const y = j * GRID_Y;
      for (let x = -L; x < L; x += piece) {
        this.gridSegs.push({
          x1: x,
          y1: y,
          x2: x + piece,
          y2: y,
          mx: x + piece / 2,
          my: y,
          r: Math.hypot(x + piece / 2, y),
        });
      }
    }
    // عُقد بيانات خافتة داخل المملكة (زخرفة عامّة — لا تمثّل مواقع)
    const rn = rng(31337);
    let guard = 0;
    while (this.nodes.length < 70 && guard < 5000) {
      guard += 1;
      const p: Pt = { x: (rn() - 0.5) * 24, y: (rn() - 0.5) * 19 };
      for (const pr of PROVINCES) {
        if (inPoly(p, pr.poly)) {
          this.nodes.push({ x: p.x, y: p.y, ph: rn() * 10, reg: pr.region });
          break;
        }
      }
    }
  }

  /* ═══════════════ واجهة الإطار ═══════════════ */

  camAt(ts: number): CamState {
    return kick(ts, handheld(ts, camPath(ts)));
  }

  /** سرعة الحركة على الشاشة (بكسل/إطار) لاختيار عدد العيّنات الفرعية. */
  private speedPx(ts: number): number {
    const dt = 1 / TWIN_FILM_FPS;
    const a = this.camAt(ts - dt / 2);
    const b = this.camAt(ts + dt / 2);
    const d = (a.dist + b.dist) / 2;
    const f = ((a.focal + b.focal) / 2) * this.sc;
    const angular =
      (Math.abs(b.az - a.az) + Math.abs(b.el - a.el) + Math.abs(b.roll - a.roll) * 3) *
      (Math.PI / 180) *
      f;
    const lateral = (Math.hypot(b.tx - a.tx, b.ty - a.ty, b.tz - a.tz) / d) * f;
    const radial = (Math.abs(b.dist - a.dist) / d) * 0.45 * this.w;
    return angular + lateral + radial;
  }

  renderFrame(out: Ctx, frame: number): void {
    const t = frame / TWIN_FILM_FPS;
    const sp = this.opts.motionBlur ? this.speedPx(t) : 0;
    // مصراع ≈ 144° (0.4 إطار): طول الأثر على الشاشة = السرعة × 0.4، وخطوة العيّنات ≤ ~1.6 بكسل
    // فلا تظهر «شرائح» متكرّرة على الخطوط الرفيعة.
    const shutter = this.opts.shutter / TWIN_FILM_FPS;
    const blurLen = sp * this.opts.shutter * this.sc;
    const N = blurLen < 1.2 ? 1 : clamp(Math.ceil(blurLen / 1.6), 2, 24);
    const A = this.A.getContext("2d");
    if (!A) throw new Error("no 2d");
    this.flares = [];
    if (N === 1) {
      this.drawScene(A, t);
    } else {
      const S = this.S.getContext("2d");
      if (!S) throw new Error("no 2d");
      this.flares = [];
      const allFlares: Flare[][] = [];
      for (let k = 0; k < N; k += 1) {
        const ts = t + ((k + 0.5) / N - 0.5) * shutter;
        this.flares = [];
        this.drawScene(S, ts);
        allFlares.push(this.flares);
        if (k === 0) {
          A.globalCompositeOperation = "copy";
          A.globalAlpha = 1;
          A.drawImage(this.S, 0, 0);
          A.globalCompositeOperation = "source-over";
        } else {
          A.globalAlpha = 1 / (k + 1);
          A.drawImage(this.S, 0, 0);
          A.globalAlpha = 1;
        }
      }
      // وهجات العيّنة الوسطى فقط (تُرسم بعد الدمج)
      this.flares = allFlares[Math.floor(N / 2)];
    }
    this.post(out, t, sp);
  }

  /* ═══════════════ المشهد ═══════════════ */

  private ambient(ts: number): number {
    const a = 27;
    const stop = TWIN_T.ambientStop;
    if (ts <= a) return ts;
    const L = stop - a;
    const u = Math.min(1, (ts - a) / L);
    return a + L * (u - (u * u) / 2);
  }

  private drawScene(ctx: Ctx, ts: number): void {
    const cam = this.camAt(ts);
    const v = makeView(cam, this.w, this.h);
    const amb = this.ambient(ts);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.filter = "none";

    this.drawBackground(ctx, v, ts, amb);
    this.drawGrid(ctx, v, ts);
    this.drawNeighbours(ctx, v, ts);
    this.drawMap(ctx, v, ts);
    this.drawBorder(ctx, v, ts);
    this.drawNodes(ctx, v, ts, amb);
    this.drawArcs(ctx, v, ts, amb);
    this.drawHubs(ctx, v, ts, amb);
    this.drawFacility(ctx, v, ts, amb, cam);
    this.drawShock(ctx, v, ts);
    this.drawPillars(ctx, v, ts, amb);
    this.drawDust(ctx, v, ts, amb, cam);
    this.drawAirDust(ctx, v, ts, amb);
    this.drawIgnition(ctx, v, ts);
  }

  /* ── خلفية ─────────────────────────────────────────────────────── */

  private drawBackground(ctx: Ctx, v: View, ts: number, amb: number): void {
    const { w, h } = this;
    ctx.fillStyle = rgba(NAVY_DEEP, 1);
    ctx.fillRect(0, 0, w, h);
    const hl = Math.hypot(v.fx, v.fy);
    let hy = -1e6;
    if (hl > 1e-4) {
      const dx = v.fx / hl;
      const dy = v.fy / hl;
      const zc = dx * v.fx + dy * v.fy;
      const yc = dx * v.ux + dy * v.uy;
      hy = v.cy - (v.focal * yc) / zc;
    }
    const haze = 1 - smoothWin(ts, 3.0, 8.0);
    // مزجٌ متّصل بين «أفقٌ وسماء» و«طاولة مضاءة» بحسب موضع الأفق — التبديل الحادّ كان يقفز بمتوسّط
    // الإضاءة 4/255 عند 6.0 ث و25.0 ث حين يغادر الأفق الإطار.
    const kSky = smooth((hy + 0.9 * h) / (1.1 * h));
    if (kSky > 0.002) {
      ctx.globalAlpha = kSky;
      // سماء
      const top = hy - h * 0.8;
      const g = ctx.createLinearGradient(0, top, 0, hy);
      g.addColorStop(0, rgba(NAVY_DEEP, 1));
      g.addColorStop(0.62, rgba(mixRGB(NAVY_DEEP, NAVY_LIFT, 0.3), 1));
      g.addColorStop(1, rgba(mixRGB(mixRGB(NAVY, NAVY_LIFT, 0.5), CYAN, 0.04 + 0.06 * haze), 1));
      ctx.fillStyle = g;
      ctx.fillRect(0, Math.min(top, 0), w, Math.max(hy - Math.min(top, 0), 0));
      // أرض
      const g2 = ctx.createLinearGradient(0, hy, 0, hy + h * 0.65);
      g2.addColorStop(0, rgba(mixRGB(NAVY_LIFT, CYAN, 0.04), 1));
      g2.addColorStop(0.14, rgba(mixRGB(NAVY, NAVY_LIFT, 0.3), 1));
      g2.addColorStop(0.55, rgba(NAVY, 1));
      g2.addColorStop(1, rgba(NAVY_DEEP, 1));
      ctx.fillStyle = g2;
      ctx.fillRect(0, Math.max(hy, 0), w, h);
      // وهج الأفق: خيطٌ رفيع وضبابٌ خافت
      ctx.globalCompositeOperation = "lighter";
      const hx = v.cx;
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, w * 0.6);
      hg.addColorStop(0, rgba(CYAN, 0.08 * haze + 0.02));
      hg.addColorStop(0.4, rgba(mixRGB(CYAN, NAVY, 0.7), 0.045 * haze + 0.008));
      hg.addColorStop(1, rgba(CYAN, 0));
      ctx.save();
      ctx.translate(hx, hy);
      ctx.scale(1, 0.14);
      ctx.translate(-hx, -hy);
      ctx.fillStyle = hg;
      ctx.fillRect(0, hy - w, w, w * 2);
      ctx.restore();
      const lg = ctx.createLinearGradient(0, 0, w, 0);
      lg.addColorStop(0, rgba(ICE, 0));
      lg.addColorStop(0.5, rgba(ICE, 0.34 * haze + 0.06));
      lg.addColorStop(1, rgba(ICE, 0));
      ctx.fillStyle = lg;
      ctx.fillRect(0, hy - 0.7 * this.sc, w, 1.4 * this.sc);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    if (kSky < 0.998) {
      ctx.globalAlpha = 1 - kSky;
      // نظرة نحو الأرض: طاولة مضاءة
      const o = proj(v, 0, 0, 0);
      const cx = o ? o.x : v.cx;
      const cy = o ? o.y : v.cy;
      const lit = smoothWin(ts, 4.5, 8.0);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.72);
      g.addColorStop(0, rgba(mixRGB(NAVY, NAVY_LIFT, 0.85), 0.3 + 0.55 * lit));
      g.addColorStop(0.6, rgba(NAVY, 0.4));
      g.addColorStop(1, rgba(NAVY_DEEP, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    // نجوم
    const starA = clamp01(1 - ts / 8);
    if (starA > 0.02) {
      const db = new DotBatch();
      for (const s of this.stars) {
        const p = proj(v, v.px + s.dx * 600, v.py + s.dy * 600, v.pz + s.dz * 600);
        if (!p || (hy > -1e5 && p.y > hy - 3)) continue;
        if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) continue;
        const tw = 0.75 + 0.25 * Math.sin(amb * 1.3 + s.ph);
        db.add(pack(ICE), s.a * tw * starA, p.x, p.y, (0.9 + s.a * 1.2) * this.sc);
      }
      db.flush(ctx);
    }
  }

  /* ── نقطة الاشتعال ──────────────────────────────────────────────── */

  private drawIgnition(ctx: Ctx, v: View, ts: number): void {
    if (ts > 7.5) return;
    const o = proj(v, 0, 0, 0.0);
    if (!o) return;
    const sc = this.sc;
    const base = 0.4 + 0.6 * smoothWin(ts, 0.0, 0.9);
    let pulse = 0;
    for (let i = 0; i < 6; i += 1) {
      const dt = ts - (TWIN_T.ignite + i * 0.5);
      if (dt > 0) pulse += Math.exp(-dt * 6) * (i === 0 ? 1 : 0.22);
    }
    const fade = 1 - smoothWin(ts, 4.5, 7.0);
    const I = (base + pulse * 1.1) * fade;
    ctx.globalCompositeOperation = "lighter";
    const r = (20 + 84 * pulse) * sc;
    ctx.globalAlpha = clamp01(0.5 * I);
    ctx.drawImage(
      this.sprites.glow(pack(mixRGB(CYAN, WHITE, 0.5))),
      o.x - r,
      o.y - r,
      r * 2,
      r * 2,
    );
    ctx.globalAlpha = clamp01(0.95 * I);
    const r2 = (4.5 + 10 * pulse) * sc;
    ctx.drawImage(this.sprites.glow(pack(WHITE)), o.x - r2, o.y - r2, r2 * 2, r2 * 2);
    ctx.globalAlpha = 1;
    // انعكاس على الأرض اللامعة: خطٌّ رأسيّ يخبو نحو الأسفل
    const L = (120 + 160 * pulse) * sc;
    const rg = ctx.createLinearGradient(0, o.y, 0, o.y + L);
    rg.addColorStop(0, rgba(mixRGB(CYAN, WHITE, 0.55), 0.5 * I));
    rg.addColorStop(1, rgba(CYAN, 0));
    ctx.fillStyle = rg;
    const rw = (1.2 + 3.5 * pulse) * sc;
    ctx.fillRect(o.x - rw / 2, o.y, rw, L);
    // وخزةٌ رأسية صاعدة لحظة الاشتعال
    const su = win(ts, TWIN_T.ignite, TWIN_T.ignite + 0.9);
    if (su > 0 && su < 1) {
      const H2 = 330 * sc * easeOutCubic(su);
      const ug = ctx.createLinearGradient(0, o.y, 0, o.y - H2);
      ug.addColorStop(0, rgba(mixRGB(CYAN, WHITE, 0.7), 0.8 * (1 - su)));
      ug.addColorStop(1, rgba(CYAN, 0));
      ctx.fillStyle = ug;
      ctx.fillRect(o.x - 0.9 * sc, o.y - H2, 1.8 * sc, H2);
    }
    ctx.globalCompositeOperation = "source-over";
    this.flares.push({
      x: o.x,
      y: o.y,
      r: r,
      a: 0.9 * I,
      c: pack(mixRGB(CYAN, WHITE, 0.35)),
      streak: 1.4 + 2.8 * pulse,
    });
  }

  /* ── الشبكة الأرضية ─────────────────────────────────────────────── */

  private revealR(ts: number): number {
    const u = win(ts, TWIN_T.ignite, 5.4);
    return 66 * (1 - Math.pow(1 - u, 1.7));
  }

  private shockR(ts: number): number {
    return ts < TWIN_T.shock ? -1 : (ts - TWIN_T.shock) * SHOCK_SPEED;
  }

  private shockAmp(ts: number): number {
    if (ts < TWIN_T.shock) return 0;
    return Math.exp(-(ts - TWIN_T.shock) / 1.9);
  }

  private drawGrid(ctx: Ctx, v: View, ts: number): void {
    if (ts < TWIN_T.ignite) return;
    const R = this.revealR(ts);
    const lb = new LineBatch();
    const colBase = pack(mixRGB(CYAN, NAVY_LIFT, 0.35));
    const colFront = pack(mixRGB(CYAN, WHITE, 0.5));
    const shR = this.shockR(ts);
    const shA = this.shockAmp(ts);
    const mapA = smoothWin(ts, 5.0, 8.0);
    const sc = this.sc;
    const fogD = 20 + 95 * smooth(v.pz / 2.2);
    for (const g of this.gridSegs) {
      if (g.r > R + 3) continue;
      const seg = projSeg(v, { x: g.x1, y: g.y1, z: 0 }, { x: g.x2, y: g.y2, z: 0 });
      if (!seg) continue;
      const [a, b] = seg;
      const d = (a.d + b.d) / 2;
      const fog = Math.exp(-d / fogD);
      const rev = smooth((R - g.r) / 7);
      const front = Math.exp(-Math.pow((g.r - R) / 1.3, 2)) * (R < 64 ? 1 : 0);
      let al = (0.3 + 0.1 * mapA) * rev + 0.7 * front;
      if (shA > 0)
        al +=
          0.7 *
          shA *
          Math.exp(-Math.pow((Math.hypot(g.mx - HUB_E.x, g.my - HUB_E.y) - shR) / 1.5, 2));
      al *= fog;
      if (al < 0.02) continue;
      const wdt = (1.0 + front * 0.5) * sc;
      lb.add(front > 0.3 ? colFront : colBase, Math.min(1, al), wdt, a.x, a.y, b.x, b.y);
    }
    ctx.globalCompositeOperation = "lighter";
    lb.flush(ctx);
    // موجات حلقية على الأرض تنطلق مع النبضات الأربع الأولى
    for (let k = 0; k < 4; k += 1) {
      const t0 = TWIN_T.ignite + 0.5 * k;
      const u = (ts - t0) / (2.6 - 0.3 * k);
      if (u <= 0 || u >= 1) continue;
      const rad = 1.5 + 48 * easeOutCubic(u);
      ctx.strokeStyle = rgba(
        mixRGB(CYAN, WHITE, 0.55),
        (k === 0 ? 0.7 : 0.38) * Math.pow(1 - u, 1.6),
      );
      ctx.lineWidth = (2.2 - 0.9 * u) * sc;
      this.ring3(ctx, v, 0, 0, 0, rad, 0, Math.PI * 2, 150);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  /* ── حدّ المملكة ورسمه ──────────────────────────────────────────── */

  private borderTrace(): { total: number } {
    // الطول الكلّي للحدّ المغلق
    const pts = BORDER;
    let total = 0;
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      total += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return { total };
  }

  private drawBorder(ctx: Ctx, v: View, ts: number): void {
    if (ts < TWIN_T.borderFrom) return;
    const { total } = this.cachedBorder ?? (this.cachedBorder = this.borderTrace());
    const pts = BORDER;
    const n = pts.length;
    const p = easeInOutCubic(win(ts, TWIN_T.borderFrom, TWIN_T.borderTo));
    const drawn = (p * total) / 2;
    // نقطة البداية: أعلى رأس (شمالًا)
    let i0 = 0;
    for (let i = 1; i < n; i += 1) if (pts[i].y > pts[i0].y) i0 = i;
    const lb = new LineBatch();
    const colSteady = pack(mixRGB(CYAN, ICE, 0.25));
    const colHead = pack(WHITE);
    const done = p >= 1;
    const steady = 0.62 + 0.18 * smoothWin(ts, TWIN_T.borderTo, TWIN_T.borderTo + 1.5);
    const z = 0.0;
    const along = (dir: 1 | -1): void => {
      let acc = 0;
      for (let k = 0; k < n; k += 1) {
        const ia = (i0 + dir * k + n * 2) % n;
        const ib = (i0 + dir * (k + 1) + n * 2) % n;
        const A = pts[ia];
        const B = pts[ib];
        const sl = Math.hypot(B.x - A.x, B.y - A.y);
        if (acc >= drawn && !done) break;
        let f = 1;
        if (!done && acc + sl > drawn) f = (drawn - acc) / sl;
        const seg = projSeg(
          v,
          { x: A.x, y: A.y, z },
          { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f, z },
        );
        const trail = !done ? Math.max(0, drawn - acc - sl * f * 0.5) : 99;
        const head = Math.exp(-trail / 1.6);
        if (seg) {
          lb.add(
            head > 0.5 ? colHead : colSteady,
            clamp01(steady * (1 - head) + 0.95 * head),
            (1.5 + 1.4 * head) * this.sc,
            seg[0].x,
            seg[0].y,
            seg[1].x,
            seg[1].y,
          );
        }
        acc += sl * f;
        if (f < 1) {
          const hp = proj(v, A.x + (B.x - A.x) * f, A.y + (B.y - A.y) * f, z);
          if (hp) {
            this.flares.push({
              x: hp.x,
              y: hp.y,
              r: 30 * this.sc,
              a: 0.75,
              c: pack(mixRGB(CYAN, WHITE, 0.6)),
              streak: 0.8,
            });
          }
        }
      }
    };
    along(1);
    along(-1);
    ctx.globalCompositeOperation = "lighter";
    lb.flush(ctx);
    ctx.globalCompositeOperation = "source-over";
  }
  private cachedBorder: { total: number } | null = null;

  /* ── اليابسة المجاورة ───────────────────────────────────────────── */

  private drawNeighbours(ctx: Ctx, v: View, ts: number): void {
    const a0 = smoothWin(ts, 5.6, 7.6);
    if (a0 <= 0) return;
    const lb = new LineBatch();
    const col = pack(mixRGB(CYAN, NAVY, 0.7));
    for (const poly of NEIGHBOURS) {
      for (let i = 0; i + 1 < poly.length; i += 1) {
        const A = poly[i];
        const B = poly[i + 1];
        const r = Math.hypot((A.x + B.x) / 2, (A.y + B.y) / 2);
        const fall = clamp01(1 - (r - 9) / 11);
        if (fall <= 0) continue;
        const seg = projSeg(v, { x: A.x, y: A.y, z: 0 }, { x: B.x, y: B.y, z: 0 });
        if (!seg) continue;
        lb.add(col, 0.38 * a0 * fall, 1 * this.sc, seg[0].x, seg[0].y, seg[1].x, seg[1].y);
      }
    }
    ctx.globalCompositeOperation = "lighter";
    lb.flush(ctx);
    ctx.globalCompositeOperation = "source-over";
  }

  /* ── المناطق والمنصّات ──────────────────────────────────────────── */

  /** عمق نقطة في فضاء الكاميرا. */
  private depthAt(v: View, x: number, y: number, z: number): number {
    return (x - v.px) * v.fx + (y - v.py) * v.fy + (z - v.pz) * v.fz;
  }

  private clipPoly(v: View, pts: { x: number; y: number; z: number }[]): P2[] | null {
    // قصّ على مستوى القرب ثم إسقاط
    const cp: CP[] = pts.map((p) => {
      const dx = p.x - v.px;
      const dy = p.y - v.py;
      const dz = p.z - v.pz;
      return {
        x: dx * v.rx + dy * v.ry + dz * v.rz,
        y: dx * v.ux + dy * v.uy + dz * v.uz,
        z: dx * v.fx + dy * v.fy + dz * v.fz,
      };
    });
    const out: CP[] = [];
    for (let i = 0; i < cp.length; i += 1) {
      const a = cp[i];
      const b = cp[(i + 1) % cp.length];
      const ain = a.z >= v.near;
      const bin = b.z >= v.near;
      if (ain) out.push(a);
      if (ain !== bin) {
        const t = (v.near - a.z) / (b.z - a.z);
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: v.near });
      }
    }
    if (out.length < 3) return null;
    return out.map((q) => {
      const k = v.focal / q.z;
      return { x: v.cx + q.x * k, y: v.cy - q.y * k, d: q.z, k };
    });
  }

  private fillPoly(ctx: Ctx, pts: P2[]): void {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
  }

  private slabH(ts: number, r: RegionId): number {
    return SLAB_H * outBack(win(ts, TWIN_T.rise[r], TWIN_T.rise[r] + 0.95), 1.1);
  }

  private drawMap(ctx: Ctx, v: View, ts: number): void {
    const fillA = smoothWin(ts, TWIN_T.fillFrom, TWIN_T.fillTo);
    if (fillA <= 0) return;
    const sc = this.sc;
    // تعتيم الحواف حين تقترب الكاميرا من المنشأة (تبقى الأرضية مقروءة بلا ضجيج)
    const he = HUBS.eastern;
    const camD = Math.hypot(v.px - he.x, v.py - he.y, v.pz - SLAB_H);
    const nearFac = 1 - smooth((camD - 2.4) / 6.5);
    const dim = 1 - 0.78 * nearFac;
    const dimFill = 1 - 0.84 * nearFac;
    // قاعدة داكنة تحت الأرضيّة
    ctx.fillStyle = rgba(NAVY_DEEP, 0.4 * fillA);
    for (const pr of PROVINCES) {
      const q = this.clipPoly(
        v,
        pr.poly.map((p) => ({ x: p.x, y: p.y, z: 0 })),
      );
      if (q) this.fillPoly(ctx, q);
    }
    // ترتيب المناطق من الخلف للأمام
    const order = REGION_ORDER.map((r) => {
      const hp = HUBS[r];
      const dd = (hp.x - v.px) * v.fx + (hp.y - v.py) * v.fy;
      return { r, dd };
    }).sort((a, b) => b.dd - a.dd);
    const lb = new LineBatch();
    for (const { r } of order) {
      const rc = REGION_RGB[r];
      const h = this.slabH(ts, r);
      const riseF = clamp01(h / SLAB_H);
      const hh = Math.max(h, 0.0);
      const landed = smoothWin(ts, TWIN_T.rise[r] + 0.5, TWIN_T.rise[r] + 1.3);
      const edgesTop: [number, number, number, number, boolean][] = [];
      const topPolys: P2[][] = [];
      for (const pr of PROVINCES) {
        if (pr.region !== r) continue;
        const poly = pr.poly;
        // جوانب
        if (hh > 0.01) {
          for (let i = 0; i < poly.length; i += 1) {
            if (pr.edge[i] === "inner") continue;
            const A = poly[i];
            const B = poly[(i + 1) % poly.length];
            const q = this.clipPoly(v, [
              { x: A.x, y: A.y, z: 0 },
              { x: B.x, y: B.y, z: 0 },
              { x: B.x, y: B.y, z: hh },
              { x: A.x, y: A.y, z: hh },
            ]);
            if (!q || q.length < 4) continue;
            const cr =
              (q[1].x - q[0].x) * (q[2].y - q[0].y) - (q[1].y - q[0].y) * (q[2].x - q[0].x);
            if (cr > 0) continue;
            const g = ctx.createLinearGradient(0, q[3].y, 0, q[0].y);
            g.addColorStop(0, rgba(mixRGB(rc, WHITE, 0.12), 0.4 * fillA * dim));
            g.addColorStop(1, rgba(rc, 0.04 * fillA * dim));
            ctx.fillStyle = g;
            this.fillPoly(ctx, q);
          }
        }
        const top = this.clipPoly(
          v,
          poly.map((p) => ({ x: p.x, y: p.y, z: hh })),
        );
        if (top) topPolys.push(top);
        for (let i = 0; i < poly.length; i += 1) {
          const A = poly[i];
          const B = poly[(i + 1) % poly.length];
          const kind = pr.edge[i];
          const sg = projSeg(v, { x: A.x, y: A.y, z: hh }, { x: B.x, y: B.y, z: hh });
          if (sg) {
            edgesTop.push([sg[0].x, sg[0].y, sg[1].x, sg[1].y, kind === "inner"]);
          }
          if (hh > 0.02 && kind !== "inner") {
            const sf = projSeg(v, { x: A.x, y: A.y, z: 0 }, { x: B.x, y: B.y, z: 0 });
            if (sf)
              lb.add(pack(rc), 0.5 * fillA * dim, 1.2 * sc, sf[0].x, sf[0].y, sf[1].x, sf[1].y);
          }
        }
      }
      // السطح: اتحاد المضلّعات بتدرّجٍ شعاعيّ من المحور + توهّج داخليّ
      if (topPolys.length) {
        const hp = proj(v, HUBS[r].x, HUBS[r].y, hh);
        const gx = hp ? hp.x : v.cx;
        const gy = hp ? hp.y : v.cy;
        const gr = hp ? Math.max(60, hp.k * 7.5) : this.w * 0.3;
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        const base = mixRGB(rc, NAVY, 0.42);
        g.addColorStop(0, rgba(base, (0.36 + 0.14 * riseF) * fillA * dimFill));
        g.addColorStop(0.7, rgba(base, (0.14 + 0.1 * riseF) * fillA * dimFill));
        g.addColorStop(1, rgba(base, (0.08 + 0.06 * riseF) * fillA * dimFill));
        ctx.fillStyle = g;
        ctx.beginPath();
        for (const q of topPolys) {
          ctx.moveTo(q[0].x, q[0].y);
          for (let i = 1; i < q.length; i += 1) ctx.lineTo(q[i].x, q[i].y);
          ctx.closePath();
        }
        ctx.fill();
        // توهّج الحافّة الداخلي
        ctx.save();
        ctx.clip();
        ctx.globalCompositeOperation = "lighter";
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (const e of edgesTop) {
          if (e[4]) continue;
          ctx.moveTo(e[0], e[1]);
          ctx.lineTo(e[2], e[3]);
        }
        ctx.strokeStyle = rgba(rc, 0.1 * fillA * dimFill * (0.4 + 0.6 * riseF));
        ctx.lineWidth = 26 * sc;
        ctx.stroke();
        ctx.strokeStyle = rgba(rc, 0.16 * fillA * dimFill * (0.4 + 0.6 * riseF));
        ctx.lineWidth = 10 * sc;
        ctx.stroke();
        ctx.restore();
      }
      const col = pack(mixRGB(rc, WHITE, 0.18));
      for (const e of edgesTop) {
        const a = e[4] ? 0.2 : 0.95;
        lb.add(
          col,
          a * fillA * dim * (0.55 + 0.45 * Math.max(riseF, landed)),
          (e[4] ? 0.9 : 1.45) * sc,
          e[0],
          e[1],
          e[2],
          e[3],
        );
      }
    }
    ctx.globalCompositeOperation = "lighter";
    lb.flush(ctx);
    ctx.globalCompositeOperation = "source-over";
  }

  /* ── عُقد بيانات خافتة ──────────────────────────────────────────── */

  private drawNodes(ctx: Ctx, v: View, ts: number, amb: number): void {
    const a0 = smoothWin(ts, TWIN_T.fillTo, TWIN_T.fillTo + 1.5);
    if (a0 <= 0) return;
    const db = new DotBatch();
    for (const n of this.nodes) {
      const h = this.slabH(ts, n.reg);
      const p = proj(v, n.x, n.y, h + 0.01);
      if (!p) continue;
      const tw = 0.55 + 0.45 * Math.sin(amb * 0.9 + n.ph);
      db.add(
        pack(mixRGB(REGION_RGB[n.reg], WHITE, 0.45)),
        0.5 * tw * a0 * Math.min(1, p.k / 25),
        p.x,
        p.y,
        (1.2 + Math.min(2, p.k / 80)) * this.sc,
      );
    }
    ctx.globalCompositeOperation = "lighter";
    db.flush(ctx);
    ctx.globalCompositeOperation = "source-over";
  }

  /* ── منصّات المحاور (حلقات) ─────────────────────────────────────── */

  private ring3(
    ctx: Ctx,
    v: View,
    cx: number,
    cy: number,
    z: number,
    r: number,
    a0 = 0,
    a1 = Math.PI * 2,
    steps = 48,
  ): void {
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= steps; i += 1) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const p = proj(v, cx + Math.cos(a) * r, cy + Math.sin(a) * r, z);
      if (!p) {
        started = false;
        continue;
      }
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  private drawHubs(ctx: Ctx, v: View, ts: number, amb: number): void {
    const sc = this.sc;
    ctx.globalCompositeOperation = "lighter";
    for (const r of REGION_ORDER) {
      const t0 = TWIN_T.rise[r];
      if (ts < t0) continue;
      const hp = HUBS[r];
      const h = this.slabH(ts, r);
      const rc = REGION_RGB[r];
      const col = mixRGB(rc, WHITE, 0.3);
      // موجة الهبوط
      const dt = ts - (t0 + 0.55);
      if (dt > 0 && dt < 1.4) {
        const u = dt / 1.4;
        ctx.strokeStyle = rgba(col, 0.85 * (1 - u) * (1 - u));
        ctx.lineWidth = (2.2 - 1.2 * u) * sc;
        this.ring3(ctx, v, hp.x, hp.y, h, 0.25 + 2.6 * easeOutCubic(u));
      }
      const appear = smoothWin(ts, t0 + 0.5, t0 + 1.4);
      // اختفاء الحلقة الصغرى حين تقترب الكاميرا من المنشأة الشرقية
      // الحلقة الصغرى للمنشأة الشرقية تذوب في الأرضية حين تتشكّل
      const near =
        r === "eastern" ? 1 - smoothWin(ts, TWIN_T.padForm - 0.2, TWIN_T.padForm + 0.9) : 1;
      if (appear <= 0 || near <= 0.01) continue;
      ctx.strokeStyle = rgba(col, 0.8 * appear * near);
      ctx.lineWidth = 1.6 * sc;
      this.ring3(ctx, v, hp.x, hp.y, h, 0.5);
      ctx.strokeStyle = rgba(col, 0.45 * appear * near);
      ctx.lineWidth = 1.1 * sc;
      this.ring3(ctx, v, hp.x, hp.y, h, 0.33);
      // علامات قياس دقيقة تحيط بالمحور (هندسة صرفة بلا حروف)
      {
        const nt = 36;
        const rot = amb * 0.12 + t0 * 0.7;
        ctx.strokeStyle = rgba(col, 0.55 * appear * near);
        ctx.lineWidth = 1 * sc;
        ctx.beginPath();
        for (let k = 0; k < nt; k += 1) {
          const an = rot + (k / nt) * Math.PI * 2;
          const long = k % 9 === 0;
          const r0 = 0.9;
          const r1 = long ? 1.1 : 1.0;
          const pa = proj(v, hp.x + Math.cos(an) * r0, hp.y + Math.sin(an) * r0, h);
          const pb = proj(v, hp.x + Math.cos(an) * r1, hp.y + Math.sin(an) * r1, h);
          if (pa && pb) {
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
          }
        }
        ctx.stroke();
      }
      // علامات تدور
      ctx.strokeStyle = rgba(mixRGB(col, WHITE, 0.4), 0.95 * appear * near);
      ctx.lineWidth = 2.2 * sc;
      const rot = amb * 0.9 + t0;
      for (let k = 0; k < 3; k += 1) {
        const a = rot + (k * Math.PI * 2) / 3;
        this.ring3(ctx, v, hp.x, hp.y, h, 0.65, a, a + 0.55, 10);
      }
      const p = proj(v, hp.x, hp.y, h + 0.02);
      if (p) {
        const rr = (7 + 4 * Math.sin(amb * 2 + t0)) * sc * appear * near;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(
          this.sprites.glow(pack(mixRGB(rc, WHITE, 0.6))),
          p.x - rr * 2,
          p.y - rr * 2,
          rr * 4,
          rr * 4,
        );
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  /* ── خيوط البيانات ──────────────────────────────────────────────── */

  private static LINKS: [RegionId, RegionId][] = [
    ["central", "western"],
    ["central", "eastern"],
    ["central", "southern"],
    ["western", "southern"],
    ["eastern", "southern"],
  ];

  private arcPoint(a: Pt, b: Pt, u: number, lift: number): { x: number; y: number; z: number } {
    return {
      x: a.x + (b.x - a.x) * u,
      y: a.y + (b.y - a.y) * u,
      z: SLAB_H + 0.08 + lift * 4 * u * (1 - u),
    };
  }

  private drawArcs(ctx: Ctx, v: View, ts: number, amb: number): void {
    if (ts < TWIN_T.arcsFrom) return;
    const sc = this.sc;
    ctx.globalCompositeOperation = "lighter";
    let idx = 0;
    for (const [ra, rb] of TwinRenderer.LINKS) {
      const A = HUBS[ra];
      const B = HUBS[rb];
      const dist = Math.hypot(B.x - A.x, B.y - A.y);
      const lift = 0.2 * dist;
      const t0 = TWIN_T.arcsFrom + idx * 0.16;
      const p = easeInOutCubic(win(ts, t0, t0 + 1.1));
      const ca = REGION_RGB[ra];
      const cb = REGION_RGB[rb];
      idx += 1;
      if (p <= 0) continue;
      const N = 44;
      const nDraw = Math.floor(N * p);
      let prev = this.arcPoint(A, B, 0, lift);
      for (let i = 1; i <= nDraw; i += 1) {
        const u = i / N;
        const q = this.arcPoint(A, B, u, lift);
        const seg = projSeg(v, prev, q);
        prev = q;
        if (!seg) continue;
        const col = mixRGB(mixRGB(ca, cb, u), WHITE, 0.3);
        const head = p < 1 ? Math.exp(-(nDraw - i) / 3) : 0;
        ctx.strokeStyle = rgba(mixRGB(col, WHITE, 0.5 * head), 0.5 + 0.45 * head);
        ctx.lineWidth = (1.5 + 1.2 * head) * sc;
        ctx.beginPath();
        ctx.moveTo(seg[0].x, seg[0].y);
        ctx.lineTo(seg[1].x, seg[1].y);
        ctx.stroke();
      }
      if (p >= 1) {
        // نبضات تعبر الخيط ذهابًا وإيابًا
        for (let k = 0; k < 2; k += 1) {
          const dir = k === 0 ? 1 : -1;
          const base = frac(amb * 0.22 + idx * 0.37 + k * 0.5);
          const u = dir > 0 ? base : 1 - base;
          for (let s = 0; s < 8; s += 1) {
            const uu = u - dir * s * 0.012;
            if (uu < 0 || uu > 1) continue;
            const q = this.arcPoint(A, B, uu, lift);
            const pp = proj(v, q.x, q.y, q.z);
            if (!pp) continue;
            const a = (1 - s / 8) * 0.9;
            const rr = (3.5 - s * 0.3) * sc;
            ctx.globalAlpha = a;
            ctx.drawImage(
              this.sprites.glow(pack(mixRGB(mixRGB(ca, cb, uu), WHITE, 0.55))),
              pp.x - rr * 3,
              pp.y - rr * 3,
              rr * 6,
              rr * 6,
            );
          }
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  /* ── المنشأة ────────────────────────────────────────────────────── */

  private scanFront(ts: number): number {
    const f = this.fac;
    const W = 1.5;
    const lin = win(ts, TWIN_T.scanFrom, TWIN_T.scanTo);
    const u = mix(lin, smooth(lin), 0.55);
    if (ts >= TWIN_T.scanTo) return f.cMax + W + 5;
    return mix(f.cMin - 1.35, f.cMax + W + 0.6, u);
  }

  private drawFacility(ctx: Ctx, v: View, ts: number, amb: number, cam: CamState): void {
    if (ts < TWIN_T.padForm - 0.3) return;
    const H = HUBS.eastern;
    const kd = proj(v, H.x, H.y, SLAB_H);
    if (!kd) return;
    const padPx = 4.8 * FS * kd.k;
    if (padPx < 14) return;
    const lod = smooth((padPx - 14) / 46);
    const sc = this.sc;
    const f = this.fac;
    const W = 1.5;
    const s = this.scanFront(ts);
    const focusD = Math.max(0.3, cam.dist);
    const ws = this.wseg;

    // محيط الأرضية يُرسم من الزوايا (ينمو من حلقة المحور)
    {
      const pf = easeOutCubic(win(ts, TWIN_T.padForm - 0.2, TWIN_T.padForm + 1.0));
      if (pf > 0 && pf < 1.02) {
        const cs = [
          { x: -2.4, y: -1.6 },
          { x: 2.4, y: -1.6 },
          { x: 2.4, y: 1.6 },
          { x: -2.4, y: 1.6 },
        ];
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = rgba(
          mixRGB(EMERALD, WHITE, 0.45),
          0.9 * lod * (1 - 0.6 * smooth((pf - 0.7) / 0.3)),
        );
        ctx.lineWidth = 1.8 * sc;
        for (let e = 0; e < 4; e += 1) {
          const a = cs[e];
          const b = cs[(e + 1) % 4];
          const sg = projSeg(
            v,
            {
              x: H.x + (a.x * 0.5 + b.x * 0.5 - (b.x - a.x) * 0.5 * pf) * FS,
              y: H.y + (a.y * 0.5 + b.y * 0.5 - (b.y - a.y) * 0.5 * pf) * FS,
              z: SLAB_H,
            },
            {
              x: H.x + (a.x * 0.5 + b.x * 0.5 + (b.x - a.x) * 0.5 * pf) * FS,
              y: H.y + (a.y * 0.5 + b.y * 0.5 + (b.y - a.y) * 0.5 * pf) * FS,
              z: SLAB_H,
            },
          );
          if (!sg) continue;
          ctx.beginPath();
          ctx.moveTo(sg[0].x, sg[0].y);
          ctx.lineTo(sg[1].x, sg[1].y);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      }
    }
    // لوحة الأرضية + الشبكة الدقيقة
    const padA = smoothWin(ts, TWIN_T.padForm, TWIN_T.padForm + 1.2);
    if (padA > 0) {
      const c4 = [
        { x: H.x - 2.4 * FS, y: H.y - 1.6 * FS, z: SLAB_H },
        { x: H.x + 2.4 * FS, y: H.y - 1.6 * FS, z: SLAB_H },
        { x: H.x + 2.4 * FS, y: H.y + 1.6 * FS, z: SLAB_H },
        { x: H.x - 2.4 * FS, y: H.y + 1.6 * FS, z: SLAB_H },
      ];
      const q = this.clipPoly(v, c4);
      if (q) {
        const g = ctx.createRadialGradient(kd.x, kd.y, 0, kd.x, kd.y, Math.max(40, padPx * 0.7));
        g.addColorStop(0, rgba(mixRGB(NAVY, EMERALD, 0.12), 0.95 * padA * lod));
        g.addColorStop(1, rgba(NAVY_DEEP, 0.96 * padA * lod));
        ctx.fillStyle = g;
        this.fillPoly(ctx, q);
      }
      if (padPx > 70) {
        const lb = new LineBatch();
        const rr = 4.2 * easeOutCubic(win(ts, TWIN_T.padForm, TWIN_T.padForm + 1.7));
        const col = pack(mixRGB(EMERALD, CYAN, 0.35));
        const step = 0.2;
        for (let gx = -2.4; gx <= 2.401; gx += step) {
          for (let gy = -1.6; gy < 1.6; gy += 0.4) {
            const mx = gx;
            const my = gy + 0.2;
            const rd = Math.hypot(mx, my);
            const a = smooth((rr - rd) / 0.8) * 0.28;
            if (a < 0.02) continue;
            const sg = projSeg(
              v,
              { x: H.x + gx * FS, y: H.y + gy * FS, z: SLAB_H },
              { x: H.x + gx * FS, y: H.y + (gy + 0.4) * FS, z: SLAB_H },
            );
            if (sg) lb.add(col, a * lod, 0.9 * sc, sg[0].x, sg[0].y, sg[1].x, sg[1].y);
          }
        }
        for (let gy = -1.6; gy <= 1.601; gy += step) {
          for (let gx = -2.4; gx < 2.4; gx += 0.4) {
            const mx = gx + 0.2;
            const my = gy;
            const rd = Math.hypot(mx, my);
            const a = smooth((rr - rd) / 0.8) * 0.28;
            if (a < 0.02) continue;
            const sg = projSeg(
              v,
              { x: H.x + gx * FS, y: H.y + gy * FS, z: SLAB_H },
              { x: H.x + (gx + 0.4) * FS, y: H.y + gy * FS, z: SLAB_H },
            );
            if (sg) lb.add(col, a * lod, 0.9 * sc, sg[0].x, sg[0].y, sg[1].x, sg[1].y);
          }
        }
        ctx.globalCompositeOperation = "lighter";
        lb.flush(ctx);
        ctx.globalCompositeOperation = "source-over";
      }
    }

    // بقعة ضوء على الأرض تحت المنشأة
    if (padA > 0 && padPx > 40) {
      const ring: { x: number; y: number; z: number }[] = [];
      for (let i = 0; i < 40; i += 1) {
        const an = (i / 40) * Math.PI * 2;
        ring.push({
          x: H.x + Math.cos(an) * 4.4 * FS,
          y: H.y + Math.sin(an) * 3.2 * FS,
          z: SLAB_H,
        });
      }
      const q = this.clipPoly(v, ring);
      if (q) {
        const g = ctx.createRadialGradient(kd.x, kd.y, 0, kd.x, kd.y, Math.max(60, padPx * 0.85));
        g.addColorStop(0, rgba(mixRGB(EMERALD, CYAN, 0.4), 0.16 * padA * lod));
        g.addColorStop(1, rgba(EMERALD, 0));
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        this.fillPoly(ctx, q);
        ctx.globalCompositeOperation = "source-over";
      }
    }

    // ── انعكاس الأرضية اللامعة ──
    const doRefl = this.opts.refl && padPx > 110 && ts > TWIN_T.scanFrom;
    const rctx = doRefl ? this.Rf.getContext("2d") : null;
    const lbR = new LineBatch();
    const lb = new LineBatch();
    const db = new DotBatch();
    const baseCol: Record<number, RGB> = {
      [K.STRUCT]: ICE,
      [K.FINE]: mixRGB(ICE, CYAN, 0.55),
      [K.GLOW]: MINT,
      [K.WIRE]: mixRGB(CYAN, ICE, 0.35),
      [K.FENCE]: mixRGB(EMERALD, ICE, 0.4),
      [K.PAD]: mixRGB(EMERALD, ICE, 0.5),
      [K.PIPE]: mixRGB(CYAN, ICE, 0.5),
      [K.INSUL]: mixRGB(ICE, WHITE, 0.4),
    };
    const COLH: number[][] = [0, 0.5, 1].map((hv) =>
      Array.from({ length: 8 }, (_, k) =>
        pack(mixRGB(baseCol[k], mixRGB(EMERALD, WHITE, 0.4), hv * 0.62)),
      ),
    );
    const BASEA: Record<number, number> = {
      [K.STRUCT]: 0.85,
      [K.FINE]: 0.5,
      [K.GLOW]: 0.9,
      [K.WIRE]: 0.62,
      [K.FENCE]: 0.5,
      [K.PAD]: 0.85,
      [K.PIPE]: 0.7,
      [K.INSUL]: 0.7,
    };
    const flowA = smoothWin(ts, TWIN_T.pipesFrom, TWIN_T.pipesFrom + 1.2);
    const heatCol = pack(mixRGB(ICE, WHITE, 0.7));
    const zr = 2 * SLAB_H;
    const n = f.segs.length;
    for (let i = 0; i < n; i += 1) {
      const mr = (s - ws.c[i]) / W;
      if (mr < 0.1) continue;
      const wire = smooth((mr - 0.1) / 0.38);
      if (wire <= 0.001) continue;
      const kind = ws.kind[i];
      const bx = ws.ax[i] + (ws.bx[i] - ws.ax[i]) * wire;
      const by = ws.ay[i] + (ws.by[i] - ws.ay[i]) * wire;
      const bz = ws.az[i] + (ws.bz[i] - ws.az[i]) * wire;
      const sg = projSeg(v, { x: ws.ax[i], y: ws.ay[i], z: ws.az[i] }, { x: bx, y: by, z: bz });
      if (!sg) continue;
      const heat = Math.exp(-Math.pow((mr - 0.2) / 0.2, 2));
      const d = (sg[0].d + sg[1].d) / 2;
      const coc = Math.min(5, Math.abs(1 / d - 1 / focusD) * v.focal * 0.011 * sc * 10);
      let a = BASEA[kind] * ws.wt[i] * (0.6 + 0.4 * wire) + heat * 0.9;
      if (kind === K.PIPE) a += 0.35 * flowA;
      if (kind === K.WIRE) a *= 0.8 + 0.2 * Math.sin(amb * 1.7 + ws.c[i] * 2.0);
      a *= lod / (1 + coc * 0.22);
      if (a < 0.03) continue;
      const wd =
        (1.0 + Math.min(1.1, sg[0].k * 0.0007) + coc * 0.32) * sc * (kind === K.FINE ? 0.8 : 1);
      const hb = ws.hue[i] > 0.7 ? 2 : ws.hue[i] > 0.3 ? 1 : 0;
      lb.add(
        heat > 0.35 ? heatCol : COLH[hb][kind],
        Math.min(1, a),
        wd,
        sg[0].x,
        sg[0].y,
        sg[1].x,
        sg[1].y,
      );
      if (doRefl) {
        const rg = projSeg(
          v,
          { x: ws.ax[i], y: ws.ay[i], z: zr - ws.az[i] },
          { x: bx, y: by, z: zr - bz },
        );
        if (rg)
          lbR.add(
            COLH[hb][kind],
            Math.min(1, a * 0.5),
            wd * 1.1,
            rg[0].x,
            rg[0].y,
            rg[1].x,
            rg[1].y,
          );
      }
    }

    // ── الأسطح (بعد خلف الخطوط الخلفية، قبل الأمامية) ──
    const faceDraw: { f: (typeof f.faces)[number]; d: number; solid: number }[] = [];
    const vpos = { x: v.px, y: v.py, z: v.pz };
    for (const fc of f.faces) {
      const mr = (s - fc.c) / W;
      const solid = smooth((mr - 0.55) / 0.5);
      if (solid <= 0.01) continue;
      const mw = { x: H.x + fc.m.x * FS, y: H.y + fc.m.y * FS, z: SLAB_H + fc.m.z * FS };
      const toCam = { x: vpos.x - mw.x, y: vpos.y - mw.y, z: vpos.z - mw.z };
      const facing = fc.n.x * toCam.x + fc.n.y * toCam.y + fc.n.z * toCam.z;
      if (facing <= 0) continue;
      const d = (mw.x - v.px) * v.fx + (mw.y - v.py) * v.fy + (mw.z - v.pz) * v.fz;
      faceDraw.push({ f: fc, d, solid });
    }
    faceDraw.sort((a, b) => b.d - a.d);
    const LV = { x: -0.45, y: -0.55, z: 0.7 };
    const ll = Math.hypot(LV.x, LV.y, LV.z);
    for (const { f: fc, solid } of faceDraw) {
      const pts = fc.p.map((p) => ({ x: H.x + p.x * FS, y: H.y + p.y * FS, z: SLAB_H + p.z * FS }));
      const q = this.clipPoly(v, pts);
      if (!q) continue;
      if (fc.glow) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = rgba(
          mixRGB(MINT, ICE, 0.4),
          0.55 * solid * lod * (0.8 + 0.2 * Math.sin(amb * 1.3 + fc.c * 3)),
        );
        this.fillPoly(ctx, q);
        ctx.globalCompositeOperation = "source-over";
        continue;
      }
      const lamb = Math.max(0, (fc.n.x * LV.x + fc.n.y * LV.y + fc.n.z * LV.z) / ll);
      const shade = clamp01(0.12 + 0.88 * lamb) * fc.tone * 1.25;
      const lit = mixRGB(FACE_LIT, FACE_LIT_E, fc.hue);
      const dk = mixRGB(FACE_DARK, FACE_DARK_E, fc.hue);
      const col = mixRGB(dk, lit, clamp01(shade));
      ctx.fillStyle = rgba(col, 0.86 * solid * lod);
      this.fillPoly(ctx, q);
    }
    // الأسطح أُسقطت تحت الخطوط: الخطوط ترسم بعدها
    ctx.globalCompositeOperation = "lighter";
    // انعكاس
    if (doRefl && rctx) {
      rctx.clearRect(0, 0, this.w, this.h);
      rctx.globalCompositeOperation = "lighter";
      lbR.flush(rctx);
      ctx.filter = `blur(${(2.2 * sc).toFixed(1)}px)`;
      ctx.globalAlpha = 0.5 * lod;
      ctx.drawImage(this.Rf, 0, 0);
      ctx.globalAlpha = 1;
      ctx.filter = "none";
    }
    lb.flush(ctx);

    // ── سحابة النقاط ──
    const cl = f.cloud;
    const cloudA = smoothWin(ts, TWIN_T.cloudFrom, TWIN_T.cloudFrom + 1.1);
    if (cloudA > 0 && ts < TWIN_T.scanTo + 3) {
      const cCyan = pack(ICE);
      const cMint = pack(MINT);
      const cBlue = pack(mixRGB(CYAN, ICE, 0.3));
      const cols = [cCyan, cBlue, cMint, cCyan];
      for (let i = 0; i < cl.n; i += 1) {
        const mr = (s - cl.c[i]) / W;
        const conv = smooth((mr + 0.95) / 1.15);
        const stay = 1 - smooth((mr - 0.3) / 0.7);
        if (stay <= 0.01) continue;
        // في طور التحليق تُرسم شريحةٌ صغيرة فقط — الباقي يظهر عند اقتراب المسح
        if (conv < 0.02 && hash(i * 3 + 11) > 0.28) continue;
        const e = easeOutCubic(conv);
        const swirl = (1 - e) * 1.9 + amb * 0.12 * (1 - e);
        const cs = Math.cos(swirl);
        const sn = Math.sin(swirl);
        const ox = cl.ox[i] * (1 - e);
        const oy = cl.oy[i] * (1 - e);
        const oz = cl.oz[i] * (1 - e) * (1 + 0.15 * Math.sin(amb * 0.8 + i));
        const px = cl.x[i] + ox * cs - oy * sn;
        const py = cl.y[i] + ox * sn + oy * cs;
        const pz = Math.max(0, cl.z[i] + oz);
        const p = proj(v, H.x + px * FS, H.y + py * FS, SLAB_H + pz * FS);
        if (!p) continue;
        const d = p.d;
        const coc = Math.min(5, Math.abs(1 / d - 1 / focusD) * v.focal * 0.011 * sc * 10);
        const heat = Math.exp(-Math.pow((mr - 0.0) / 0.5, 2));
        let a = cloudA * stay * (0.34 + 0.6 * e + 0.5 * heat) * lod;
        a /= 1 + coc * 0.3;
        if (a < 0.04) continue;
        db.add(cols[cl.cls[i]], Math.min(1, a), p.x, p.y, (1.5 + e * 0.4 + coc * 0.55) * sc);
      }
      db.flush(ctx);
    }

    // ── مستوى المسح الليزري ──
    if (this.opts.scan && ts >= TWIN_T.scanFrom - 0.2 && ts < TWIN_T.scanTo + 1.3) {
      this.drawScanPlane(ctx, v, ts, s, lod);
    }

    // ── حلقة الاكتمال على النبضة 17.0 ──
    {
      const du = (ts - TWIN_T.scanTo) / 1.5;
      if (du > 0 && du < 1) {
        ctx.globalCompositeOperation = "lighter";
        for (let k = 0; k < 2; k += 1) {
          const u = clamp01(du - k * 0.15);
          if (u <= 0) continue;
          ctx.strokeStyle = rgba(mixRGB(EMERALD, WHITE, 0.55), 0.85 * Math.pow(1 - u, 1.4) * lod);
          ctx.lineWidth = (2.4 - 1.2 * u) * sc;
          this.ring3(
            ctx,
            v,
            H.x,
            H.y,
            SLAB_H + 0.01,
            (0.4 + 6.5 * easeOutCubic(u)) * FS,
            0,
            Math.PI * 2,
            96,
          );
        }
        ctx.globalCompositeOperation = "source-over";
      }
    }
    // ── الأنابيب: تدفّق التوجيه والإفادة ──
    if (ts >= TWIN_T.routeFrom) this.drawFlows(ctx, v, ts, amb, lod);
    // ── مخاريط الكاميرات ──
    if (ts >= TWIN_T.pipesFrom - 0.4) this.drawCams(ctx, v, ts, amb, lod);
    ctx.globalCompositeOperation = "source-over";
  }

  private drawScanPlane(ctx: Ctx, v: View, ts: number, s: number, lod: number): void {
    const H = HUBS.eastern;
    const sc = this.sc;
    const dx = SCAN_DIR.x;
    const dy = SCAN_DIR.y;
    const px = -dy;
    const py = dx;
    const span = 1.95;
    const zTop = 1.7;
    const fade =
      smoothWin(ts, TWIN_T.scanFrom - 0.1, TWIN_T.scanFrom + 0.4) *
      (1 - smoothWin(ts, TWIN_T.scanTo + 0.2, TWIN_T.scanTo + 1.3));
    if (fade <= 0.01) return;
    const pt = (u: number, z: number, back = 0) => {
      const base = s - 0.35 * z - back;
      return {
        x: H.x + (base * dx + u * px) * FS,
        y: H.y + (base * dy + u * py) * FS,
        z: SLAB_H + z * FS,
      };
    };
    // أثر المسح على الأرض: شرائح تخبو خلف الجبهة (بلا تدرّجات ممتدّة)
    {
      const back = 1.7;
      const N = 9;
      for (let i = 0; i < N; i += 1) {
        const b0 = (back * i) / N;
        const b1 = (back * (i + 1)) / N;
        const cs = [pt(-span, 0, b0), pt(span, 0, b0), pt(span, 0, b1), pt(-span, 0, b1)];
        const nf = smooth((Math.min(...cs.map((c) => this.depthAt(v, c.x, c.y, c.z))) - 0.1) / 0.4);
        if (nf < 0.02) continue;
        const q = this.clipPoly(v, cs);
        if (!q) continue;
        const k = 1 - (i + 0.5) / N;
        ctx.fillStyle = rgba(mixRGB(CYAN, WHITE, 0.25), 0.15 * k * k * fade * lod * nf);
        this.fillPoly(ctx, q);
      }
    }
    // الستارة العمودية: شرائح أفقية تخبو مع الارتفاع (بلا تدرّجات ممتدّة)
    {
      const N = 8;
      for (let i = 0; i < N; i += 1) {
        const z0 = (zTop * i) / N;
        const z1 = (zTop * (i + 1)) / N;
        const cs = [pt(-span, z0), pt(span, z0), pt(span, z1), pt(-span, z1)];
        const nf = smooth((Math.min(...cs.map((c) => this.depthAt(v, c.x, c.y, c.z))) - 0.1) / 0.4);
        if (nf < 0.02) continue;
        const q = this.clipPoly(v, cs);
        if (!q) continue;
        const k = 1 - (i + 0.5) / N;
        ctx.fillStyle = rgba(mixRGB(CYAN, WHITE, 0.3), 0.075 * k * k * fade * lod * nf);
        this.fillPoly(ctx, q);
      }
    }
    const line = (
      u0: number,
      z0: number,
      u1: number,
      z1: number,
      a: number,
      wd: number,
      col: RGB,
    ): void => {
      const sg = projSeg(v, pt(u0, z0), pt(u1, z1));
      if (!sg) return;
      ctx.strokeStyle = rgba(col, a * fade * lod);
      ctx.lineWidth = wd * sc;
      ctx.beginPath();
      ctx.moveTo(sg[0].x, sg[0].y);
      ctx.lineTo(sg[1].x, sg[1].y);
      ctx.stroke();
    };
    const hot = mixRGB(CYAN, WHITE, 0.65);
    line(-span, 0, span, 0, 1, 2.4, hot);
    line(-span, zTop, span, zTop, 0.45, 1.2, CYAN);
    line(-span, 0, -span, zTop, 0.35, 1, CYAN);
    line(span, 0, span, zTop, 0.35, 1, CYAN);
    for (let k = 0; k < 5; k += 1) {
      const z = zTop * frac(ts * 0.8 + k / 5);
      line(-span, z, span, z, 0.3 * (1 - z / zTop), 1, CYAN);
    }
    for (let u = -span + 0.39; u < span; u += 0.39) line(u, 0, u, zTop, 0.1, 0.9, CYAN);
    const c0 = pt(0, 0.1);
    const pc = proj(v, c0.x, c0.y, c0.z);
    if (pc) {
      this.flares.push({
        x: pc.x,
        y: pc.y,
        r: 70 * sc,
        a: 0.6 * fade * lod,
        c: pack(mixRGB(CYAN, WHITE, 0.5)),
        streak: 1.8,
      });
    }
  }

  /** نقطة على أنبوب بمعامل طول. */
  private pipePt(pi: number, dist: number): { x: number; y: number; z: number } {
    const p = this.fac.pipes[pi];
    const d = clamp(dist, 0, p.len);
    let i = 1;
    while (i < p.acc.length - 1 && p.acc[i] < d) i += 1;
    const t = (d - p.acc[i - 1]) / Math.max(1e-6, p.acc[i] - p.acc[i - 1]);
    const a = p.pts[i - 1];
    const b = p.pts[i];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
  }

  private drawFlows(ctx: Ctx, v: View, ts: number, amb: number, lod: number): void {
    const H = HUBS.eastern;
    const sc = this.sc;
    const route = smoothWin(ts, TWIN_T.routeFrom, TWIN_T.routeFrom + 0.8);
    const fb = smoothWin(ts, TWIN_T.feedbackFrom, TWIN_T.feedbackFrom + 0.8);
    const speed = 1.25;
    // حلقات: التوجيه يتسع من المبنى الرئيسي، والإفادة تنقبض إليه
    const org = { x: H.x + 0.15 * FS, y: H.y + 0.8 * FS };
    const zg = SLAB_H + 0.012;
    const ringKind = (base: number, out: boolean): void => {
      for (let k = 0; k < 8; k += 1) {
        const u = (ts - base - k * 1.0) / 2.2;
        if (u <= 0 || u >= 1) continue;
        const rd = out ? 0.3 + 3.0 * easeOutCubic(u) : 3.3 - 3.0 * easeInOutCubic(u);
        const a = out ? 0.62 * Math.pow(1 - u, 1.5) : 0.6 * Math.sin(Math.PI * Math.pow(u, 0.7));
        ctx.strokeStyle = rgba(
          out ? mixRGB(CYAN, WHITE, 0.5) : mixRGB(EMERALD, WHITE, 0.55),
          a * lod,
        );
        ctx.lineWidth = (out ? 1.8 : 1.5) * sc;
        this.ring3(ctx, v, org.x, org.y, zg, rd * FS, 0, Math.PI * 2, 72);
      }
    };
    if (route > 0) ringKind(TWIN_T.routeFrom, true);
    if (fb > 0) ringKind(TWIN_T.feedbackFrom, false);
    for (let pi = 0; pi < this.fac.pipes.length; pi += 1) {
      const pipe = this.fac.pipes[pi];
      const n = Math.max(1, Math.round(pipe.len / 0.7));
      for (let k = 0; k < n; k += 1) {
        for (const dir of [1, -1] as const) {
          const a0 = dir > 0 ? route : fb;
          if (a0 <= 0) continue;
          const ph = frac((amb * speed) / pipe.len + k / n + (dir > 0 ? 0 : 0.5 / n) + pi * 0.173);
          const dist = dir > 0 ? ph * pipe.len : (1 - ph) * pipe.len;
          const col = dir > 0 ? mixRGB(CYAN, WHITE, 0.55) : mixRGB(EMERALD, WHITE, 0.6);
          for (let tl = 0; tl < 7; tl += 1) {
            const dd = dist - dir * tl * 0.05;
            if (dd < 0 || dd > pipe.len) continue;
            const q = this.pipePt(pi, dd);
            const p = proj(v, H.x + q.x * FS, H.y + q.y * FS, SLAB_H + (q.z + 0.02) * FS);
            if (!p) continue;
            const rr = (4.2 - tl * 0.42) * sc * (0.6 + Math.min(1.0, p.k * FS * 0.01));
            ctx.globalAlpha = clamp01((1 - tl / 7) * 0.8 * a0 * lod);
            ctx.drawImage(
              this.sprites.glow(pack(col)),
              p.x - rr * 2.4,
              p.y - rr * 2.4,
              rr * 4.8,
              rr * 4.8,
            );
          }
        }
      }
    }
    // نبضات على الموصّلات بين الأبراج (إرسال)
    const sp = this.fac.spans;
    for (let i = 0; i < sp.length; i += 1) {
      const s = sp[i];
      const dir = i % 2 === 0 ? 1 : -1;
      for (let k = 0; k < 2; k += 1) {
        const u0 = frac(amb * 0.42 * dir + i * 0.37 + k * 0.5);
        const u = dir > 0 ? u0 : u0;
        const x = s.a.x + (s.b.x - s.a.x) * u;
        const y = s.a.y + (s.b.y - s.a.y) * u;
        const z = s.a.z + (s.b.z - s.a.z) * u - s.sag * 4 * u * (1 - u);
        const p = proj(v, H.x + x * FS, H.y + y * FS, SLAB_H + z * FS);
        if (!p) continue;
        const rr = 3.6 * sc * (0.6 + Math.min(1.6, p.k * FS * 0.01));
        ctx.globalAlpha = 0.85 * route * lod * Math.sin(Math.PI * u);
        ctx.drawImage(
          this.sprites.glow(pack(mixRGB(CYAN, WHITE, 0.6))),
          p.x - rr * 2.2,
          p.y - rr * 2.2,
          rr * 4.4,
          rr * 4.4,
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawCams(ctx: Ctx, v: View, ts: number, amb: number, lod: number): void {
    const H = HUBS.eastern;
    const sc = this.sc;
    const on = smoothWin(ts, TWIN_T.pipesFrom - 0.4, TWIN_T.pipesFrom + 1.0);
    if (on <= 0) return;
    for (const c of this.fac.cams) {
      const ang = c.bearing + 0.5 * Math.sin((amb * Math.PI * 2) / 6 + c.phase);
      const half = 0.42;
      const R = 2.7;
      const ap = { x: H.x + c.pos.x * FS, y: H.y + c.pos.y * FS, z: SLAB_H + 0.02 * FS };
      const pts = [ap];
      const steps = 8;
      for (let i = 0; i <= steps; i += 1) {
        const a = ang - half + (2 * half * i) / steps;
        pts.push({
          x: H.x + (c.pos.x + Math.cos(a) * R) * FS,
          y: H.y + (c.pos.y + Math.sin(a) * R) * FS,
          z: SLAB_H + 0.01 * FS,
        });
      }
      const q = this.clipPoly(v, pts);
      if (!q) continue;
      ctx.fillStyle = rgba(CYAN, 0.12 * on * lod);
      this.fillPoly(ctx, q);
      ctx.strokeStyle = rgba(mixRGB(CYAN, WHITE, 0.5), 0.7 * on * lod);
      ctx.lineWidth = 1.3 * sc;
      ctx.beginPath();
      ctx.moveTo(q[0].x, q[0].y);
      ctx.lineTo(q[1].x, q[1].y);
      for (let i = 2; i < q.length; i += 1) ctx.lineTo(q[i].x, q[i].y);
      ctx.lineTo(q[0].x, q[0].y);
      ctx.stroke();
      // ضوء المؤشّر
      const hp = proj(v, H.x + c.pos.x * FS, H.y + c.pos.y * FS, SLAB_H + c.pos.z * FS);
      if (hp) {
        const rr = 5 * sc * on;
        ctx.globalAlpha = 0.9 * lod * (0.6 + 0.4 * Math.sin(amb * 3 + c.phase));
        ctx.drawImage(this.sprites.glow(pack(CYAN)), hp.x - rr * 2, hp.y - rr * 2, rr * 4, rr * 4);
        ctx.globalAlpha = 1;
      }
    }
  }

  /* ── الموجة الصادمة ─────────────────────────────────────────────── */

  private drawShock(ctx: Ctx, v: View, ts: number): void {
    const R = this.shockR(ts);
    if (R < 0) return;
    const amp = this.shockAmp(ts);
    if (amp < 0.02) return;
    const sc = this.sc;
    ctx.globalCompositeOperation = "lighter";
    const z = SLAB_H * 0.9;
    const ringAt = (r: number, a: number, wd: number): void => {
      ctx.lineWidth = wd * sc;
      ctx.strokeStyle = rgba(mixRGB(CYAN, WHITE, 0.55), a);
      this.ring3(ctx, v, HUB_E.x, HUB_E.y, z, r, 0, Math.PI * 2, 160);
    };
    ringAt(R, 0.07 * amp, 16);
    ringAt(R, 0.22 * amp, 6);
    ringAt(R, 0.9 * amp, 1.8);
    ringAt(R * 0.82, 0.3 * amp, 1.2);
    ringAt(R * 0.64, 0.12 * amp, 1);
    ctx.globalCompositeOperation = "source-over";
  }

  /* ── أعمدة الضوء ────────────────────────────────────────────────── */

  private pillarState(r: RegionId, ts: number): { frac: number; width: number } {
    if (r === "eastern") {
      const g = easeInOutCubic(win(ts, TWIN_T.uplink, TWIN_T.uplinkTop));
      const bloom = smoothWin(ts, TWIN_T.shock - 0.4, TWIN_T.shock + 1.2);
      return { frac: ts < TWIN_T.uplink ? 0 : g, width: mix(0.07 + 0.06 * g, 0.42, bloom) };
    }
    const d = Math.hypot(HUBS[r].x - HUB_E.x, HUBS[r].y - HUB_E.y);
    const t0 = TWIN_T.shock + d / SHOCK_SPEED;
    const g = easeOutCubic(win(ts, t0, t0 + 1.1));
    return { frac: g, width: 0.42 };
  }

  private drawPillar(
    ctx: Ctx,
    v: View,
    x: number,
    y: number,
    z0: number,
    height: number,
    width: number,
    rgbc: RGB,
    amp: number,
    amb: number,
    seed: number,
  ): void {
    if (height <= 0.001 || amp <= 0.01) return;
    const sc = this.sc;
    const rh = Math.hypot(v.rx, v.ry) || 1;
    const rx = v.rx / rh;
    const ry = v.ry / rh;
    const B = { x, y, z: z0 };
    const T = { x, y, z: z0 + height };
    const pb = proj(v, B.x, B.y, B.z);
    const pt = proj(v, T.x, T.y, T.z);
    const hot = mixRGB(rgbc, WHITE, 0.5);
    const layer = (wBase: number, wTop: number, a: number, col: RGB): void => {
      const q = this.clipPoly(v, [
        { x: B.x - rx * wBase, y: B.y - ry * wBase, z: B.z },
        { x: B.x + rx * wBase, y: B.y + ry * wBase, z: B.z },
        { x: T.x + rx * wTop, y: T.y + ry * wTop, z: T.z },
        { x: T.x - rx * wTop, y: T.y - ry * wTop, z: T.z },
      ]);
      if (!q || !pb || !pt) return;
      const g = ctx.createLinearGradient(pb.x, pb.y, pt.x, pt.y);
      g.addColorStop(0, rgba(col, a * amp));
      g.addColorStop(0.55, rgba(col, a * amp * 0.45));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      this.fillPoly(ctx, q);
    };
    ctx.globalCompositeOperation = "lighter";
    layer(width * 2.5, width * 1.5, 0.13, rgbc);
    layer(width * 1.0, width * 0.55, 0.34, rgbc);
    layer(width * 0.22, width * 0.12, 0.9, hot);
    // حلقات صاعدة على العمود
    ctx.lineWidth = 1.1 * sc;
    for (let k = 0; k < 4; k += 1) {
      const u = frac(amb * 0.28 + k / 4 + seed * 0.13);
      const zz = z0 + height * u;
      ctx.strokeStyle = rgba(hot, (1 - u) * 0.6 * amp);
      this.ring3(ctx, v, x, y, zz, width * (1.4 + 0.6 * u), 0, Math.PI * 2, 28);
    }
    // شرر صاعد
    const db = new DotBatch();
    for (let k = 0; k < 26; k += 1) {
      const u = frac(hash(seed * 131 + k) + amb * (0.12 + 0.2 * hash(seed * 17 + k)));
      const a = hash(seed * 53 + k) * Math.PI * 2;
      const rr = width * (0.4 + 1.1 * hash(seed * 29 + k));
      const p = proj(v, x + Math.cos(a) * rr, y + Math.sin(a) * rr, z0 + height * u);
      if (!p) continue;
      db.add(pack(hot), (1 - u) * 0.9 * amp, p.x, p.y, 1.6 * sc);
    }
    db.flush(ctx);
    // قاعدة وقمّة
    if (pb) {
      const r1 = Math.max(10, pb.k * width * 3.6);
      ctx.globalAlpha = clamp01(0.7 * amp);
      ctx.drawImage(this.sprites.glow(pack(hot)), pb.x - r1, pb.y - r1 * 0.7, r1 * 2, r1 * 1.4);
      ctx.globalAlpha = 1;
    }
    if (pt) {
      const r2 = Math.max(8, pt.k * width * 3) * sc;
      ctx.globalAlpha = clamp01(0.85 * amp);
      ctx.drawImage(
        this.sprites.glow(pack(mixRGB(rgbc, WHITE, 0.7))),
        pt.x - r2,
        pt.y - r2,
        r2 * 2,
        r2 * 2,
      );
      ctx.globalAlpha = 1;
      this.flares.push({ x: pt.x, y: pt.y, r: r2 * 1.5, a: 0.55 * amp, c: pack(hot), streak: 1.2 });
    }
    ctx.globalCompositeOperation = "source-over";
  }

  private drawPillars(ctx: Ctx, v: View, ts: number, amb: number): void {
    let seed = 1;
    for (const r of this.pillarRegions) {
      const st = this.pillarState(r, ts);
      seed += 1;
      if (st.frac <= 0) continue;
      const hp = HUBS[r];
      let x = hp.x;
      let y = hp.y;
      let z0 = SLAB_H + 0.02;
      if (r === "eastern") {
        // يخرج الشعاع من قمّة صاري المنشأة
        const m = this.fac.mast;
        x = hp.x + m.x * FS;
        y = hp.y + m.y * FS;
        z0 = SLAB_H + m.z * FS;
      }
      const height = PILLAR_H * st.frac;
      if (r === "eastern" && ts >= TWIN_T.uplink && ts < TWIN_T.uplink + 1.4) {
        const u = (ts - TWIN_T.uplink) / 1.4;
        ctx.globalCompositeOperation = "lighter";
        for (let k = 0; k < 2; k += 1) {
          const uu = clamp01(u - k * 0.18);
          if (uu <= 0) continue;
          ctx.strokeStyle = rgba(mixRGB(CYAN, WHITE, 0.6), 0.8 * Math.pow(1 - uu, 1.5));
          ctx.lineWidth = 1.8 * this.sc;
          this.ring3(ctx, v, x, y, z0, 0.04 + 0.5 * easeOutCubic(uu), 0, Math.PI * 2, 48);
        }
        ctx.globalCompositeOperation = "source-over";
      }
      const col = r === "eastern" ? mixRGB(REGION_RGB.eastern, CYAN, 0.35) : REGION_RGB[r];
      this.drawPillar(ctx, v, x, y, z0, height, st.width, col, 1, amb, seed);
      // رأس الشعاع المنطلق
      if (r === "eastern" && st.frac < 1) {
        const hp2 = proj(v, x, y, z0 + height);
        if (hp2) {
          const rr = 26 * this.sc;
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.95;
          ctx.drawImage(this.sprites.glow(pack(WHITE)), hp2.x - rr, hp2.y - rr, rr * 2, rr * 2);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
      }
    }
  }

  /* ── غبار وبقع ضوء (عمق ميدان) ──────────────────────────────────── */

  private drawDust(ctx: Ctx, v: View, ts: number, amb: number, cam: CamState): void {
    if (ts < 11.4 || !this.opts.dust) return;
    const H = HUBS.eastern;
    const camDist = Math.hypot(v.px - H.x, v.py - H.y, v.pz - SLAB_H);
    const a0 = (1 - smooth((camDist - 3) / 5)) * smoothWin(ts, 11.4, 12.4);
    if (a0 <= 0.01) return;
    const sc = this.sc;
    const focusD = Math.max(0.3, cam.dist);
    ctx.globalCompositeOperation = "lighter";
    for (const d of this.dust) {
      const x = H.x + d.x + Math.sin(amb * 0.2 * d.s + d.ph) * 0.05;
      const y = H.y + d.y + Math.cos(amb * 0.17 * d.s + d.ph) * 0.05;
      const z = SLAB_H + ((d.z + amb * 0.015 * d.s) % 1.5);
      const p = proj(v, x, y, z);
      if (!p) continue;
      const coc = Math.abs(1 / p.d - 1 / focusD) * v.focal * 0.011 * sc * 10;
      const rad = (1.4 + Math.min(40, coc * 3.2)) * sc;
      const al = (0.32 / (1 + coc * 0.5)) * a0 * (0.6 + 0.4 * Math.sin(amb * 0.8 + d.ph));
      if (al < 0.02) continue;
      ctx.globalAlpha = al;
      const spr = coc > 2.5 ? this.sprites.disc(pack(ICE)) : this.sprites.glow(pack(ICE));
      ctx.drawImage(spr, p.x - rad, p.y - rad, rad * 2, rad * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /* ── غبار الهواء: بقعٌ ناعمة بعيدة عن البؤرة تمنح العمق ─────────────── */

  private airDust: { x: number; y: number; z: number; ph: number; s: number }[] | null = null;

  private drawAirDust(ctx: Ctx, v: View, ts: number, amb: number): void {
    const a0 = (0.4 + 0.6 * smoothWin(ts, 0.0, 2.0)) * (1 - smoothWin(ts, 6.0, 9.0));
    if (a0 <= 0.01) return;
    if (!this.airDust) {
      const r = rng(2024);
      this.airDust = Array.from({ length: 46 }, () => ({
        x: (r() - 0.5) * 34,
        y: -34 + r() * 40,
        z: 0.2 + r() * 9,
        ph: r() * 10,
        s: 0.3 + r() * 0.7,
      }));
    }
    ctx.globalCompositeOperation = "lighter";
    for (const d of this.airDust) {
      const x = d.x + Math.sin(amb * 0.12 * d.s + d.ph) * 0.8;
      const y = d.y + amb * 0.25 * d.s;
      const z = d.z + Math.sin(amb * 0.1 + d.ph) * 0.4;
      const p = proj(v, x, y, z);
      if (!p) continue;
      const focus = 38;
      const coc = Math.abs(1 / p.d - 1 / focus) * v.focal * 0.55;
      const rad = (2 + Math.min(34, coc * 4)) * this.sc;
      const al = (0.22 / (1 + coc * 0.35)) * a0 * (0.6 + 0.4 * Math.sin(amb * 0.7 + d.ph));
      if (al < 0.015) continue;
      ctx.globalAlpha = al;
      ctx.drawImage(
        coc > 2 ? this.sprites.disc(pack(mixRGB(CYAN, ICE, 0.5))) : this.sprites.glow(pack(ICE)),
        p.x - rad,
        p.y - rad,
        rad * 2,
        rad * 2,
      );
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  private caStrength(t: number, speed: number): number {
    let e = 0.0013 * smooth((speed - 18) / 60);
    const dt = t - TWIN_T.shock;
    if (dt > 0 && dt < 1.2) e += 0.0016 * Math.exp(-dt * 4.5);
    const du = t - TWIN_T.uplink;
    if (du > 0 && du < 1) e += 0.0009 * Math.exp(-du * 5);
    return Math.min(0.0024, e);
  }

  /** فصل القنوات: الأحمر يكبّر قليلًا والأزرق يصغّر حول المركز. */
  private chromatic(out: Ctx, eps: number): void {
    const { w, h } = this;
    const t1 = this.T1.getContext("2d");
    const t2 = this.T2.getContext("2d");
    if (!t1 || !t2) return;
    t1.globalCompositeOperation = "copy";
    t1.drawImage(out.canvas as HTMLCanvasElement, 0, 0);
    out.globalCompositeOperation = "source-over";
    out.fillStyle = "#000";
    out.fillRect(0, 0, w, h);
    out.globalCompositeOperation = "lighter";
    const chans: [string, number][] = [
      ["rgb(255,0,0)", 1 + eps],
      ["rgb(0,255,0)", 1],
      ["rgb(0,0,255)", 1 - eps],
    ];
    for (const [col, sc] of chans) {
      t2.globalCompositeOperation = "copy";
      const dw = w * sc;
      const dh = h * sc;
      t2.drawImage(this.T1, (w - dw) / 2, (h - dh) / 2, dw, dh);
      t2.globalCompositeOperation = "multiply";
      t2.fillStyle = col;
      t2.fillRect(0, 0, w, h);
      out.drawImage(this.T2, 0, 0);
    }
    out.globalCompositeOperation = "source-over";
  }

  /* ═══════════════ ما بعد المعالجة ═══════════════ */

  private post(out: Ctx, t: number, speed: number): void {
    const { w, h } = this;
    void speed;
    out.globalCompositeOperation = "copy";
    out.globalAlpha = 1;
    out.filter = "none";
    out.drawImage(this.A, 0, 0);
    out.globalCompositeOperation = "lighter";

    if (this.opts.bloom) {
      const q = this.Q.getContext("2d");
      const e = this.E.getContext("2d");
      const f = this.F.getContext("2d");
      if (q && e && f) {
        q.globalCompositeOperation = "copy";
        q.filter = "contrast(1.5) brightness(0.9)";
        q.imageSmoothingQuality = "high";
        q.drawImage(this.A, 0, 0, this.Q.width, this.Q.height);
        q.filter = "none";
        e.globalCompositeOperation = "copy";
        e.filter = "blur(1.5px)";
        e.imageSmoothingQuality = "high";
        e.drawImage(this.Q, 0, 0, this.E.width, this.E.height);
        e.filter = "none";
        f.globalCompositeOperation = "copy";
        f.filter = "blur(1.5px)";
        f.imageSmoothingQuality = "high";
        f.drawImage(this.E, 0, 0, this.F.width, this.F.height);
        f.filter = "none";
        out.imageSmoothingEnabled = true;
        out.imageSmoothingQuality = "high";
        const beatPh = (t % 0.5) / 0.5;
        const pulse = 1 + 0.12 * Math.exp(-beatPh * 5) * (t > 4 && t < 29 ? 1 : 0);
        out.globalAlpha = 0.42 * pulse;
        out.filter = `blur(${(1.5 * this.sc).toFixed(1)}px)`;
        out.drawImage(this.Q, 0, 0, w, h);
        out.filter = "none";
        out.globalAlpha = 0.42;
        out.drawImage(this.E, 0, 0, w, h);
        out.globalAlpha = 0.5;
        out.drawImage(this.F, 0, 0, w, h);
        out.globalAlpha = 1;
      }
    }

    // وهجات أنامورفية
    for (const fl of this.flares) {
      if (fl.a <= 0.01) continue;
      const col = fl.c;
      out.globalAlpha = clamp01(fl.a * 0.55);
      const L = fl.r * 14 * fl.streak;
      const th = Math.max(2.5, fl.r * 0.14);
      out.drawImage(this.sprites.glow(col), fl.x - L / 2, fl.y - th / 2, L, th);
      out.globalAlpha = clamp01(fl.a * 0.9);
      const L2 = fl.r * 4.6 * fl.streak;
      out.drawImage(this.sprites.glow(col), fl.x - L2 / 2, fl.y - th * 0.3, L2, th * 0.6);
      out.globalAlpha = clamp01(fl.a * 0.4);
      const rr = fl.r * 1.4;
      out.drawImage(this.sprites.glow(col), fl.x - rr, fl.y - rr, rr * 2, rr * 2);
    }
    out.globalAlpha = 1;

    // انحراف لونيّ شعاعيّ خفيف على لحظات الحركة الشديدة والموجة
    const eps = this.caStrength(t, speed);
    if (this.opts.ca && eps > 0.0002) this.chromatic(out, eps);

    // فينييت
    out.globalCompositeOperation = "source-over";
    const g = out.createRadialGradient(w / 2, h / 2, h * 0.32, w / 2, h / 2, w * 0.66);
    g.addColorStop(0, "rgba(2,5,12,0)");
    g.addColorStop(1, "rgba(2,5,12,0.62)");
    out.fillStyle = g;
    out.fillRect(0, 0, w, h);

    // حبيبات/تنقيط خفيف
    if (this.opts.grain > 0) {
      const ox = Math.floor(hash(Math.round(t * 30) * 3 + 1) * 256);
      const oy = Math.floor(hash(Math.round(t * 30) * 3 + 2) * 256);
      out.globalCompositeOperation = "soft-light";
      out.globalAlpha = this.opts.grain;
      for (let x = -ox; x < w; x += 256) {
        for (let y = -oy; y < h; y += 256) out.drawImage(this.noiseTile, x, y);
      }
      out.globalAlpha = 1;
      out.globalCompositeOperation = "source-over";
    }
  }
}
