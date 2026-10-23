/**
 * الشريط الثابت: «يقترح ولا ينفّذ — راجع قبل أي تنفيذ».
 *
 * يُركَّب **أعلى بطاقة المحادثة خارج منطقة التمرير** فلا يغيب بالسكرول، ولا
 * يُخفى ولا يُطوى ولا يشترط حالة — المالك يراه في كل لحظة. الدلالة بالشكل لا
 * باللون وحده (WCAG 2.2 §1.4.1): مثلّث التحذير + النصّ، والكهرمان من رمز
 * `--tone-amber` الذي يتبدّل مع الوضع. (المثلّث لـ«تحذير»، والمثمّن لـ«خطر».)
 */
import { TriangleAlert } from "lucide-react";
import { FINN_BANNER_AR, FINN_COPY } from "@/lib/finn-agent/copy";

export function FinnBanner() {
  return (
    <div
      role="note"
      data-finn-banner
      className="flex items-start gap-2.5 border-y border-[color:var(--tone-amber)] bg-[color-mix(in_srgb,var(--tone-amber)_12%,transparent)] px-4 py-2.5 text-[color:var(--ink)]"
    >
      <TriangleAlert
        aria-hidden
        className="mt-0.5 size-[18px] shrink-0 text-[color:var(--tone-amber)]"
      />
      <p className="min-w-0 text-[13px] leading-6">
        <strong className="font-bold">{FINN_BANNER_AR}</strong>
        <span className="hidden text-[color:var(--ink-2)] sm:inline">
          {" "}
          — {FINN_COPY.bannerHint}
        </span>
      </p>
    </div>
  );
}
