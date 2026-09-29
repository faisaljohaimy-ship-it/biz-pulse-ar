/**
 * علامة سَدِيد — درعٌ يحمل «S» الزاوية (أمر المالك ٢٠٢٦/٠٩/٢٩: «ارسم شعار
 * سَدِيد … شعارًا أجمل احترافيًّا عصريًّا»).
 *
 * **تطويرٌ لا استبدال.** الـ«S» الزاوية بأعمدتها الأفقية وقُطرها هي علامة
 * المنتج القائمة (`/sadeed-icon.png`)، وقد أُعيد رسمها متّجهةً داخل درعٍ —
 * لغة الأمن الصناعي — فتبقى هوية واحدة لا اثنتان. متّجهة لا نقطية: حادّة في
 * أيقونة 16px وفي لوحة العرض معًا، وتتبع الوضعين.
 *
 * **الألوان رموز** (`--nx-mark-*` في طبقة الرموز) لا قيمٌ في المكوّن، ولا
 * `fill="white"` في الرسم (المادة ٣٤): الحرف يأخذ `--nx-mark-glyph`.
 */
import { useId } from "react";
import { PRODUCT_BRAND } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function SadeedMark({ className, title }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("nx-mark shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient
          id={`${id}-g`}
          x1="10"
          y1="4"
          x2="54"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" style={{ stopColor: "var(--nx-mark-a)" }} />
          <stop offset="1" style={{ stopColor: "var(--nx-mark-b)" }} />
        </linearGradient>
      </defs>
      {/* الدرع */}
      <path
        d="M32 3.5 55.5 11.2v17.6c0 15-9.6 25.4-23.5 31.7C18.1 54.2 8.5 43.8 8.5 28.8V11.2Z"
        fill={`url(#${id}-g)`}
      />
      {/* (كانت هنا حافّةٌ داخلية شبه شفّافة فأُزيلت: تمرّ تحت طرف الحرف
          السفلي فتُسقط تباينه دون 3:1 في ١٩ بكسلًا عند 160px — قِيس.) */}
      {/* «S» الزاوية: عمودٌ أعلى بطرفٍ مائل، ثم قُطرٌ، ثم عمودٌ أسفل */}
      <path
        d="M44.5 18.5H27.2c-4.3 0-7 2.7-7 6.3 0 2.7 1.6 4.6 4.3 5.7l14.8 5.9c2 .8 2.7 1.8 2.7 3 0 1.7-1.3 2.9-3.6 2.9H19.5l-2.2 5.2h21.5c5.2 0 8.5-3.3 8.5-7.6 0-3.3-2-5.6-5.2-6.9l-14.5-5.8c-1.4-.6-2-1.3-2-2.2 0-1.1.9-1.9 2.6-1.9h13.6Z"
        className="nx-mark-glyph"
      />
    </svg>
  );
}

/** العلامة واسمها ووصفها — للترويسات والشريط الجانبي. */
export function SadeedLockup({
  ar,
  className,
  compact = false,
}: {
  ar: boolean;
  className?: string;
  /** العلامة وحدها (الشريط الضيّق 56px) — الاسم يُقرأ للقارئات. */
  compact?: boolean;
}) {
  const b = ar ? PRODUCT_BRAND.ar : PRODUCT_BRAND.en;
  return (
    <span className={cn("nx-lockup flex min-w-0 items-center gap-2.5", className)}>
      <SadeedMark className="size-10" />
      {compact ? (
        <span className="sr-only">{b.name}</span>
      ) : (
        <span className="nx-lockup-text min-w-0 leading-tight">
          <span className="flex items-baseline gap-2">
            <span className="nx-lockup-ar font-amiri text-[20px] font-bold text-[color:var(--ink)]">
              {PRODUCT_BRAND.ar.name}
            </span>
            <span className="text-[15px] font-black tracking-[0.14em] text-[color:var(--ink)]">
              {PRODUCT_BRAND.en.name}
            </span>
          </span>
          <span className="block truncate text-[12px] font-medium text-[color:var(--ink-3)]">
            {b.descriptor}
          </span>
        </span>
      )}
    </span>
  );
}
