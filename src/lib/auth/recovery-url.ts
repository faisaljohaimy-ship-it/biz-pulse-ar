/**
 * هل الرابط عائدٌ من رسالة استعادة كلمة المرور؟ ملفٌّ بلا أي استيراد عمدًا: يُحمَّل مع الجذر
 * (`auth-context.tsx`) فلا يجرّ معه نماذج التسجيل ولا غيرها إلى الحزمة الأولى.
 */
export function isRecoveryUrl(href: string): boolean {
  try {
    const url = new URL(href, "https://origin.invalid");
    if (url.searchParams.get("mode") === "reset") return true;
    return new URLSearchParams(url.hash.replace(/^#/, "")).get("type") === "recovery";
  } catch {
    return false;
  }
}
