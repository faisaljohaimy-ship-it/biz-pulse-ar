/**
 * ArabicDateField — حقل التاريخ الموحّد في النظام (V5 · ملاحظات العميل).
 *
 * ── لماذا مكوّن واحد ──
 * حقل `<input type="date">` الأصيل يرسم تقويمًا يملكه المتصفّح: ميلاديٌّ
 * بلغة النظام، اتجاهه LTR، وشكله يختلف بين سفاري وكروم — فيظهر في وسط
 * نموذجٍ عربيٍّ RTL كجسمٍ غريب لا يستجيب لثيم النظام ولا لاتجاهه. وكان
 * الحلّ البصري (Popover + Calendar عربي) مطبَّقًا في حقل واحد فقط، فبقيت
 * بقية الحقول أصيلة. القاعدة المنسوخة تُصلَح في موضعٍ واحد: هذا المكوّن.
 *
 * ── العقد ──
 * القيمة نصٌّ بصيغة `yyyy-MM-dd`، أو `yyyy-MM-ddTHH:mm` حين `withTime` —
 * الصيغتان نفسهما اللتان كان يُنتجهما المُدخل الأصيل، فلا يتغيّر شيء في
 * ما يُرسَل إلى الخادم ولا في المخطط. الفارغ `""` يعني «بلا تاريخ».
 *
 * ── الوصول ──
 * الزرّ المفتاح هدف لمس ≥44px، له `id` يربطه بـ`<Label htmlFor>`، والتاريخ
 * المختار يُقرأ نصًّا عربيًّا كاملًا (اليوم والشهر والسنة) لا رمزًا رقميًّا.
 */
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** تاريخٌ محلّي بصيغة yyyy-MM-dd بلا انزلاق منطقة زمنية (toISOString يُزلق). */
function toLocalYmd(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function splitValue(value: string): { ymd: string; time: string } {
  const [ymd = "", time = ""] = value.split("T");
  return { ymd, time: time.slice(0, 5) };
}

export interface ArabicDateFieldProps {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  /** يُضيف حقل ساعة فيصبح الناتج `yyyy-MM-ddTHH:mm`. */
  withTime?: boolean;
  placeholder?: string;
  /** يُظهر زرّ «مسح التاريخ» داخل التقويم. */
  clearable?: boolean;
  className?: string;
}

export function ArabicDateField({
  id,
  value,
  onChange,
  withTime = false,
  placeholder = "اختر التاريخ من التقويم",
  clearable = true,
  className,
}: ArabicDateFieldProps) {
  const [open, setOpen] = useState(false);
  const { ymd, time } = splitValue(value);
  const selected = ymd ? new Date(`${ymd}T12:00:00`) : undefined;

  const emit = (nextYmd: string, nextTime: string) => {
    if (!nextYmd) {
      onChange("");
      return;
    }
    onChange(withTime ? `${nextYmd}T${nextTime || "08:00"}` : nextYmd);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="min-h-11 min-w-0 flex-1 justify-between font-normal"
          >
            <span className={cn("truncate", ymd ? undefined : "text-muted-foreground")}>
              {selected
                ? selected.toLocaleDateString("ar-SA", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : placeholder}
            </span>
            <CalendarDays className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" dir="rtl">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(day) => {
              emit(day ? toLocalYmd(day) : "", time);
              setOpen(false);
            }}
          />
          {clearable && ymd && (
            <div className="border-t border-border p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 w-full text-muted-foreground"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                مسح التاريخ
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {withTime && (
        <Input
          type="time"
          aria-label="الساعة"
          dir="ltr"
          className="min-h-11 w-[7.5rem] shrink-0 text-center"
          value={time}
          onChange={(e) => emit(ymd || toLocalYmd(new Date()), e.target.value)}
        />
      )}
    </div>
  );
}
