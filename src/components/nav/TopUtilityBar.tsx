/**
 * TopUtilityBar — global top-right utilities:
 *   • Notifications → dropdown with empty/live state
 *   • Theme toggle → light/dark, on every device
 *
 * مبدّل الوضع هنا لا في الشريط الجانبي (قرار المالك ٢٠٢٦/٠٨/٠٦): هذا
 * الشريط مركَّب مرّتين في القشرة — في ترويسة الجوال (`md:hidden`) وفي
 * الشريط العلوي للشاشات الواسعة — فوضعُه هنا يجعله ظاهرًا على الجوال وكل
 * الأجهزة بإدراجٍ واحد. الشريط الجانبي على الجوال يُطوى داخل درجٍ لا يُفتح
 * إلا بنقرة، فمبدّلٌ داخله مبدّلٌ مخفيّ.
 *
 * Mounted once in AppShell. Fully RTL, ≥44px targets, keyboard accessible.
 *
 * OWNER DIRECTIVE (G1 · G2) — two utilities were REMOVED from this bar:
 *   • The search field. The CommandPalette itself is untouched and still
 *     opens on Ctrl/Cmd+K from AppShell; only the visible trigger is gone.
 *   • The settings icon, which duplicated the right rail's own entry
 *     (app-shell.tsx → "/settings"). The rail is now the single way in.
 * Both were removed HERE, in the one shared bar, rather than per screen —
 * that is why غرفة العمليات and الأمن الصناعي both lose them at once.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  title_ar: string;
  title_en: string;
  source: string;
  severity: "info" | "warn" | "critical";
  time: string;
  href?: string;
};

// Live wiring lands next turn (enterprise_events subscription). For now the
// list is empty — the panel shows a professional empty state, never fake rows.
const useLiveNotifications = (): { items: Notif[] } => {
  return { items: [] };
};

export function TopUtilityBar({ className }: { className?: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { items } = useLiveNotifications();
  const unread = items.length;

  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen]);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => setNotifOpen((v) => !v)}
          aria-label={ar ? "التنبيهات" : "Notifications"}
          aria-expanded={notifOpen}
          className="nx-orb relative grid size-11 place-items-center rounded-full border border-sidebar-border bg-card/60 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          style={{
            // اللون هنا يحمل معنًى لا زينة: كهرماني حين يوجد غير مقروء،
            // سماوي حين لا شيء ينتظر. والعدد مكتوب في الشارة فوقه — فاللون
            // إشارةٌ ثانية لا الوحيدة (WCAG 1.4.1).
            ["--orb-accent" as string]: unread > 0 ? "var(--tone-amber)" : "var(--tone-cyan)",
            ["--orb-speed" as string]: unread > 0 ? "0.8s" : "1.6s",
          }}
        >
          <Bell className="size-4" aria-hidden />
          {unread > 0 && (
            <span
              aria-label={`${unread} ${ar ? "غير مقروءة" : "unread"}`}
              className="absolute -top-1 -end-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[12px] font-bold text-destructive-foreground"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        {notifOpen && (
          <div
            role="dialog"
            aria-label={ar ? "التنبيهات" : "Notifications"}
            dir={ar ? "rtl" : "ltr"}
            className="absolute end-0 top-[calc(100%+8px)] z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-[color:var(--hairline)] bg-popover shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[color:var(--hairline)] px-4 py-3">
              <div className="text-sm font-bold text-foreground">
                {ar ? "التنبيهات" : "Notifications"}
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <Bell className="size-6 text-[color:var(--ink-3)]" aria-hidden />
                  <p className="text-sm text-[color:var(--ink-2)]">
                    {ar ? "لا توجد تنبيهات حالياً" : "No notifications right now"}
                  </p>
                  <p className="text-[12px] text-[color:var(--ink-3)]">
                    {ar
                      ? "سيظهر أي حدث حرج فور وصوله."
                      : "New critical events will appear here instantly."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[color:var(--hairline-soft)]">
                  {items.map((n) => (
                    <li key={n.id}>
                      <NotifRow n={n} ar={ar} onNav={() => setNotifOpen(false)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
      {/* بعد الجرس لا قبله: الجرس حالةٌ تُقرأ أوّلًا في اتجاه القراءة،
          والمبدّل تفضيلٌ يُضبط مرّة. وهذا يجعل ترتيب العنقود ثابتًا في
          الترويسة الضيّقة والعريضة معًا. */}
      <ThemeToggle />
    </div>
  );
}

/**
 * الصفّ العلوي الموحّد (V5 · ملاحظات العميل) — الجرس والمبدّل مثبّتان في
 * الجذر على **كل** الصفحات بما فيها الرئيسية، بطبقة `fixed` واحدة بجوار
 * زوج الهوم/الرجوع. كان الشريط يُركَّب مرّتين داخل القشرة بسلوك `sticky`
 * يفشل تحت سلفٍ `overflow-x-hidden`، فيغيب عند السكرول ويغيب كليًّا عن
 * الرئيسية (خارج القشرة). طبقةٌ واحدة مثبّتة تُنهي الحالتين معًا.
 */
export function GlobalUtilityBar() {
  return <TopUtilityBar className="nx-utilitybar-pin" />;
}

/**
 * بصمة قدمٍ فقط في صفّ ترويسة القشرة — تحجز ممرّ الشريط المثبّت فلا يجلس
 * مبدّل المؤسسة تحته. لا رسم ولا تفاعل ولا شجرة وصول.
 */
export function UtilityBarSpacer() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none invisible block h-11 w-[5.75rem] shrink-0"
    />
  );
}

function NotifRow({ n, ar, onNav }: { n: Notif; ar: boolean; onNav: () => void }) {
  const sev =
    n.severity === "critical"
      ? "text-destructive border-destructive/40"
      : n.severity === "warn"
        ? "text-[color:var(--tone-amber)] border-[color:var(--tone-amber)]/40"
        : "text-[color:var(--tone-cyan)] border-[color:var(--tone-cyan)]/30";
  const body = (
    <div className="flex items-start gap-3 px-4 py-3 transition hover:bg-[color:var(--chip)]">
      <span
        className={cn(
          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[12px] font-bold",
          sev,
        )}
        aria-hidden
      >
        !
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {ar ? n.title_ar : n.title_en}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[color:var(--ink-3)]">
          <span>{n.source}</span>
          <span aria-hidden>·</span>
          <span>{n.time}</span>
        </div>
      </div>
    </div>
  );
  if (n.href) {
    return (
      <Link to={n.href} onClick={onNav} className="block">
        {body}
      </Link>
    );
  }
  return body;
}
