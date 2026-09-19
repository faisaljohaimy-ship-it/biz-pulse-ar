/**
 * لوحة الرقم الوظيفي — تُسأل مرّة، ثم تُفتح الصفحة المقصودة.
 *
 * ## صريحةٌ فيما هي
 *
 * اللوحة تقول للمستخدم إن الرقم **للسجلّ لا للتحقّق**. وإخفاءُ ذلك يصنع
 * أسوأ نتيجة ممكنة: مستخدمٌ يظنّ نفسه داخل نظامٍ محميّ، ومالكٌ يظنّ
 * السجلَّ إثباتَ هوية. الصدق هنا ليس تهذيبًا — هو ما يمنع البناء على وهم.
 *
 * ## مرّة واحدة لكل جهاز
 *
 * الرقم يُحفظ في `localStorage` بمفتاحٍ ثابت، فلا يُسأل عند كل تنقّل.
 * والتخزين قد يكون محظورًا (نافذة خاصة، بيانات موقعٍ ممسوحة) — فكل قراءة
 * وكتابة داخل `try`، وحين يتعذّر تعمل اللوحة لهذه الجلسة فقط ولا تسقط.
 *
 * ## ولا تمنع الدخول حين يتعثّر سجلّها
 *
 * الكتابة في القاعدة تُحاوَل ويُمضى بعدها أيًّا كانت النتيجة. بوابةُ
 * إسنادٍ تحجب العمل حين تتعثّر قاعدتها تكون قد صارت عائقًا بلا مكسب —
 * وهي أصلًا لا تحرس شيئًا.
 *
 * ## الجذر خارجها
 *
 * النطاق `isGatedRoute` نفسه الذي يمنع الفهرسة — مصدرٌ واحد. والرئيسية
 * سطحٌ تسويقيّ: بوابةٌ عليها تطرد الزائر قبل أن يعرف ما المنتج.
 */
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { IdCard, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordStaffEntry } from "@/lib/access/staff-entry.functions";
import {
  STAFF_NUMBER_KEY,
  STAFF_NUMBER_MAX,
  normalizeStaffNumber,
  validateStaffNumber,
} from "@/lib/access/staff-entry";

function readStored(): string | null {
  try {
    const v = localStorage.getItem(STAFF_NUMBER_KEY);
    return v && validateStaffNumber(v) === null ? v : null;
  } catch {
    return null;
  }
}

export function StaffNumberGate({ path }: { readonly path: string }) {
  // يبدأ `null` = «لم يُقرأ بعد»، فلا تومض اللوحة على من سجّل سابقًا:
  // الخادم لا يرى `localStorage`، والقراءة لا تقع إلا بعد التركيب.
  const [known, setKnown] = useState<string | null | undefined>(undefined);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const record = useServerFn(recordStaffEntry);

  useEffect(() => {
    setKnown(readStored());
  }, []);

  const submit = useCallback(async () => {
    const problem = validateStaffNumber(value);
    if (problem) {
      setError(problem);
      return;
    }
    const staff = normalizeStaffNumber(value);
    setBusy(true);
    try {
      await record({ data: { staff_number: staff, path } });
    } catch {
      /* السجلّ لا يحجب الدخول. */
    }
    try {
      localStorage.setItem(STAFF_NUMBER_KEY, staff);
    } catch {
      /* تخزين محظور — يُسأل مرّةً أخرى في الجلسة القادمة. */
    }
    setBusy(false);
    setKnown(staff);
  }, [value, path, record]);

  if (known !== null) return null;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-gate-title"
      className="fixed inset-0 z-[130] flex items-center justify-center bg-[#04070F]/95 px-4 backdrop-blur-xl"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#3AE8FF]/25 bg-[#06283a] p-6 shadow-[0_20px_60px_-20px_rgba(0,212,255,0.35)]">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/30 bg-[#3AE8FF]/10">
            <IdCard className="size-5 text-[#3AE8FF]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="staff-gate-title" className="text-lg font-bold text-[#dff2fd]">
              الرقم الوظيفي مطلوب
            </h2>
            <p className="text-[13px] text-[#dff2fd]/60">لتسجيل الدخول إلى النظام</p>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="staff-number" className="text-[#dff2fd]">
            الرقم الوظيفي
          </Label>
          <Input
            id="staff-number"
            inputMode="numeric"
            autoFocus
            maxLength={STAFF_NUMBER_MAX + 4}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "staff-number-error" : "staff-number-note"}
            placeholder="مثال: 10254"
            className="min-h-11 text-center text-lg tracking-widest"
          />
          {error && (
            <p id="staff-number-error" className="text-[13px] text-amber-300">
              {error}
            </p>
          )}
        </div>

        <Button
          className="mt-4 min-h-11 w-full"
          onClick={() => void submit()}
          disabled={busy || value.trim().length === 0}
        >
          {busy ? "جارٍ التسجيل…" : "دخول"}
        </Button>

        {/* الصدق في اللوحة نفسها: من يقرأ هذا لا يبني على حراسةٍ غير قائمة. */}
        <p
          id="staff-number-note"
          className="mt-4 flex items-start gap-2 rounded-lg border border-[#dff2fd]/10 bg-[#dff2fd]/5 px-3 py-2 text-[12px] leading-relaxed text-[#dff2fd]/60"
        >
          <ShieldQuestion className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            يُسجَّل الرقم مع وقت الدخول لمعرفة من استخدم النظام. وهو للسجلّ لا للتحقّق من الهوية —
            لا يُقارن بسجلّ الموظفين ولا يمنح صلاحية.
          </span>
        </p>
      </div>
    </div>
  );
}
