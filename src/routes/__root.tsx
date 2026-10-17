import type { ErrorComponentProps } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
// watchdog.client is loaded dynamically inside useEffect (client-only module)

import appCss from "../styles.css?url";
import { COMPANY_NAME, DOMAIN_URL, PRODUCT_NAME, SITE_NAME, SITE_TAGLINE } from "@/lib/domain";
import sadeedOgAsset from "@/assets/sadeed-og.png.asset.json";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { armHealthyBootReset } from "@/lib/sadeed/self-healing/crash-loop";

// ── SADEED Singleton ────────────────────────────────────────────────────
// ONE SADEED. Do not add a second copilot at the root. See
// `src/lib/sadeed-core/README.md` for the migration kill-list.
import { SadeedProvider } from "@/lib/sadeed-core";
// Deferred off the hydration critical path: the copilot is the heaviest
// root widget and nothing above the fold needs it at first input. It
// lazy-loads after the first idle moment post-hydration, so every route
// becomes interactive immediately after paint. ONE SADEED law unchanged.
const SadeedCopilot = lazy(() =>
  import("@/components/sadeed-core/SadeedCopilot").then((m) => ({ default: m.SadeedCopilot })),
);
import { InstallAppBar } from "@/components/sadeed/InstallAppBar";
// SadeedGlobalBackdrop removed — SADEED renders only via SadeedCopilot top-circle
import { GlobalPageBackdrop } from "@/components/sadeed/GlobalPageBackdrop";
import { ArabianPeninsulaBackdrop } from "@/components/executive/ArabianPeninsulaBackdrop";
import { SadeedWatermark } from "@/components/executive/SadeedWatermark";
import { useRouterState } from "@tanstack/react-router";
import { useIntroActive } from "@/lib/intro-store";
import { HoloAmbience } from "@/components/layout/HoloAmbience";
import { TopBar } from "@/components/nav/TopBar";
import { isOperationalRoute } from "@/lib/seo/operational-noindex";
import { StaffNumberGate } from "@/components/access/StaffNumberGate";
import { isGatedRoute } from "@/lib/access/staff-entry";
import { RouteTransition } from "@/components/motion/RouteTransition";

import { DemoModeProvider } from "@/lib/demo/demo-controller";
import { RegionProvider } from "@/lib/region-context";

function NotFoundComponent() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/index") {
      window.history.replaceState(null, "", "/");
      void router.invalidate();
    }
  }, [router]);

  if (typeof window !== "undefined" && window.location.pathname === "/index") return null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error: rawError, reset }: ErrorComponentProps) {
  const error = rawError instanceof Error ? rawError : new Error(String(rawError));
  const router = useRouter();
  return (
    <div
      dir="rtl"
      className="flex min-h-dvh items-center justify-center bg-[#04070F] px-4 text-right"
    >
      <div className="max-w-md">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/30 bg-[#00D4FF]/5 px-3 py-1 text-xs font-medium text-[#00D4FF]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00D4FF]" />
          منصة إدارة الأمن الصناعي
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">حدث خطأ — جارٍ الاستعادة</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          واجهت المنصة عائقًا مؤقتًا. يمكنك المحاولة مجددًا الآن، ولن تُفقد بياناتك. تم تسجيل الحدث
          في سجل التدقيق تلقائيًا.
        </p>
        {import.meta.env.DEV && error?.message && (
          <p
            dir="ltr"
            className="mt-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left font-mono text-[12px] text-white/40"
          >
            {error.message}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-[#00D4FF] px-4 py-2 text-sm font-semibold text-[#04070F] transition-colors hover:bg-[#3AE8FF]"
          >
            المحاولة مجددًا
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
          >
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      // PWA — installable on iPhone/Android/Windows/Mac from one link.
      { name: "theme-color", content: "#04070F" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      // اسم التطبيق المثبَّت يطابق `manifest.webmanifest` حرفًا بحرف؛
      // اختلافهما يظهر اسمين للمنتج نفسه على الشاشة الرئيسية.
      { name: "apple-mobile-web-app-title", content: PRODUCT_NAME },
      { name: "application-name", content: PRODUCT_NAME },
      { name: "google-site-verification", content: "ZMjRDSJhOrvRVKAbg8VWNjP8CICjLONLC3Jk6nKpsUQ" },
      { title: SITE_NAME },
      // المعاينة الاجتماعية تظهر SADEED AI بدلاً من النسخة القديمة NEXIOS،
      // مع خلفية رقمية عصرية باللون الأزرق السماوي البحري.
      {
        name: "description",
        content: "SADEED AI — منظومة القرار والإنجاز الذكي للأمن الصناعي والتحول الرقمي.",
      },
      { property: "og:title", content: "SADEED AI" },
      {
        property: "og:description",
        content: "منظومة القرار والإنجاز الذكي للأمن الصناعي والتحول الرقمي.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: DOMAIN_URL },
      { property: "og:image", content: `${DOMAIN_URL}${sadeedOgAsset.url}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: `${PRODUCT_NAME} — SADEED AI` },
      { property: "og:site_name", content: COMPANY_NAME },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SADEED AI" },
      {
        name: "twitter:description",
        content: "منظومة القرار والإنجاز الذكي للأمن الصناعي والتحول الرقمي.",
      },
      { name: "twitter:image", content: `${DOMAIN_URL}${sadeedOgAsset.url}` },
      { name: "twitter:image:alt", content: `${PRODUCT_NAME} — SADEED AI` },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Alexandria:wght@400;600;700;800&family=Cairo:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      // كانت الثلاثة تشير إلى `/sadeed-portrait.png` — **١٫٩٢ ميغابايت**،
      // يجلبها المتصفّح على كل صفحة ليرسم أيقونة تبويب بحجم ١٦ بكسل.
      // وهي أثقل أصلٍ في `public/` بفارق، وخارج رادار
      // `check-performance-budget.mjs` لأن فحص الوسائط يقتصر على الصوت
      // والفيديو — فمرّت بلا أن يلحظها أحد.
      //
      // و`sadeed-icon.png` هو **علامة المنتج** الرقمية العصرية: يستعمله
      // `app-shell` في الترويسة والشريط الجانبي، وهو `logo` في بيانات
      // schema.org أدناه. أي أن التصحيح يوحّد الهوية ويخفّف معًا: أيقونة
      // التبويب كانت صورةَ المساعد لا علامةَ المنتج.
      { rel: "icon", type: "image/png", href: "/sadeed-icon.png" },
      { rel: "apple-touch-icon", href: "/sadeed-icon.png" },
      { rel: "shortcut icon", type: "image/png", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [
      {
        children: `(function(){try{var s=localStorage.getItem('locale');var l=(s==='ar'||s==='en')?s:'ar';document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';}catch(e){}})();`,
      },
      {
        // PWA service-worker registration (offline shell + faster loads). Runs
        // after load so it never blocks first paint; failures are swallowed.
        children: `(function(){if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}})();`,
      },
      {
        // Article XIII — Crash-Loop Breaker (iOS Safari OOM recovery).
        // Counts UNCLEAN exits before hydration; at 2+ strikes the shell
        // enters safe-mode: skip the intro video and mark <html> so heavy
        // scenes can opt out. The counter is reset only after
        // HEALTHY_UPTIME_MS of visible uptime, not at React commit (see
        // RootComponent effect below and crash-loop.ts).
        // Once per document (2026-10-15): the router can re-render the head
        // scripts on a client-side redirect (a guest opening /ptw is sent to
        // "/"), which re-executes this inline script in the SAME document. It
        // then found its own 'nexios-alive' flag and counted a crash, so the
        // first visit landed in safe-mode (production check run 493). A
        // window flag makes every later execution in that document a no-op;
        // a real reload or crash gets a fresh window.
        // Unclean-exit detection (P0 2026-10-14): 'nexios-alive' is '1' while
        // the page is visible and removed on pagehide / hidden. Still '1' at
        // boot ⇒ the last life died without pagehide (iOS jetsam) ⇒ a strike
        // whatever its uptime: n = max(n, 1) + 1, i.e. safe-mode on the reload
        // after the first crash. A CLEAN boot leaves n unchanged: counting
        // every boot (`n+1`) put two quick pull-to-refreshes, a fast OAuth
        // round-trip or an error-boundary reload into safe-mode, on desktop
        // too. Contract and lesson: crash-loop.ts (ALIVE_KEY).
        children: `(function(){try{if(window.__nxBootCounted)return;window.__nxBootCounted=1;var ss=window.sessionStorage;var k='nexios-boot-attempts';var a='nexios-alive';var n=parseInt(ss.getItem(k)||'0',10);if(!isFinite(n)||n<0)n=0;n=ss.getItem(a)==='1'?Math.max(n,1)+1:n;ss.setItem(k,String(n));var up=function(){try{if(document.visibilityState==='visible')ss.setItem(a,'1');else ss.removeItem(a);}catch(_){}};var down=function(){try{ss.removeItem(a);}catch(_){}};up();window.addEventListener('pagehide',down);window.addEventListener('pageshow',up);document.addEventListener('visibilitychange',up);if(n>=2){ss.setItem('nexios-welcome','complete:v4');ss.setItem('nexios-safe-mode','1');document.documentElement.classList.add('safe-mode');}if(n>=3){try{if('caches' in window){caches.keys().then(function(ks){ks.forEach(function(c){caches.delete(c);});});}if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});}}catch(_){}}}catch(e){}})();`,
      },

      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: COMPANY_NAME,
          legalName: COMPANY_NAME,
          url: DOMAIN_URL,
          logo: `${DOMAIN_URL}/sadeed-icon.png`,
          description:
            "Enterprise AI Operating System for Government, Enterprise, and Sovereign Digital Transformation.",
          areaServed: ["SA", "AE", "KW", "QA", "BH", "OM"],
          sameAs: [],
          contactPoint: [
            {
              "@type": "ContactPoint",
              email: "info@neexios.com",
              contactType: "sales",
              areaServed: "SA",
              availableLanguage: ["Arabic", "English"],
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: PRODUCT_NAME,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: DOMAIN_URL,
          publisher: { "@type": "Organization", name: COMPANY_NAME },
          offers: { "@type": "Offer", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  // The i18n default locale is "ar" (see src/lib/i18n.tsx). Rendering the
  // SSR shell with lang="ar" dir="rtl" matches that default and eliminates
  // the LTR→RTL flash for Arabic visitors. The inline ScriptOnce below
  // still upgrades to "en" when the user's localStorage says so.
  return (
    // `className` مقروء من JSX: كلّما أعاد React رسم <html> أعاد فرض القيمة
    // المكتوبة هنا. فكتابة "light" ثابتةً كانت تمحو صنف `dark` الذي يضعه
    // ThemeProvider بعد كل إعادة رسم — فيتعذّر تثبيت الوضع الداكن أصلًا.
    // الحل: لا صنف ثيم في JSX؛ السكربت المانع أدناه يضعه قبل أول رسم
    // (فلا وميض)، وThemeProvider يملكه بعدها وحده.
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          // يسبق أول رسم: يقرأ الاختيار المحفوظ ويضع الصنف، **والافتراضي فاتح**
          // — قرار المالك N1 (٢٠٢٦/١٠/١٤، «الفاتح كما في الصورة (موصى به)»)
          // ناسخًا «الداكن افتراضيًّا» (٢٠٢٦/٠٨/٠٥ ثم D1 ٢٠٢٦/١٠/١٣). والداكن
          // باقٍ وضعًا كاملًا بضغطة واحدة، يُحفظ ويُحترم.
          dangerouslySetInnerHTML={{
            __html:
              // الاختيار المحفوظ يُقرأ هنا — قبل أول رسم — لا في مزوّد
              // React: قراءته بعد الترطيب تعني أن من اختار الداكن يرى وميضة
              // فاتحة كاملة عند كل فتح. والقاعدة «فاتح ما لم يُحفظ `dark`
              // صراحةً»: قيمةٌ تالفة أو غائبة أو تخزينٌ محجوب ⇐ الافتراضي،
              // كما يقرّره `resolveStoredTheme` في `lib/theme.tsx` حرفًا —
              // ولا كشفَ عن تفضيل نظام التشغيل.
              "(function(){try{var r=document.documentElement;" +
              "var t=localStorage.getItem('theme');" +
              "var d=t==='dark';" +
              "r.classList.toggle('light',!d);r.classList.toggle('dark',d);" +
              "r.style.colorScheme=d?'dark':'light';}" +
              // **سقطت من هنا قراءة `nx-holo-bg` (قرار المالك ٢٠٢٦/٠٨/٠٩).**
              // كان هذا السطر يقرأ المفتاح ويكتب `data-nx-motion="off"` قبل
              // أول رسم، لأن اختيار المستخدم كان يسقط بمجرّد التنقّل إلى
              // صفحة بلا خلفية فيلم. وقد حُذف الفيلم وحُذف معه زرّه —
              // والزرّ هو الكاتب **الوحيد** لهذا المفتاح.
              //
              // فبقاء القراءة يعني مفتاحًا يتيمًا في تخزين من ضغط الزرّ
              // يومًا: يُسكِت نبضات الأيقونات وانتقالات المسار على كل صفحة،
              // إلى الأبد، بلا واجهة تفكّه — أي حالة عالقة لا تفضيلًا. وما
              // طلبه ذلك المستخدم أصلًا كان «أوقف فيلم الخلفية» لا «أوقف
              // كل حركة إلى الأبد».
              //
              // والحركة الباقية لها مخرجها الحيّ: `prefers-reduced-motion`
              // في styles.css و`icon-motion.css` و`LottieIcon`. والسمة
              // `data-nx-motion` تبقى سطحَ تحكّم عاملًا، بلا كاتب في
              // الواجهة اليوم.
              // والتخزين المحجوب يرمي قبل وضع أي صنف، فيضع الاحتياطيُّ
              // الافتراضيَّ نفسه — فاتحًا مع مخطّط ألوانه.
              "catch(e){var h=document.documentElement;" +
              "h.classList.add('light');h.style.colorScheme='light';}})();",
          }}
        />
        <HeadContent />
      </head>
      <body className="bg-background">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Article III (self-healing): install the client watchdog once at root.
  // FR-20: also install the universal first-gesture audio unlock so that
  // ANY tap anywhere on the app primes AudioContext + unlocks SadeedAudioBus
  // in the same synchronous tick — required for iOS/Android autoplay policy.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    // Article XIII — Crash-Loop Breaker. Reaching React commit does NOT make
    // this boot healthy: iOS jetsam kills the page AFTER hydration (video,
    // image decode, rAF loops), and clearing the counter here reset the
    // strike count on every boot, so safe-mode never engaged and Safari
    // reached its fatal "problem repeatedly occurred" page (P0 2026-10-14).
    // The counter is cleared only after HEALTHY_UPTIME_MS of visible uptime
    // (see crash-loop.ts); unmounting before that keeps the strike.
    const disarmHealthyBoot = armHealthyBootReset();
    import("@/lib/sadeed/self-healing/watchdog").then((m) => {
      if (cancelled) return;
      cleanup = m.installSadeedWatchdog();
    });
    // Permanent background self-healing agent (Article III, always-on).
    void import("@/lib/sadeed/self-healing/permanent-agent").then((m) => {
      if (cancelled) return;
      try {
        m.installPermanentHealer();
      } catch {
        /* healer must never break the app */
      }
    });
    // Fire-and-forget: dynamic import keeps SSR bundle unchanged.
    void import("@/lib/user-interaction").then((m) => {
      if (cancelled) return;
      try {
        m.installInteractionTracker();
      } catch {
        /* ignore */
      }
    });
    // درع العلامات الخارجية (أمر المالك ٢٠٢٦/٠٨/٢٠): أي شارة منصّة بناء
    // تُحقن من طبقة الاستضافة («Edit with …») تُزال لحظة ظهورها — دائمًا.
    let badgeShieldCleanup: (() => void) | undefined;
    void import("@/lib/brand/badge-shield").then((m) => {
      if (cancelled) return;
      try {
        badgeShieldCleanup = m.installExternalBadgeShield();
      } catch {
        /* الدرع لا يكسر التطبيق أبدًا */
      }
    });
    return () => {
      cancelled = true;
      disarmHealthyBoot();
      cleanup?.();
      badgeShieldCleanup?.();
    };
  }, []);

  // Scroll frame budget: while the user actively scrolls, EVERY ambient
  // animation pauses (html.nx-scrolling in styles.css) so the whole frame
  // goes to scrolling itself; pulses resume ~0.2s after the scroll rests.
  // Dozens of live halos/pulses are free at rest but were measured to eat
  // half the scroll budget on GPU-less devices.
  useEffect(() => {
    const root = document.documentElement;
    let timer: number | undefined;
    const onScroll = () => {
      if (timer === undefined) root.classList.add("nx-scrolling");
      else window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        root.classList.remove("nx-scrolling");
        timer = undefined;
      }, 180);
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      if (timer !== undefined) window.clearTimeout(timer);
      root.classList.remove("nx-scrolling");
    };
  }, []);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (pathname === "/index") {
      void navigate({ to: "/", replace: true });
    }
  }, [pathname, navigate]);

  const isPromo = pathname.startsWith("/promo");
  const isHero = pathname === "/" || pathname === "";
  const isAccessGate = pathname.startsWith("/auth");
  const isAgentOperations =
    pathname === "/agents" || pathname === "/agents-flow" || pathname === "/agents-reference";
  // Copilot mounts only after the page is hydrated AND the main thread is
  // idle — false on the server and at first client render (no mismatch).
  const [copilotReady, setCopilotReady] = useState(false);
  useEffect(() => {
    const ready = () => setCopilotReady(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(ready, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(ready, 350);
    return () => clearTimeout(t);
  }, []);
  const introActive = useIntroActive();
  const suppressOverlays = isPromo || isAccessGate || isAgentOperations || introActive;
  const suppressMarquee = isAccessGate || introActive;
  const suppressClock = isPromo;
  /**
   * **سقط `showUtilityBar` مع الشريط نفسه (أمر المالك ٢٠٢٦/٠٩/١٠).**
   *
   * كان يقيّد شريط الجرس والمبدّل بالرئيسية وحدها. وقد أُزيلت أيقونات
   * تغيير الوضع والجرس والرجوع والهوم من النظام كاملًا بأمر المالك، فلم
   * يبقَ للقيد مقيَّد — وشرطٌ بلا مشروط يُقرأ لاحقًا على أنه ميزةٌ معطّلة
   * تنتظر إعادةَ وصلٍ، لا ميزةٌ محذوفة.
   */

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <I18nProvider>
            <DemoModeProvider>
              <RegionProvider>
                <SadeedProvider>
                  {/* Deepest ambient layer on EVERY page (incl. home): the
                      Arabian Peninsula, light-green pulse, four sector borders
                      in sky-blue, the active sector's border pulsing. */}
                  {!isHero && !introActive && !isAccessGate && !isAgentOperations && (
                    <ArabianPeninsulaBackdrop />
                  )}
                  {/* Global SADEED hologram backdrop for every non-home page.
                      Homepage draws its own (HoloVideoEngine inside the
                      blueprint page); the agent operations platform
                      deliberately uses a clean background. */}
                  {!isHero && !isPromo && !isAccessGate && !isAgentOperations && !introActive && (
                    <GlobalPageBackdrop />
                  )}
                  {!suppressOverlays && <SadeedWatermark />}
                  {!introActive && !isAccessGate && <HoloAmbience />}
                  {/* الشريط العلوي (أمر المالك ٢٠٢٦/٠٩/١٢): الساعة
                      والأزرار الثلاثة في صفٍّ واحد مرسوم — لا طبقة عائمة.
                      شريطان متراكبان كانا يسبقانه: هذا وطبقةُ الأقراص
                      فوقه، فبعد أول تمريرة يمضي الشريط مع الصفحة وتبقى
                      الأقراص شفّافةً يمرّ المحتوى عبرها. واحدٌ الآن.

                      **وخارج `RouteTransition` عمدًا**: بداخله يتحرّك مع
                      انتقال كل مسار، وهو عين «المتحرك» الذي مُنع.

                      والنطاق نطاق المكوّنين معًا: `suppressMarquee` كان
                      يُسقط الشريط على المقدّمة وبوّابة الدخول، والشرط نفسه
                      كان يُسقط الأقراص — فالدمج لا يغيّر ظهور أيّهما.
                      و`/promo` تُخفي الساعة وحدها وتُبقي الأزرار. */}
                  {/* منع الفهرسة على المسارات التشغيلية (أمر المالك
                      ٢٠٢٦/٠٩/١٨). React 19 يرفع `<meta>` إلى الترويسة من
                      أي موضع، فالوسم يُحقن من الجذر بقائمة بادئات واحدة
                      بدل وسمِ مئة مسارٍ يدويًّا — ومسارٌ جديد تحت بادئة
                      تشغيلية يُولد ممنوعًا لا مفهرسًا. */}
                  {isOperationalRoute(pathname) && (
                    <meta name="robots" content="noindex, nofollow" />
                  )}

                  {/* لوحة الرقم الوظيفي (أمر المالك ٢٠٢٦/٠٩/١٩): تُسأل
                      مرّة لكل جهاز على الشاشات التشغيلية، ثم تُفتح الصفحة
                      المقصودة. والمقدّمة وبوّابة الدخول خارجها كالشريط:
                      الأولى تملك الشاشة، والثانية ليست صفحة نظام. */}
                  {!introActive && !isAccessGate && isGatedRoute(pathname) && (
                    <StaffNumberGate path={pathname} />
                  )}
                  {!suppressMarquee && <TopBar showClock={!suppressClock} />}

                  <div className="relative z-10">
                    <RouteTransition>
                      <Outlet />
                    </RouteTransition>
                  </div>
                  {!isAccessGate && copilotReady && (
                    <Suspense fallback={null}>
                      <SadeedCopilot />
                    </Suspense>
                  )}
                  <InstallAppBar />
                  {/* SADEED speaks ONLY inside Conversation Mode («مخاطبة») in the
                      copilot panel, and via the homepage greeting button. No
                      route auto-narration, no page greeters, and no cinematic
                      welcome overlay — the homepage renders directly.

                      **والقاعدة عادت إلى نصّها الأصلي بعد دورةٍ كاملة في يومٍ
                      واحد (٢٠٢٦/٠٨/٢٨):** أمر المالك أنشأ مقدّمةً سينمائية
                      (٣٠ث ثم ١٠ث) فنُسخ هذا السطر، ثم أمرَ «أزل المقدمة
                      السينمائية» فعاد. تُذكر الدورة هنا كي لا يُقرأ رجوعُ
                      السطر ارتدادًا غير مقصود، ولا تُعاد المقدّمة بلا أمرٍ
                      جديد. وبناؤها كاملًا محفوظٌ في التاريخ عند 6da174f2. */}
                  <Toaster />
                </SadeedProvider>
              </RegionProvider>
            </DemoModeProvider>
          </I18nProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
