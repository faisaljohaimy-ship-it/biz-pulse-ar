/**
 * الصفحة الرئيسية — سطح «المُخطَّط التنفيذي» المعتمد من المالك (٢٠٢٦/٠٨/٠٣).
 *
 * القرار: التصميم الهندسي (الوردة + الشفق اللوني + لوحات القياس) هو وجه
 * المنصة، بألوان لامعة في الوضعين وبالفن عاملًا رئيسيًّا. الصفحة نفسها تبقى
 * على /blueprint أيضًا — تسجيلان لمساعد واحد، فلا ازدواج كود.
 */
import { createFileRoute } from "@tanstack/react-router";
import { BlueprintPage } from "./-blueprint-page";

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
  component: BlueprintPage,
});
