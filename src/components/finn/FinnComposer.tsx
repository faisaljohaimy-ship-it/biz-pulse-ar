/**
 * حقل الكتابة — يملأ من البدايات السريعة ويرسل بـEnter على سطح المكتب.
 *
 * على اللمس Enter سطرٌ جديد (لوحة المفاتيح الافتراضية)، والإرسال بالزرّ. أهداف
 * اللمس ≥ 44px. الحدّ الأقصى للرسالة من `FINN_LIMITS` (المصدر نفسه الذي يفرضه
 * الخادم)، وعدّاد الأحرف يظهر قرب الحدّ فقط. لا ألوان صريحة: رموز الوضعين.
 */
import { Paperclip, SendHorizontal, Square } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type Ref,
} from "react";
import { FINN_COPY, finnOverLimitAr } from "@/lib/finn-agent/copy";
import { FINN_LIMITS } from "@/lib/finn-agent/limits";
import { FINN_IMPORT_COPY } from "@/lib/finn-import/client";
import { FINN_IMPORT_ACCEPT } from "@/lib/finn-import/contract";

/** مقبض الإرفاق — يمرّره `FinnChat` على واجهات المساحة الكاملة وحدها (البطاقة المضمَّنة بلا إرفاق). */
export interface FinnComposerAttach {
  /** يتسلّم كائن `File` كما اختاره المالك؛ لا قراءة لمحتواه هنا. */
  readonly onPick: (file: File) => void;
  /** معطّل أثناء معاينة أو تحميل جارٍ (ملفّ واحد في كل مرّة). */
  readonly disabled: boolean;
  readonly buttonRef: Ref<HTMLButtonElement>;
}

export function FinnComposer({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  focusSignal,
  attach,
}: {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  /** يتغيّر لتركيز الحقل (بعد اختيار بداية سريعة). */
  focusSignal: number;
  attach?: FinnComposerAttach;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // نموّ الارتفاع بحسب المحتوى حتى سقفٍ ثم يتمرّر داخليًّا.
  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }, []);
  useLayoutEffect(fit, [value, fit]);

  useEffect(() => {
    if (focusSignal > 0) ref.current?.focus();
  }, [focusSignal]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    // اللمس: Enter سطرٌ جديد.
    if (typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches) return;
    event.preventDefault();
    if (!busy && value.trim()) onSend();
  };

  const over = value.length - FINN_LIMITS.maxMessageChars;
  const near = value.length > FINN_LIMITS.maxMessageChars * 0.8;
  const canSend = !busy && value.trim().length > 0 && value.length <= FINN_LIMITS.maxMessageChars;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
      className="border-t border-[color:var(--hairline)] bg-[color:var(--surface)] p-3"
    >
      <div className="flex items-end gap-2">
        {attach ? (
          <>
            <input
              ref={fileInput}
              type="file"
              hidden
              accept={FINN_IMPORT_ACCEPT}
              aria-label={FINN_IMPORT_COPY.inputLabel}
              onChange={(event) => {
                const file = event.target.files?.[0];
                // يُفرَّغ الحقل ليُقبل اختيار الملف نفسه مرّةً ثانية بعد الإلغاء.
                event.target.value = "";
                if (file) attach.onPick(file);
              }}
            />
            <button
              ref={attach.buttonRef}
              type="button"
              disabled={attach.disabled}
              onClick={() => fileInput.current?.click()}
              className="nx-focus-ring inline-flex min-h-11! min-w-11! shrink-0 items-center justify-center rounded-xl border border-[color:var(--hairline)] bg-[color:var(--chip)] text-[color:var(--ink)] hover:bg-[color:var(--chip-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Paperclip aria-hidden className="size-4" />
              <span className="sr-only">{FINN_IMPORT_COPY.attach}</span>
            </button>
          </>
        ) : null}
        <label htmlFor="finn-composer" className="sr-only">
          {FINN_COPY.composerLabel}
        </label>
        <textarea
          id="finn-composer"
          ref={ref}
          dir="auto"
          rows={1}
          value={value}
          // بلا maxLength: المتصفّح يبتر اللصق الطويل بصمت فيُرسَل ناقصًا (W5 #9). الحدّ
          // يُعلَن بعدّادٍ وتعطيل الإرسال، ويبقى النصّ كاملًا ليقصّه المالك بنفسه.
          placeholder={FINN_COPY.composerPlaceholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          className="nx-focus-ring min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-[color:var(--hairline)] bg-[color:var(--chip)] px-3 py-2.5 text-[15px] leading-6 text-[color:var(--ink)] placeholder:text-[color:var(--ink-3)]"
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="nx-focus-ring inline-flex min-h-11! min-w-11! shrink-0 items-center justify-center gap-2 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--chip-strong)] px-3 text-[14px] font-semibold text-[color:var(--ink)] hover:bg-[color:var(--chip-hover)]"
          >
            <Square aria-hidden className="size-4" />
            <span className="hidden sm:inline">{FINN_COPY.stop}</span>
            <span className="sr-only sm:hidden">{FINN_COPY.stop}</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className="nx-focus-ring inline-flex min-h-11! min-w-11! shrink-0 items-center justify-center gap-2 rounded-xl bg-[color:var(--tone-blue)] px-3 text-[14px] font-semibold text-[color:var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendHorizontal aria-hidden className="size-4 rtl:-scale-x-100" />
            <span className="hidden sm:inline">{FINN_COPY.send}</span>
            <span className="sr-only sm:hidden">{FINN_COPY.send}</span>
          </button>
        )}
      </div>
      {over > 0 ? (
        // فوق الحدّ: تحذيرٌ بنصٍّ صريح (لا باللون وحده) والإرسال معطّل.
        <p role="alert" className="mt-1.5 text-[12px] font-semibold text-[color:var(--tone-rose)]">
          {finnOverLimitAr(over)}
        </p>
      ) : near ? (
        <p className="mt-1.5 text-[12px] text-[color:var(--ink-2)]" aria-live="polite">
          {value.length.toLocaleString("ar-SA")} /{" "}
          {FINN_LIMITS.maxMessageChars.toLocaleString("ar-SA")}
        </p>
      ) : null}
    </form>
  );
}
