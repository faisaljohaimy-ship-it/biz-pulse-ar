/**
 * العلامة الكتابية «سَدِيد | SADEED».
 *
 * WHY A COMPONENT AND NOT AN IMAGE
 * The owner asked for a designed mark that stays LIVE text: translatable,
 * selectable, readable by a screen reader, and re-flowing at any width. An
 * exported PNG would satisfy the look and fail all four — and would need a
 * second asset per locale and per theme.
 *
 * ── THE ARABIC CONSTRAINT THAT SHAPES THE WHOLE DESIGN ──
 * Arabic script is CURSIVE: letters join. `letter-spacing` is the standard
 * wordmark move in Latin type and it is forbidden here, because it severs the
 * joins and renders «سَدِيد» as four disconnected glyphs — a spelling error, not
 * a style. So the Arabic mark gets its presence from weight, size and the
 * gradient, never from tracking. The Latin mark, which does not join, keeps a
 * small positive tracking that suits all-caps.
 *
 * The name also carries تشكيل («سَدِيد», not «سديد»). The marks are kept on the
 * visible mark because they are part of how the word is read, and dropped in
 * `PRODUCT_BRAND.arPlain` for machine surfaces that mangle them.
 */
import { useI18n } from "@/lib/i18n";
import { PRODUCT_BRAND, brandFor } from "@/lib/domain";
import { cn } from "@/lib/utils";

export type WordmarkSize = "sm" | "md" | "lg" | "hero";

/**
 * Type scale, responsive by construction.
 *
 * `clamp()` rather than breakpoints: the mark is used in a 56px-wide sidebar
 * and on a full-bleed hero, and a step function between the two produces a
 * visible jump mid-drag on a resizable window.
 */
const SIZES: Record<WordmarkSize, string> = {
  sm: "text-[clamp(1rem,2.4vw,1.25rem)]",
  md: "text-[clamp(1.35rem,3.4vw,1.9rem)]",
  lg: "text-[clamp(1.9rem,5vw,3rem)]",
  hero: "text-[clamp(2.6rem,8vw,5.25rem)]",
};

const DESCRIPTOR_SIZES: Record<WordmarkSize, string> = {
  sm: "text-[12px]",
  md: "text-[clamp(12px,1.5vw,0.9rem)]",
  lg: "text-[clamp(13px,1.8vw,1.05rem)]",
  hero: "text-[clamp(14px,2.2vw,1.35rem)]",
};

const TAGLINE_SIZES: Record<WordmarkSize, string> = {
  sm: "text-[12px]",
  md: "text-[12px]",
  lg: "text-[clamp(12px,1.4vw,0.95rem)]",
  hero: "text-[clamp(13px,1.7vw,1.1rem)]",
};

export interface SadeedWordmarkProps {
  size?: WordmarkSize;
  /** Show «منظومة القرار والإنجاز الذكي» under the name. */
  showDescriptor?: boolean;
  /** Show «قرار أدق. إنجاز أسرع.» under the descriptor. */
  showTagline?: boolean;
  /** Centre the stack (cards, heroes) instead of following text alignment. */
  centered?: boolean;
  /** Render as an `<h1>` when the mark IS the page heading. */
  as?: "div" | "h1" | "span";
  className?: string;
}

export function SadeedWordmark({
  size = "md",
  showDescriptor = false,
  showTagline = false,
  centered = false,
  as: Tag = "div",
  className,
}: SadeedWordmarkProps) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const brand = brandFor(ar);

  return (
    <Tag
      className={cn(
        "sadeed-mark flex min-w-0 flex-col gap-1",
        centered ? "items-center text-center" : "items-start text-start",
        className,
      )}
      dir={ar ? "rtl" : "ltr"}
      lang={ar ? "ar" : "en"}
    >
      <span className="relative inline-block">
        <span
          className={cn(
            "sadeed-mark__name block leading-[1.15]",
            // The Arabic face is set in CSS (Alexandria/Tajawal) so the joining
            // behaviour and the diacritic positioning come from one place.
            ar ? "sadeed-mark__name--ar" : "sadeed-mark__name--en",
            SIZES[size],
          )}
        >
          {brand.name}
        </span>
        {/* Light rule under the mark. aria-hidden: pure ornament. */}
        <span aria-hidden className="sadeed-mark__rule" />
      </span>

      {showDescriptor && (
        <span
          className={cn(
            "sadeed-mark__descriptor font-medium text-foreground/70",
            DESCRIPTOR_SIZES[size],
          )}
        >
          {brand.descriptor}
        </span>
      )}

      {showTagline && (
        <span
          className={cn("sadeed-mark__tagline font-light text-foreground/55", TAGLINE_SIZES[size])}
        >
          {brand.tagline}
        </span>
      )}
    </Tag>
  );
}

/**
 * The name alone, for tight slots (sidebar rail, mobile header) where the
 * descriptor would wrap. Kept in this file so both marks share one gradient.
 */
export function SadeedName({
  size = "sm",
  className,
}: {
  size?: WordmarkSize;
  className?: string;
}) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <span
      className={cn(
        "sadeed-mark sadeed-mark__name inline-block leading-[1.15]",
        ar ? "sadeed-mark__name--ar" : "sadeed-mark__name--en",
        SIZES[size],
        className,
      )}
      dir={ar ? "rtl" : "ltr"}
      lang={ar ? "ar" : "en"}
    >
      {ar ? PRODUCT_BRAND.ar.name : PRODUCT_BRAND.en.name}
    </span>
  );
}
