/**
 * الصفحة الرئيسية — سطح «المُخطَّط التنفيذي» المعتمد من المالك (٢٠٢٦/٠٨/٠٣).
 *
 * القرار: التصميم الهندسي (الشفق اللوني + لوحات القياس) هو وجه المنصة،
 * بألوان لامعة في الوضعين وبالفن عاملًا رئيسيًّا. وصدر الصفحة ثلاثة أعمدة
 * منذ ٢٠٢٦/٠٨/٠٩: المناطق الأربع بطاقاتٍ · سَدِيد وسطًا · تحليلاته
 * وتنبيهاته. (الوردة البوصلية وأثر الفرجار حُذفا في الأمر نفسه.)
 * الصفحة نفسها تبقى
 * على /blueprint أيضًا — تسجيلان لمساعد واحد، فلا ازدواج كود.
 */
import { createFileRoute } from "@tanstack/react-router";
import { BlueprintPage } from "./-blueprint-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SADEED AI — سَدِيد" },
      {
        name: "description",
        content:
          "SADEED AI — مركز قيادة تنفيذي موحّد للأمن الصناعي يعرض مؤشرات المناطق الأربع ويربطها بالتقارير والمخاطر ومنصة عمليات الوكلاء والمساعد التنفيذي سَدِيد.",
      },
      { property: "og:title", content: "SADEED AI" },
      {
        property: "og:description",
        content: "منظومة القرار والإنجاز الذكي للأمن الصناعي والتحول الرقمي.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: BlueprintPage,
});
