import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { COMPANY_NAME, DOMAIN_URL, PRODUCT_NAME, SITE_NAME } from "@/lib/domain";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { BetaMarqueeBar } from "@/components/executive/BetaMarqueeBar";
import { GlobalAriaCopilot } from "@/components/executive/GlobalAriaCopilot";
import { LanguageToggle } from "@/components/executive/LanguageToggle";
import { AriaContextProvider } from "@/lib/aria/context-engine";
import { DemoModeProvider } from "@/lib/demo/demo-controller";
import { DemoModeHUD } from "@/components/executive/DemoModeHUD";
import { DemoAriaPresenter } from "@/components/executive/DemoAriaPresenter";
import { DemoMotionOverlay } from "@/lib/demo/motion-director";
import { PresentationLayer } from "@/components/executive/presentation/PresentationLayer";
import { AriaGlobalDock } from "@/components/aria/AriaGlobalDock";
import { ExecutiveBriefingBar } from "@/components/aria/ExecutiveBriefingBar";
import { OfflineBanner } from "@/components/system/OfflineBanner";
import { PlatformCompatibility } from "@/components/system/PlatformCompatibility";
import { KpiWatcherProvider } from "@/lib/aria/kpi-watcher";
import { AriaProactiveNudge } from "@/components/aria/AriaProactiveNudge";
import { CinematicRouteShell } from "@/components/cinema/CinematicRouteShell";


function BrandedBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, rgba(0,212,255,0.14), transparent 60%), linear-gradient(180deg, #061A2E 0%, #04111f 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(58,232,255,0.04) 0 1px, transparent 1px 3px)",
        }}
      />
      <div className="relative z-10 max-w-md text-center" dir="rtl">
        {children}
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <BrandedBackdrop>
      <div
        className="mx-auto mb-6 h-24 w-24 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 40% 35%, #6FFFE9 0%, #00D4FF 40%, #0B2742 90%)",
          boxShadow: "0 0 60px rgba(0,212,255,0.45)",
        }}
        aria-hidden
      />
      <h1
        className="text-6xl font-bold"
        style={{
          background: "linear-gradient(135deg, #6FFFE9, #00D4FF)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontFamily: "var(--font-arabic)",
        }}
      >
        404
      </h1>
      <p
        className="mt-4 text-base"
        style={{ color: "#D7EAF4", fontFamily: "var(--font-arabic)" }}
      >
        يبدو أنك خرجت عن المسار — أعيدك إلى غرفة القيادة؟
      </p>
      <p className="mt-1 text-xs" style={{ color: "#8FAFC4" }}>
        Looks like you drifted off-course — return to the command room.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="nx-press inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, #00D4FF, #3AE8FF)",
            color: "#04111f",
            boxShadow: "0 8px 30px rgba(0,212,255,0.35)",
          }}
        >
          العودة إلى NEXIOS
        </Link>
      </div>
    </BrandedBackdrop>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <BrandedBackdrop>
      <div
        className="mx-auto mb-6 h-20 w-20 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 40% 35%, #FFB703 0%, #FF4D6D 55%, #0B2742 95%)",
          boxShadow: "0 0 50px rgba(255,77,109,0.35)",
        }}
        aria-hidden
      />
      <h1
        className="text-xl font-semibold"
        style={{ color: "#fff", fontFamily: "var(--font-arabic)" }}
      >
        تعذّر تحميل هذه اللوحة
      </h1>
      <p className="mt-2 text-sm" style={{ color: "#8FAFC4" }}>
        {error.message || "حدث خطأ غير متوقع في وحدة العرض."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="nx-press inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, #00D4FF, #3AE8FF)",
            color: "#04111f",
          }}
        >
          إعادة المحاولة
        </button>
        <Link
          to="/"
          className="nx-press inline-flex items-center justify-center rounded-md border px-5 py-2 text-sm font-semibold"
          style={{ borderColor: "rgba(0,212,255,0.35)", color: "#D7EAF4" }}
        >
          غرفة القيادة
        </Link>
      </div>
    </BrandedBackdrop>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0A0E14" },
      { name: "color-scheme", content: "dark" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "NEXIOS" },
      { name: "format-detection", content: "telephone=no" },
      { name: "google-site-verification", content: "ZMjRDSJhOrvRVKAbg8VWNjP8CICjLONLC3Jk6nKpsUQ" },
      { title: SITE_NAME },
      {
        name: "description",
        content:
          "Bilingual executive AI platform unifying security operations, digital twin, and real-time intelligence.",
      },
      { property: "og:title", content: "NEXIOS AI OS — Enterprise Industrial Security Operating System" },
      { property: "og:description", content: "Bilingual executive AI platform unifying security operations, digital twin, and real-time intelligence." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: DOMAIN_URL },
      { property: "og:image", content: `${DOMAIN_URL}/og-image.jpg` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:site_name", content: COMPANY_NAME },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NEXIOS AI OS — Enterprise Industrial Security Operating System" },
      { name: "twitter:description", content: "Bilingual executive AI platform unifying security operations, digital twin, and real-time intelligence." },
      { name: "twitter:image", content: `${DOMAIN_URL}/og-image.jpg` },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/4oFn87w5GiXP8JBD99DtcazaWOB2/social-images/social-1782927012318-IMG_7450.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/4oFn87w5GiXP8JBD99DtcazaWOB2/social-images/social-1782927012318-IMG_7450.webp" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/nexus-icon.png" },
      { rel: "apple-touch-icon", href: "/nexus-icon.png" },
      { rel: "shortcut icon", href: "/nexus-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [
      {
        children: `(function(){try{var s=localStorage.getItem('locale');var l=(s==='ar'||s==='en')?s:'ar';document.documentElement.lang=(l==='ar'?'ar-SA':'en');document.documentElement.dir=l==='ar'?'rtl':'ltr';}catch(e){document.documentElement.lang='ar-SA';document.documentElement.dir='rtl';}})();`,
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
  return (
    <html lang="ar-SA" dir="rtl" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <I18nProvider>
            <AriaContextProvider>
              <KpiWatcherProvider>
              <DemoModeProvider>
                <PlatformCompatibility />
                <OfflineBanner />
                <BetaMarqueeBar />
                <div className="pointer-events-none fixed end-3 top-[42px] z-[70] sm:end-4 sm:top-[48px]">
                  <div className="pointer-events-auto">
                    <LanguageToggle />
                  </div>
                </div>
                <Outlet />
                <GlobalAriaCopilot />
                <DemoMotionOverlay />
                <DemoAriaPresenter />
                <PresentationLayer />
                <DemoModeHUD />
                <AriaGlobalDock />
                <AriaProactiveNudge />
                <ExecutiveBriefingBar />
                <Toaster />

              </DemoModeProvider>
              </KpiWatcherProvider>
            </AriaContextProvider>
          </I18nProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
