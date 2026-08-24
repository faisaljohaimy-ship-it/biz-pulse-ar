"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { arSA } from "react-day-picker/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * تقويم بصري بنمط shadcn فوق react-day-picker v9 — عربي RTL افتراضيًا.
 *
 * - الاختيار بنقرة من شبكة الأيام؛ كل خلية يوم وزرّا التنقّل ≥44×44px
 *   (هدف اللمس الدستوري).
 * - الألوان كلها من رموز الثيم (primary/muted/popover) — لا قيمة مكتوبة
 *   يدويًا، فيصحّ العرض في الوضعين الداكن والفاتح معًا.
 * - الأسهم من lucide بـ`currentColor`؛ اتجاهها يقلبه react-day-picker
 *   نفسه بحسب `dir` فلا منطق RTL يدويًا هنا.
 */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      dir="rtl"
      locale={arSA}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "flex w-full flex-col gap-3",
        month_caption: "flex h-11 items-center justify-center",
        caption_label: "text-sm font-semibold",
        nav: "absolute inset-x-0 top-0 z-10 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "size-11 min-h-11 min-w-11 p-0 text-muted-foreground hover:text-foreground",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "size-11 min-h-11 min-w-11 p-0 text-muted-foreground hover:text-foreground",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-11 text-center text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "relative p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-11 min-h-11 min-w-11 rounded-xl p-0 text-sm font-normal",
        ),
        /* المحدِّد [&>button] يرفع نوعية أصناف الاختيار فوق hover الشبح —
           تعارضٌ محسوب لا مفترض (المادة ٣٤). */
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "rounded-xl bg-primary/10 font-semibold text-primary",
        outside: "[&>button]:text-muted-foreground [&>button]:opacity-50",
        disabled: "[&>button]:pointer-events-none [&>button]:opacity-40",
        hidden: "invisible",
        footer: "pt-2 text-xs text-muted-foreground",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeft
              : orientation === "right"
                ? ChevronRight
                : orientation === "up"
                  ? ChevronUp
                  : ChevronDown;
          return <Icon aria-hidden="true" className={cn("size-4", chevronClassName)} />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
