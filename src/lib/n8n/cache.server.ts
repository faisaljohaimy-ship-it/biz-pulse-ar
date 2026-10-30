/**
 * ذاكرة نتائج البحث — لكل معزول (isolate)، LRU، بساعةٍ قابلة للحقن.
 *
 * ## الأرقام (العقد)
 *
 * - السعة: 200 مدخل، الأقدم استعمالًا يُخرَج أولًا.
 * - الصلاحية: 6 ساعات، و30 دقيقة حين `freshness = month` (الأخبار تتقادم أسرع).
 * - الكاش السالب: 30 ث لفشلٍ أو لنتيجةٍ فارغة — كي لا يدفع السؤال نفسه مهلة القناة كاملةً
 *   كلّما أعاده مستخدم، ولا نُغرق n8n بنداءٍ فاشلٍ مكرّر.
 *
 * ## المفتاح: الموجز المعياري لا الجملة
 *
 * يُبنى المفتاح من السطح والوضع واللغة والحداثة **وسقف النتائج** والكلمات والرموز بعد توحيدها
 * (حروف صغيرة، مرتّبة، بلا تكرار). فسؤالان بصياغتين مختلفتين وكلماتٍ واحدة يتشاركان مدخلًا. ولا
 * يدخل المفتاح أي هوية مستخدم: النتيجة بحثٌ عام على الويب لا تتغيّر بمن سأل.
 *
 * **السقف جزء من المفتاح** (مراجعة P1، ٢٠٢٦/١٠/٣٠): القيمة المخزَّنة مقطوعة أصلًا عند سقف الطلب
 * الذي ملأها، فمفتاحٌ بلا سقف يُخدم منه نداءٌ سقفه 5 قائمةَ نداءٍ سقفه 1 (نتيجة واحدة لسائلٍ طلب
 * خمسًا، ولا يبلغ n8n أصلًا) ويُخدم منه سقفه 1 قائمةُ سقفها 5 (يتجاوز السقفَ الذي طلبه المستدعي).
 *
 * ## ما لا تفعله
 *
 * لا تُسجِّل مفاتيح ولا قيمًا (قد تحمل كلمات السؤال)، ولا تعبر المعزول، ولا تُكتب في قاعدة. وهي
 * مجرّد خريطة: ضياعها عند إعادة تدوير المعزول تكلفة نداءٍ إضافي لا أكثر.
 */
import type { Freshness, N8nSurface } from "./protocol";

export const CACHE_MAX_ENTRIES = 200;
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const CACHE_TTL_MONTH_MS = 30 * 60 * 1000;
export const CACHE_NEGATIVE_TTL_MS = 30_000;

/** صلاحية مدخلٍ موجب بحسب الحداثة المطلوبة. */
export function ttlFor(freshness: Freshness): number {
  return freshness === "month" ? CACHE_TTL_MONTH_MS : CACHE_TTL_MS;
}

export interface CacheKeyInput {
  readonly surface: N8nSurface;
  readonly mode: string;
  readonly freshness: Freshness;
  readonly lang: string;
  /** سقف النتائج المطلوب (1–5): القيمة المخزَّنة مقطوعة عنده، فلا تُخدم لسقفٍ آخر. */
  readonly maxResults: number;
  readonly terms: readonly string[];
  readonly codes: readonly string[];
}

const canon = (xs: readonly string[], upper: boolean): string =>
  Array.from(
    new Set(
      xs
        .map((x) => x.normalize("NFKC").trim())
        .map((x) => (upper ? x.toUpperCase() : x.toLowerCase()))
        .filter((x) => x.length > 0),
    ),
  )
    .sort()
    .join("\u0001");

/** مفتاح الموجز المعياري. نصٌّ واحد ثابت الصياغة؛ لا يُسجَّل. */
export function cacheKeyOf(input: CacheKeyInput): string {
  return [
    "v1",
    input.surface,
    input.mode,
    input.freshness,
    input.lang,
    String(input.maxResults),
    canon(input.terms, false),
    canon(input.codes, true),
  ].join("\u0002");
}

export type CacheLookup<T> =
  | { readonly kind: "hit"; readonly value: T }
  | { readonly kind: "negative"; readonly reason: string }
  | { readonly kind: "miss" };

type Entry<T> =
  | { readonly kind: "value"; readonly value: T; readonly expiresAt: number }
  | { readonly kind: "negative"; readonly reason: string; readonly expiresAt: number };

export interface ResearchCacheOptions {
  readonly now?: () => number;
  readonly maxEntries?: number;
}

export class ResearchCache<T> {
  private readonly now: () => number;
  private readonly max: number;
  // ترتيب الإدراج في `Map` هو ترتيب الاستعمال: القراءة تُعيد الإدراج في الذيل، والإخراج من الرأس.
  private readonly map = new Map<string, Entry<T>>();

  constructor(opts: ResearchCacheOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.max = opts.maxEntries ?? CACHE_MAX_ENTRIES;
  }

  get size(): number {
    return this.map.size;
  }

  get(key: string): CacheLookup<T> {
    const e = this.map.get(key);
    if (!e) return { kind: "miss" };
    if (this.now() >= e.expiresAt) {
      this.map.delete(key);
      return { kind: "miss" };
    }
    this.map.delete(key);
    this.map.set(key, e);
    return e.kind === "value"
      ? { kind: "hit", value: e.value }
      : { kind: "negative", reason: e.reason };
  }

  set(key: string, value: T, ttlMs: number): void {
    this.put(key, { kind: "value", value, expiresAt: this.now() + ttlMs });
  }

  /** فشلٌ أو فراغ: يُتذكَّر 30 ث، والسبب ثابتٌ من القائمة المغلقة لا نصّ بعيد. */
  setNegative(key: string, reason: string): void {
    this.put(key, { kind: "negative", reason, expiresAt: this.now() + CACHE_NEGATIVE_TTL_MS });
  }

  clear(): void {
    this.map.clear();
  }

  private put(key: string, entry: Entry<T>): void {
    this.map.delete(key);
    this.map.set(key, entry);
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next();
      if (oldest.done) break;
      this.map.delete(oldest.value);
    }
  }
}
