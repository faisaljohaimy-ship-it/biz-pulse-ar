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
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";

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
import { HeaderClockBar } from "@/components/executive/HeaderClockBar";
import { GlobalBackButton } from "@/components/layout/GlobalBackButton";
import { HoloAmbience } from "@/components/layout/HoloAmbience";
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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
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
      // كانت هذه الثلاثة `"N"` — بقيّة تسمية مسحوبة قُصّت ولم تُستبدل،
      // فخرجت للباحث ولمشاركات الروابط وصفًا من حرف واحد. المصدر الآن
      // `SITE_TAGLINE` من `@/lib/domain`: اسم واحد لا يُعاد كتابته يدويًا.
      {
        name: "description",
        content: SITE_TAGLINE,
      },
      { property: "og:title", content: SITE_NAME },
      {
        property: "og:description",
        content: SITE_TAGLINE,
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: DOMAIN_URL },
      // الملف كان `/sadeed-portrait.png` — ١٫٩٢ ميغابايت لصورة فوتوغرافية،
      // وهو أثقل أصل في `public/` بفارق. وPNG ترميز خاطئ لصورة متدرّجة:
      // النسخة WebP الموجودة أصلًا (`/sadeed-portrait.webp`) هي **الصورة
      // نفسها بالمقاس نفسه** في ١٤٤ كيلوبايت — ٩٣٪ أخفّ. وإعادة ضغط PNG بلا
      // فقد لا تُجدي: أصغر ناتج بلا فقد ٢٫٧٥ ميغابايت، أي **أكبر** من الأصل.
      //
      // والمقاسان المعلنان كانا خاطئين: 1128×1920 بينما الملف 1024×1536 —
      // أي أن كل قارئ بطاقة اجتماعية كان يحجز إطارًا بنسبة غير نسبة الصورة.
      { property: "og:image", content: `${DOMAIN_URL}/sadeed-portrait.webp` },
      { property: "og:image:width", content: "1024" },
      { property: "og:image:height", content: "1536" },
      // الصورة صورة المساعد. النصّ البديل يذكر الاسم **مرّة واحدة**: بعد
      // توحيد اسم المساعد باسم المنتج (قرار المالك ٢٠٢٦/٠٨/٠٩) صار تكراره
      // على طرفَي الفاصل «سَدِيد · سَدِيد» — لغوٌ يُنطق مرّتين في قارئ
      // الشاشة. فالاسم للمنتج، والمساعد يوصف بدوره.
      { property: "og:image:alt", content: `${PRODUCT_NAME} — المساعد التنفيذي` },
      { property: "og:site_name", content: COMPANY_NAME },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: SITE_NAME,
      },
      {
        name: "twitter:description",
        content: SITE_TAGLINE,
      },
      { name: "twitter:image", content: `${DOMAIN_URL}/sadeed-portrait.webp` },
      { name: "twitter:image:alt", content: `${PRODUCT_NAME} — المساعد التنفيذي` },
      // تكرار متعمَّد من نسخة Lovable القديمة: الإدخال الأخير هو ما يفوز
      // في وسم واحد، فكان عنوان التبويب يعود لتسمية سابقة بعد كل رسم.
      // الاثنان الآن `SITE_NAME` نفسه — التكرار صار بلا أثر بدل أن يكون
      // ناسخًا صامتًا.
      { title: SITE_NAME },
      {
        property: "og:title",
        content: SITE_NAME,
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d113c6a3-3bac-46e4-bf53-293d05655ab1",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d113c6a3-3bac-46e4-bf53-293d05655ab1",
      },
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
        // Increments a boot-attempt counter before hydration; on 2+
        // consecutive unfinished boots the shell enters safe-mode: skip the
        // intro video and mark <html> so heavy scenes can opt out. A clean
        // React mount resets the counter (see RootComponent effect below).
        children: `(function(){try{var ss=window.sessionStorage;var k='nexios-boot-attempts';var n=parseInt(ss.getItem(k)||'0',10);if(!isFinite(n)||n<0)n=0;n++;ss.setItem(k,String(n));if(n>=2){ss.setItem('nexios-welcome','complete:v4');ss.setItem('nexios-safe-mode','1');document.documentElement.classList.add('safe-mode');}if(n>=3){try{if('caches' in window){caches.keys().then(function(ks){ks.forEach(function(c){caches.delete(c);});});}if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});}}catch(_){}}}catch(e){}})();`,
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
          // يسبق أول رسم: يقرأ الاختيار المحفوظ ويضع الصنف، والافتراضي داكن —
          // هوية سَدِيد داكنة، والافتراضي الفاتح كان يُغرق نصوص القمرة (قرار ٢٠٢٦/٠٨/٠٥).
          dangerouslySetInnerHTML={{
            __html:
              // الاختيار المحفوظ يُقرأ هنا — قبل أول رسم — لا في مزوّد
              // React: قراءته بعد الترطيب تعني أن من اختار الفاتح يرى وميضة
              // داكنة كاملة عند كل فتح. والافتراضي داكن بلا كشفٍ عن تفضيل
              // نظام التشغيل: من لم يختر يحصل على هوية سَدِيد كما صُمِّمت.
              "(function(){try{var r=document.documentElement;" +
              "var t=localStorage.getItem('theme');" +
              "var d=t!=='light';" +
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
              "catch(e){document.documentElement.classList.add('dark');}})();",
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
    // Article XIII — Crash-Loop Breaker: React reached commit, so this boot
    // is healthy. Reset the pre-hydration attempt counter so a future crash
    // gets its own fresh 2-strike budget.
    try {
      window.sessionStorage.removeItem("nexios-boot-attempts");
    } catch {
      /* ignore */
    }
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
    return () => {
      cancelled = true;
      cleanup?.();
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
                      Homepage owns its own HomeVideoBackdrop; the agent
                      operations platform deliberately uses a clean background. */}
                  {!isHero && !isPromo && !isAccessGate && !isAgentOperations && !introActive && (
                    <GlobalPageBackdrop />
                  )}
                  {/* Unified header: the scrolling marquee is removed (G3); the
                      LIVE clock remains as this strip's only content. */}
                  {!suppressMarquee && <HeaderClockBar showClock={!suppressClock} />}
                  {!suppressOverlays && <SadeedWatermark />}
                  {!introActive && !isAccessGate && <HoloAmbience />}
                  {!introActive && !isAccessGate && <GlobalBackButton />}
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
                      welcome overlay — the homepage renders directly. */}
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
