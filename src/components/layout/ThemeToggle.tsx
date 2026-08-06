/**
 * ThemeToggle — مبدّل الوضع الفاتح/الداكن (قرار المالك ٢٠٢٦/٠٨/٠٦).
 *
 * ## لماذا الأيقونة من الطبقة لا من الحالة
 *
 * حالة React تبدأ داكنة دائمًا لتطابق ما يرسله الخادم، بينما السكربت
 * السابق لأول رسم يكون قد وضع `light` على `<html>` فعلًا. فلو رُسمت
 * الأيقونة من الحالة لظهرت أيقونة الوضع الخطأ حتى يكتمل الترطيب — وميضةٌ
 * على كل فتح لمن اختار الفاتح. الأيقونتان مرسومتان معًا، و`styles.css`
 * يُظهر ما يوافق صنف الجذر: صحيحةٌ من أول إطار بلا JS.
 *
 * ## الوصول
 *
 * زرٌّ حقيقي بهدف لمس ٤٤×٤٤ (WCAG 2.5.8) — يعمل باللمس والمؤشّر ولوحة
 * المفاتيح معًا، فلا يسقط على الجوال. و`aria-pressed` تُعلن الحالة،
 * والتسمية تصف الفعل لا الحالة الراهنة فلا تلتبس على قارئ الشاشة.
 */
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string } = {}) {
  const { locale } = useI18n();
  const { theme, toggle } = useTheme();
  const ar = locale === "ar";
  const label = ar ? "تبديل الوضع الفاتح/الداكن" : "Toggle light/dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === "light"}
      aria-label={label}
      title={label}
      className={cn("nx-theme-toggle nx-orb", className)}
      style={{
        // لكنةٌ سماويّة في الاتجاهين (قرار المالك ٢٠٢٦/٠٨/٠٦): كانت كهرمانيّة
        // ليلًا، فتقف وحدها دافئةً بين أربعة مدارات سماويّة في السقف نفسه.
        // والكهرماني في هذا النظام لونُ **تحذير** لا زينة (CLAUDE.md)، فصرفه
        // إلى مبدّل وضعٍ يُضعف إشارته حيث تلزم. الوجهة تبقى مقروءة من
        // الأيقونة نفسها — شمسٌ ليلًا وقمرٌ نهارًا — لا من الحرارة اللونية.
        ["--orb-accent" as string]: "var(--tone-cyan)",
        ["--orb-speed" as string]: "2.4s",
      }}
    >
      {/* الشمس تظهر في الداكن (ما ستذهب إليه)، والقمر في الفاتح. */}
      <Sun className="nx-theme-ico nx-theme-ico--sun size-4" aria-hidden />
      <Moon className="nx-theme-ico nx-theme-ico--moon size-4" aria-hidden />
    </button>
  );
}

export default ThemeToggle;
