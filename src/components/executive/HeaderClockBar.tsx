/**
 * HeaderClockBar — the unified top header strip.
 *
 * OWNER DIRECTIVE (G3): the scrolling marquee ("سَدِيد التنفيذية
 * ✦ NEXIOS AI") is REMOVED from every screen. It was mounted once in
 * __root.tsx, so deleting it here removes it everywhere at once — الرئيسية and
 * الأمن الصناعي included — with no per-screen edits.
 *
 * The LIVE clock is deliberately KEPT. It shared this bar with the marquee
 * (one strip, no ghost row), so removing the component wholesale would have
 * silently taken the clock down with it. The clock is a distinct, live
 * element the marquee merely sat next to.
 *
 * Renamed from BetaMarqueeBar: a component called "Marquee" that contains no
 * marquee is exactly the kind of stale name that misleads the next reader.
 */

import { LiveClock } from "@/components/LiveClock";

interface HeaderClockBarProps {
  readonly showClock?: boolean;
}

export function HeaderClockBar({ showClock = true }: HeaderClockBarProps) {
  // With the marquee gone the clock is this bar's only content, so an empty
  // bar would render as a bare gradient line. Nothing to show → nothing.
  if (!showClock) return null;

  return (
    <div
      dir="ltr"
      // `nx-clock-bar` هو المقبض الذي يقلب هذا الشريط في الوضع الفاتح
      // (styles.css). التدرّج الكحلي أدناه يبقى مرجع الوضع الداكن.
      //
      // ترتيب التكديس (تحسين الجوال ٢٠٢٦/٠٨/٠٥): الشريط لاصق أعلى الصفحة
      // بينما زرّا الرجوع/الرئيسية ومبدّل الوضع عائمان فوقه عند z-70. كان
      // الشريط عند z-100 فيمرّ خلفيته المصمتة فوقها ويقصّها عن اللمس؛ صار
      // دونها فيبقيان ظاهرَين، وحُجز لهما ممرّ أفقي في `nx-clock-slot`
      // (styles.css) فلا يسقط نص الساعة تحتهما في أيٍّ من الاتجاهين.
      className="nx-clock-bar pointer-events-none sticky top-0 z-[45] w-full overflow-hidden border-b border-[#3AE8FF]/30 bg-gradient-to-r from-[#02101e] via-[#04243c] to-[#02101e] shadow-[0_4px_24px_-8px_rgba(0,212,255,0.4)]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="relative flex h-9 items-center sm:h-10">
        <div className="nx-clock-slot pointer-events-auto">
          <LiveClock className="!border-transparent !bg-transparent !px-0 !py-0 !shadow-none" />
        </div>
      </div>
    </div>
  );
}
