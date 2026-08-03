import { createFileRoute } from "@tanstack/react-router";
import { FourRegionHub } from "@/components/home/FourRegionHub";
import { HomeTopNav } from "@/components/nav/HomeTopNav";
import { HomeVideoBackdrop } from "@/components/home/HomeVideoBackdrop";
import { HomeHeroVisual } from "@/components/home/HomeHeroVisual";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سَدِيد — إدارة الأمن الصناعي" },
      {
        name: "description",
        content:
          "مركز قيادة تنفيذي موحّد للأمن الصناعي يعرض مؤشرات المناطق الأربع ويربطها بالتقارير والمخاطر ومنصة عمليات الوكلاء وFINN.",
      },
      { property: "og:title", content: "سَدِيد — إدارة الأمن الصناعي" },
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
  const { theme } = useTheme();
  const ar = locale === "ar";
  const light = theme === "light";

  // كانت هذه الصفحة تفرض الوضع الداكن عند كل تركيب، فتلغي اختيار المستخدم
  // فور وصوله إليها — وهو سبب ملاحظة «النظام الفاتح لا يعمل على المنصة».
  // الفرض أُزيل: ThemeProvider هو المرجع الوحيد لوضع العرض.

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="relative min-h-screen overflow-x-hidden bg-[color:var(--surface)] text-[color:var(--ink)]"
    >
      <HomeVideoBackdrop />
      {/* توهّج الخلفية للوضع الداكن وحده — فوق الأبيض يتحوّل إلى بقعة رمادية. */}
      {!light && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(75%_50%_at_50%_0%,rgba(0,212,255,0.16),transparent_72%)]" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#04070F] via-[#04070F]/85 to-transparent" />
        </div>
      )}

      <HomeTopNav />
      <main className="relative z-10 mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6">
        {/* فن الصفحة الرئيسية — تصوّر حي للمناطق الأربع */}
        <section className="mb-12 flex justify-center">
          <HomeHeroVisual />
        </section>

        {/* لوحة المناطق الأربع المفصّلة */}
        <section>
          <FourRegionHub />
        </section>
      </main>
    </div>
  );
}
