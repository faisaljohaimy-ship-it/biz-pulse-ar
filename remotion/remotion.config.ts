/**
 * إعداد Remotion — أداة بناء عابرة، لا تدخل حزمة التطبيق.
 *
 * الغرض الوحيد: تمكين اسم المسار `@/…` داخل حزمة التصيير حتى تستورد
 * الأفلام مصادر التطبيق نفسها بدل أن تكرّرها — فالمناطق تُقرأ من
 * `src/lib/regions.ts` حصرًا، والأرقام من مولّد المحاكاة المرجعية نفسه
 * الذي تعرضه الصفحة (المادة ٢٧: لا رقم بلا مصدر).
 *
 * هذا الملف يُقرأ من `remotion/` عند تشغيل الـCLI منه، ويقتصر أثره على
 * حزمة التصيير: لا vite ولا eslint ولا tsconfig التطبيق يراه.
 */
import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.overrideWebpackConfig((current) => ({
  ...current,
  resolve: {
    ...current.resolve,
    alias: {
      ...(current.resolve?.alias ?? {}),
      "@": path.resolve(process.cwd(), "..", "src"),
    },
  },
}));
