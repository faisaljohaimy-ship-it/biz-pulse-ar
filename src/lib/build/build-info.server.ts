/**
 * ختم البناء — أيّ commit يخدمه هذا العامل.
 *
 * `scripts/write-build-info.mjs` يكتب `public/build-info.json` قبل كل بناء
 * (‏`prebuild`)، وVite يدمجه هنا وقت البناء عبر `import.meta.glob`؛ غيابه (منشئٌ
 * لم يشغّل `npm run build`) يعطي `null` صادقًا لا خطأ استيراد (المادة ٢٧).
 * يقرؤه `/api/public/live` و`/api/public/health`، وفحص الإنتاج يحكم به مع
 * `expected_sha`.
 */
export type BuildInfo = {
  sha?: string;
  short?: string;
  ref?: string;
  builtAt?: string;
  source?: string;
  dirty?: boolean | null;
};

const BUILD_INFO_FILES = import.meta.glob("/public/build-info.json", {
  eager: true,
  import: "default",
}) as Record<string, BuildInfo | undefined>;

export const BUILD_INFO: BuildInfo | null = Object.values(BUILD_INFO_FILES)[0] ?? null;

/** الشكل المعروض في ردود الصحّة: ثابت الحقول، `null` حين لا ختم. */
export function buildStamp(): {
  sha: string;
  ref: string;
  built_at: string | null;
  source: string;
} | null {
  if (!BUILD_INFO) return null;
  return {
    sha: BUILD_INFO.sha ?? "unknown",
    ref: BUILD_INFO.ref ?? "unknown",
    built_at: BUILD_INFO.builtAt ?? null,
    source: BUILD_INFO.source ?? "unknown",
  };
}
