/**
 * كتلة كود في ردّ فِن — اسم اللغة وزرّ «نسخ».
 *
 * الكود يُعرض `ltr` داخل صفحةٍ `rtl` (وإلا انعكس ترتيب علامات الترقيم)، ويتمرّر
 * أفقيًّا **داخل صندوقه وحده** فلا يسكرول أفقيًّا للصفحة. الصندوق قابلٌ للتركيز
 * (`tabIndex=0`) ليتمرّر بلوحة المفاتيح. والألوان من الرموز فتنقلب مع الوضع.
 * زرّ النسخ ≥ 44px، ونتيجته تُعلَن لقارئ الشاشة.
 */
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FINN_COPY } from "@/lib/finn-agent/copy";

type CopyState = "idle" | "copied" | "failed";

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* يُجرَّب البديل. */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.className = "sr-only";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function FinnCodeBlock({ language, code }: { language?: string; code: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onCopy = async () => {
    const ok = await writeClipboard(code);
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  };

  const label =
    state === "copied"
      ? FINN_COPY.copied
      : state === "failed"
        ? FINN_COPY.copyFailed
        : FINN_COPY.copy;

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-[color:var(--hairline)] bg-[color:var(--chip-strong)]">
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--hairline-soft)] ps-3">
        <span
          dir="ltr"
          className="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--ink-2)]"
        >
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="nx-focus-ring inline-flex min-h-11! min-w-11! items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-[color:var(--ink-2)] transition-colors hover:bg-[color:var(--chip-hover)] hover:text-[color:var(--ink)]"
        >
          {state === "copied" ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          <span aria-live="polite">{label}</span>
        </button>
      </div>
      <pre
        dir="ltr"
        tabIndex={0}
        className="nx-focus-ring max-w-full overflow-x-auto p-3 text-start text-[13px] leading-6 text-[color:var(--ink)]"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
