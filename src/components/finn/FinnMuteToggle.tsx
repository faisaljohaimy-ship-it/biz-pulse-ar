/**
 * FinnMuteToggle — زرّ كتم صوت المساعد. ظاهر ودائم، واختياره محفوظ.
 *
 * ── لماذا زرّ واحد يُعاد استعماله ──
 * الكتم حالة واحدة في `voice-mute`، فلو رُسم زرّان مستقلّان لَبقي أحدهما
 * يعرض «ناطق» بعد أن كتم الآخر. كلاهما يقرأ من `useFinnVoiceMuted` ويكتب
 * عبر `toggleFinnVoiceMuted`، فالسطحان صورتان لحالة واحدة لا حالتان.
 *
 * ── الوصول (WCAG 2.2) ──
 * · `aria-pressed` هو ما يجعله زرّ تبديل لا زرّ أمر: قارئ الشاشة ينطق
 *   «مضغوط/غير مضغوط»، فتُعرف الحالة بلا نظر إلى الأيقونة.
 * · هدف اللمس ٤٤×٤٤ فأكثر (§2.5.8) مضمون بـ`min-h-11 min-w-11` — أي
 *   ‏44px‏ — لا بالحشو المقدَّر بالعين.
 * · الحالة لا تُنقل باللون وحده (§1.4.1): الأيقونة تتبدّل (خطّ مشطوب على
 *   المكتوم)، والنصّ المرافق يتبدّل معها حين يُطلب.
 * · التسمية تصف **الفعل عند الضغط** لا الحالة الراهنة، فلا يلتبس على
 *   المستخدم أهي وصف لِما هو كائن أم لِما سيقع.
 */
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFinnVoiceMuted, useFinnVoiceMuted } from "@/lib/finn-core/state/voice-mute";
import { FINN_DISPLAY_NAME_AR_PLAIN } from "@/lib/finn-core/branding";

export interface FinnMuteToggleProps {
  className?: string;
  /** يُظهر نصًّا عربيًّا بجوار الأيقونة (السطح الرئيسي). */
  withLabel?: boolean;
}

export function FinnMuteToggle({ className, withLabel = false }: FinnMuteToggleProps) {
  const muted = useFinnVoiceMuted();
  const action = muted
    ? `إلغاء كتم صوت ${FINN_DISPLAY_NAME_AR_PLAIN}`
    : `كتم صوت ${FINN_DISPLAY_NAME_AR_PLAIN}`;

  return (
    <button
      type="button"
      onClick={() => {
        toggleFinnVoiceMuted();
      }}
      aria-pressed={muted}
      aria-label={action}
      title={action}
      data-finn-muted={muted ? "1" : "0"}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3",
        "border border-[color:var(--hairline)] bg-[color:var(--chip)] text-[color:var(--ink)]",
        "text-sm font-semibold transition-colors",
        "hover:border-[color:var(--hairline-hover)] hover:bg-[color:var(--chip-hover)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "focus-visible:outline-[color:var(--tone-cyan)]",
        className,
      )}
    >
      {muted ? (
        <VolumeX className="h-5 w-5 shrink-0" aria-hidden />
      ) : (
        <Volume2 className="h-5 w-5 shrink-0" aria-hidden />
      )}
      {withLabel && <span>{muted ? "الصوت مكتوم" : "الصوت يعمل"}</span>}
    </button>
  );
}

export default FinnMuteToggle;
