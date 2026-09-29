import { useLocation } from "@tanstack/react-router";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";
import { brandName } from "@/lib/domain";
import { SadeedName, SadeedWordmark } from "@/components/brand/SadeedWordmark";
import { pageBackdropFor } from "@/lib/nav/page-backdrops";
import { GlossyImageBackdrop } from "@/components/backdrops/GlossyImageBackdrop";
import { AuroraFantasyBackdrop } from "@/components/backdrops/AuroraFantasyBackdrop";
import { useAuth } from "@/lib/auth-context";
import { useRegion } from "@/lib/region-context";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { OrgSwitcher } from "@/components/org/org-switcher";
import { RegionSwitcher } from "@/components/RegionSwitcher";
import { NexusOrb } from "@/components/executive/NexusOrb";
import { SystemSidebarCard, SystemSidebarNav } from "@/components/nav/SystemSidebar";
import { SystemHeader } from "@/components/nav/SystemHeader";
import { CommandPalette } from "@/components/executive/CommandPalette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const pageBackdrop = pageBackdropFor(loc.pathname);
  return (
    // No shell-wide backdrop-filter: it sits over the solid body colour, so
    // the blur is visually a no-op — yet it forces a full-viewport blur every
    // frame and was measured to halve scroll fps on weak GPUs.
    <div className="nexus-app-shell relative flex min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#04070F]/55">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {pageBackdrop ? (
          <GlossyImageBackdrop src={pageBackdrop} className="absolute inset-0 z-0" opacity={0.55} />
        ) : (
          // Pages without a themed photo get a cinematic "fantastical" aurora
          // backdrop (pure CSS/SVG) so no surface is ever a flat dark void.
          <AuroraFantasyBackdrop className="z-0" intensity={0.85} />
        )}
        <div className="absolute -top-40 start-[-10%] h-[480px] w-[480px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-160px] end-[-10%] h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl" />
      </div>

      {/* **مثبَّتٌ مع سندٍ لا عمودٌ يمضي مع الصفحة** (٢٠٢٦/٠٩/٢٩). كان طولُه
          طولَ المحتوى فيمضي مع السكرول، فتختفي قائمة التنقّل بعد أول تمريرة
          (قِيس رأسه عند ‎-1147). `body` حاوية السكرول فلا يلصق `sticky`، فالعلاج
          علاج الشريط العلوي: `fixed` (`.nx-sysnav`) وسندٌ بالعرض نفسه.
          والسند `nexus-sidebar-spacer` يتبع كل قاعدة عرضٍ وإظهار على الشريط
          (الأفقي 56px · ‏2200px فأعرض · وضع العرض) — يحرسه عقد الشريط. */}
      <div
        aria-hidden
        className="nexus-sidebar-spacer hidden shrink-0 md:block md:w-56 lg:w-60 xl:w-64 2xl:w-72"
      />
      <aside className="nexus-sidebar nx-sysnav z-20 hidden border-e border-sidebar-border glass-sidebar md:flex md:w-56 md:flex-col lg:w-60 xl:w-64 2xl:w-72">
        <SidebarBody />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="nexus-mobile-header sticky top-0 z-40 flex h-14 w-full max-w-[100vw] items-center justify-between gap-3 border-b border-border glass px-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <NexusOrb
                isOpen={open}
                onClick={() => setOpen((v) => !v)}
                controls="nexus-mobile-nav"
              />
            </SheetTrigger>
            {/* زرّ الإغلاق يُرسم قبل المحتوى بطبقة z-10، ورأسُ الشريط اللاصق
                بعده بالطبقة نفسها فيغطّيه — رُئي بلقطة على 390: النقطة في
                مركز الزرّ تعيد عنصرًا آخر. فيُرفع الزرّ فوق الرأس هنا. */}
            <SheetContent
              id="nexus-mobile-nav"
              side="right"
              className="nx-sysnav-sheet w-72 glass-sidebar p-0 text-sidebar-foreground [&>.nexus-window-close]:z-20"
            >
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* **سقطت خانة حجز قشرة الأعلى (٢٠٢٦/٠٩/١٢).** كانت تحجز هنا
              عرض الأزرار لأنها كانت تطفو فوق هذا الصفّ فتحجب الشعار.
              وقد نزلت الأزرار إلى الشريط العلوي نفسه (`TopBar`)، فلم يبقَ
              فوق هذا الصفّ شيء يُفسَح له — وحجزٌ بلا محجوزٍ له فراغٌ يزيح
              الشعار عن مكانه. */}
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-glow">
              <img
                src="/sadeed-icon.png"
                alt={brandName(locale === "ar")}
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 rounded-lg animate-pulse-ring" />
            </div>
            <SadeedName size="sm" />
          </div>
          {/* الجرس أُزيل ولم يُطلب رجوعه، والمبدّل صار على الرئيسية وحدها
              (أمرا ٢٠٢٦/٠٩/١٠ و٢٠٢٦/٠٩/١١) — فلا شيء في هذا الطرف من
              الشاشات الداخلية إلا مبدّل المؤسسة. */}
          <div className="flex items-center gap-2">
            <OrgSwitcher compact />
          </div>
        </header>
        {/* ترويسة النظام (بحث · جرس · رسائل · تطبيقات · مساعدة · المستخدم) على
            الشاشات العريضة؛ الجوال له ترويسته أعلاه بالدرج. **ولا `sticky`:**
            كُتب ثم قِيس عند ‎-1347 بعد السكرول — `body` حاوية السكرول فلا يلصق
            شيء، ولو لصق لوقع تحت الشريط العلوي المثبَّت. */}
        <div className="hidden md:block">
          <SystemHeader />
        </div>
        <main className="nexus-main min-w-0 flex-1">
          <div className="relative mx-auto w-full max-w-[1680px] 2xl:max-w-[2040px] [@media(min-width:2200px)]:max-w-[2400px]">
            {children}
          </div>
        </main>
      </div>
      {/* Global command palette on non-home routes (home mounts its own with cinema handler). */}
      {loc.pathname !== "/" && <CommandPalette />}
      {/* Legacy ExecutiveOverlay removed — SADEED singleton lives at root. */}
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { locale } = useI18n();
  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Sticky header — org identity + region switcher */}
      <div className="sticky top-0 z-10 border-b border-sidebar-border bg-sidebar/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-glow">
            <img
              src="/sadeed-icon.png"
              alt={brandName(locale === "ar")}
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 rounded-xl animate-pulse-ring" />
          </div>
          <div className="min-w-0 flex-1">
            {/* The mark, not a string. Every previous rename failed here because
                this slot held a hard-coded literal that no locale could reach. */}
            <SadeedWordmark size="sm" showDescriptor />
          </div>
        </div>
        <div className="space-y-2 px-3 pb-3">
          <OrgSwitcher />
          <RegionSwitcher onNavigate={onNavigate} />
        </div>
      </div>

      {/* القائمة من السجل الواحد `SYSTEM_NAV` — أمر المالك ٢٠٢٦/٠٩/٢٩ نسخ
          شريط الأزرار الخمسة (٢٠٢٦/٠٨/٢٠) بعناصر التصميم العشرين في النظام
          كلّه. والمكوّن نفسه يُركَّب على الرئيسية، فلا نسختان تفترقان. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <SystemSidebarNav onNavigate={onNavigate} />
        <div className="mt-4">
          <SystemSidebarCard />
        </div>
      </div>

      {/* Sticky footer — user chip + round icon actions */}
      <div className="sticky bottom-0 border-t border-sidebar-border bg-sidebar/95 px-3 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <UserChip />
          <div className="ms-auto flex shrink-0 items-center gap-1.5">
            <LangIconToggle />
            {/* أيقونة تسجيل الدخول/الخروج حُذفت بأمر المالك ٢٠٢٦/٠٨/٢٠
                («حذف أي تسجيل دخول او خروج في النظام») — التصفّح ضيفٌ
                مفتوح، ومسار /auth يبقى حيًّا لعمليات الكتابة دون زرٍّ ظاهر. */}
          </div>
        </div>
      </div>
    </div>
  );
}

function LangIconToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <button
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className="grid size-9 place-items-center rounded-full border border-sidebar-border bg-card text-[12px] font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
      aria-label={t("lang.label")}
    >
      {locale === "ar" ? "EN" : "AR"}
    </button>
  );
}

function LangToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <button
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      aria-label={t("lang.label")}
    >
      {t("lang.toggle")}
    </button>
  );
}

function UserChip() {
  const { user } = useAuth();
  const { locale } = useI18n();
  const { region } = useRegion();
  const displayName =
    locale === "ar"
      ? `إدارة ${region.labelAr.replace(/^الأمن الصناعي — /, "الأمن الصناعي بالمنطقة ").replace("المنطقة المنطقة", "المنطقة")}`
      : region.labelEn;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2" title={user?.email ?? undefined}>
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
        أ
      </div>
      <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground" dir="rtl">
        {displayName}
      </div>
    </div>
  );
}
