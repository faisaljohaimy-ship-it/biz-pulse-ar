import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { FourRegionHub } from "@/components/home/FourRegionHub";
import { HomeTopNav } from "@/components/nav/HomeTopNav";
import { HomeVideoBackdrop } from "@/components/home/HomeVideoBackdrop";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "منصة إدارة الأمن الصناعي — مركز القيادة التنفيذي" },
      {
        name: "description",
        content:
          "مركز قيادة تنفيذي موحّد للأمن الصناعي يعرض مؤشرات المناطق الأربع ويربطها بالتقارير والمخاطر ومنصة عمليات الوكلاء وFINN.",
      },
      { property: "og:title", content: "منصة إدارة الأمن الصناعي — مركز القيادة التنفيذي" },
      {
        property: "og:description",
        content: "رؤية تنفيذية موحّدة للأداء والمشاريع والموارد والمخاطر عبر المناطق الأربع.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }, []);

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="relative min-h-screen overflow-x-hidden bg-[#04070F] text-white"
    >
      <HomeVideoBackdrop />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(75%_50%_at_50%_0%,rgba(0,212,255,0.16),transparent_72%)]" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#04070F] via-[#04070F]/85 to-transparent" />
      </div>

      <HomeTopNav />
      <main className="relative z-10 mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6">
        <FourRegionHub />
      </main>
    </div>
  );
}
