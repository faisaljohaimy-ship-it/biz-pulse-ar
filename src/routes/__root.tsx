import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
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
import { COMPANY_NAME, DOMAIN_URL, PRODUCT_NAME, SITE_NAME } from "@/lib/domain";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";

// ── ARIA Singleton ────────────────────────────────────────────────────
// ONE ARIA. Do not add a second copilot at the root. See
// `src/lib/aria-core/README.md` for the migration kill-list.
import { AriaProvider } from "@/lib/aria-core";
import { AriaCopilot } from "@/components/aria-core/AriaCopilot";
import { InstallAppBar } from "@/components/aria/InstallAppBar";
// AriaGlobalBackdrop removed — ARIA renders only via AriaCopilot top-circle
import { GlobalPageBackdrop } from "@/components/aria/GlobalPageBackdrop";
import { ArabianPeninsulaBackdrop } from "@/components/executive/ArabianPeninsulaBackdrop";
import { WelcomeThenGenesis } from "@/components/cinematic/WelcomeThenGenesis";
import { AriaWatermark } from "@/components/executive/AriaWatermark";
import { useRouterState } from "@tanstack/react-router";
import { useIntroActive } from "@/lib/intro-store";
import { BetaMarqueeBar } from "@/components/executive/BetaMarqueeBar";

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
          NEXIOS AI OS
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">حدث خطأ — جارٍ الاستعادة</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          واجهت المنصة عائقًا مؤقتًا. يمكنك المحاولة مجددًا الآن، ولن تُفقد بياناتك. تم تسجيل الحدث
          في سجل التدقيق تلقائيًا.
        </p>
        {import.meta.env.DEV && error?.message && (
          <p
            dir="ltr"
            className="mt-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left font-mono text-[11px] text-white/40"
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
      { name: "apple-mobile-web-app-title", content: "ARIA" },
      { name: "application-name", content: "ARIA · NEXIOS" },
      { name: "google-site-verification", content: "ZMjRDSJhOrvRVKAbg8VWNjP8CICjLONLC3Jk6nKpsUQ" },
      { title: SITE_NAME },
      {
        name: "description",
        content: "منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform",
      },
      { property: "og:title", content: SITE_NAME },
      {
        property: "og:description",
        content: "منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: DOMAIN_URL },
      { property: "og:image", content: `${DOMAIN_URL}/aria-icon.jpeg` },
      { property: "og:image:width", content: "1128" },
      { property: "og:image:height", content: "1920" },
      { property: "og:image:alt", content: "ARIA · NEXIOS AI OS" },
      { property: "og:site_name", content: COMPANY_NAME },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "NEXIOS AI OS — منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform",
      },
      {
        name: "twitter:description",
        content: "منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform",
      },
      { name: "twitter:image", content: `${DOMAIN_URL}/aria-icon.jpeg` },
      { name: "twitter:image:alt", content: "ARIA · NEXIOS AI OS" },
      { title: "NEXIOS AI OS — منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform" },
      {
        property: "og:title",
        content: "NEXIOS AI OS — منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/4oFn87w5GiXP8JBD99DtcazaWOB2/social-images/social-1783673843487-14AEE944-7ACB-4DDE-93F1-E17909C04813.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/4oFn87w5GiXP8JBD99DtcazaWOB2/social-images/social-1783673843487-14AEE944-7ACB-4DDE-93F1-E17909C04813.webp",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/x-icon", href: "/aria-icon.jpeg" },
      { rel: "apple-touch-icon", href: "/aria-icon.jpeg" },
      { rel: "shortcut icon", type: "image/x-icon", href: "/aria-icon.jpeg" },
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
        children: `(function(){try{var ss=window.sessionStorage;var k='nexios-boot-attempts';var n=parseInt(ss.getItem(k)||'0',10);if(!isFinite(n)||n<0)n=0;n++;ss.setItem(k,String(n));if(n>=2){ss.setItem('nexios-welcome','complete:v2');ss.setItem('nexios-safe-mode','1');document.documentElement.classList.add('safe-mode');}}catch(e){}})();`,
      },

      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: COMPANY_NAME,
          legalName: COMPANY_NAME,
          url: DOMAIN_URL,
          logo: `${DOMAIN_URL}/nexus-icon.png`,
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
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-[#04070F]">
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
  // ANY tap anywhere on the app primes AudioContext + unlocks AriaAudioBus
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
    import("@/lib/aria/self-healing/watchdog").then((m) => {
      if (cancelled) return;
      cleanup = m.installAriaWatchdog();
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

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (pathname === "/index") {
      void navigate({ to: "/", replace: true });
    }
  }, [pathname, navigate]);

  const isPromo = pathname.startsWith("/promo");
  const isHero = pathname === "/" || pathname === "";
  const isBridge = pathname.startsWith("/executive-bridge");
  const introActive = useIntroActive();
  const suppressOverlays = isPromo || introActive;
  const suppressMarquee = introActive;
  const suppressClock = isPromo || isBridge;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <I18nProvider>
            <DemoModeProvider>
              <RegionProvider>
                <AriaProvider>
                  {/* Deepest ambient layer on EVERY page (incl. home): the
                      Arabian Peninsula, light-green pulse, four sector borders
                      in sky-blue, the active sector's border pulsing. */}
                  {!introActive && <ArabianPeninsulaBackdrop />}
                  {/* Global ARIA hologram backdrop for every non-home page.
                      Homepage owns its own HomeVideoBackdrop. */}
                  {!isHero && !isPromo && !introActive && <GlobalPageBackdrop />}
                  {/* Unified header: LIVE clock is embedded inside the marquee bar (single strip, no ghost row). */}
                  {!suppressMarquee && <BetaMarqueeBar showClock={!suppressClock} />}
                  {!suppressOverlays && <AriaWatermark />}
                  <div className="relative z-10">
                    <Outlet />
                  </div>
                  {!introActive && <AriaCopilot />}
                  <InstallAppBar />
                  {/* ARIA speaks ONLY inside Conversation Mode («مخاطبة») in the
                      copilot panel, and via the homepage greeting button. No
                      route auto-narration, no page greeters. The cinematic
                      welcome plays on the HOMEPAGE only — otherwise its
                      full-screen overlay (up to 52s) covered every route
                      (bridge, showcase…), making them look empty when landed on
                      directly (constitution art. 10: no auto motion off-home). */}
                  {isHero && <WelcomeThenGenesis />}
                  <Toaster />
                </AriaProvider>
              </RegionProvider>
            </DemoModeProvider>
          </I18nProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
