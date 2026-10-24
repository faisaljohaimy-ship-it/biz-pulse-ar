/** Display states only. Authorization stays in the existing server owner gate. */
export type FinnHomeState = "guest" | "checking" | "denied" | "error" | "owner";

export function finnHomeState(input: {
  signedIn: boolean;
  allowed?: boolean;
  failed?: boolean;
}): FinnHomeState {
  if (!input.signedIn) return "guest";
  // A failed refresh must never keep showing private chat from cached data.
  if (input.failed) return "error";
  if (input.allowed === true) return "owner";
  if (input.allowed === false) return "denied";
  return "checking";
}

/** Describes existing text-only capabilities, not a grant or a remote executor. */
export const FINN_HOME_CAPABILITIES = [
  { ar: "كتابة الكود ومراجعته", en: "Write and review code" },
  { ar: "تحليل الأخطاء المقدّمة", en: "Analyze supplied errors" },
  { ar: "تصميم خطط الأتمتة", en: "Design automation plans" },
] as const;
