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

// ── ARIA Singleton ────────────────────────────────────────────────────
// ONE ARIA. Do not add a second copilot at the root. See
// `src/lib/aria-core/README.md` for the migration kill-list.
import { AriaProvider } from "@/lib/aria-core";
import { AriaCopilot } from "@/components/aria-core/AriaCopilot";
// AriaGlobalBackdrop removed — ARIA renders only via AriaCopilot top-circle
import { AriaGreeter } from "@/components/aria/AriaGreeter";
import { GenesisIntro } from "@/components/cinematic/GenesisIntro";
import { useRouterState } from "@tanstack/react-router";

import { DemoModeProvider } from "@/lib/demo/demo-controller";




function NotFoundComponent() {
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
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google-site-verification", content: "ZMjRDSJhOrvRVKAbg8VWNjP8CICjLONLC3Jk6nKpsUQ" },
      { title: SITE_NAME },
      {
        name: "description",
        content:
          "نظام التشغيل الذكي للأمن الصناعي · Intelligent operating system for industrial security.",
      },
      { property: "og:title", content: SITE_NAME },
      {
        property: "og:description",
        content:
          "نظام التشغيل الذكي للأمن الصناعي · Intelligent operating system for industrial security.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: DOMAIN_URL },
      { property: "og:image", content: `${DOMAIN_URL}/og-image.jpg` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:site_name", content: COMPANY_NAME },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NEXIOS AI OS" },
      {
        name: "twitter:description",
        content:
          "نظام التشغيل الذكي للأمن الصناعي · Intelligent operating system for industrial security.",
      },
      { name: "twitter:image", content: `${DOMAIN_URL}/og-image.jpg` },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/nexus-icon.png" },
      { rel: "apple-touch-icon", href: "/nexus-icon.png" },
      { rel: "shortcut icon", href: "/nexus-icon.png" },
    ],
    scripts: [
      {
        children: `(function(){try{var s=localStorage.getItem('locale');var l=(s==='ar'||s==='en')?s:'en';document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';}catch(e){}})();`,
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
    <html lang="en" dir="ltr" className="dark">
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPromo = pathname.startsWith("/promo");

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <I18nProvider>
            <DemoModeProvider>
              <AriaProvider>
                {/* AriaGlobalBackdrop removed — ARIA lives ONLY in the top-circle inside AriaCopilot */}
                <BetaMarqueeBar />
                <div className="relative z-10">
                  <Outlet />
                </div>
                <AriaCopilot />
                {!isPromo && <AriaGreeter />}
                {!isPromo && <GenesisIntro />}
                <Toaster />
              </AriaProvider>
            </DemoModeProvider>
          </I18nProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

