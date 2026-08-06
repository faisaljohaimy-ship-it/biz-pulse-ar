/**
 * SimulationRibbon — شريط ثابت يظهر على شاشات المستأجر عندما يكون
 * السياق النشط على بيانات مرجعية موسومة (is_simulation = true).
 * لا يدّعي تشغيل عميل حقيقي؛ الوسم إلزامي لأصالة العرض.
 */
export function SimulationRibbon() {
  return (
    <div
      role="status"
      aria-live="polite"
      dir="rtl"
      className="fixed bottom-0 inset-x-0 z-[60] flex items-center justify-center gap-3 px-4 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-xs md:text-sm font-medium text-amber-100 bg-gradient-to-r from-amber-950/95 via-amber-900/95 to-amber-950/95 border-t border-amber-500/40 backdrop-blur-sm shadow-lg pointer-events-none select-none"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <span>
        بيئة محاكاة مرجعية · البيانات المعروضة موسومة{" "}
        <code className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-50 font-mono">
          is_simulation = true
        </code>{" "}
        ولا تمثّل عميلاً حقيقياً
      </span>
    </div>
  );
}
