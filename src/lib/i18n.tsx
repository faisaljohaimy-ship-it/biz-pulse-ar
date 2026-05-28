import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Locale = "ar" | "en";

type Dict = Record<string, { ar: string; en: string }>;

const dict: Dict = {
  "app.name": { ar: "نظام التشغيل الذكي", en: "AI Operating System" },
  "app.tagline": {
    ar: "منصة المؤسسة الذكية للقيادة التنفيذية",
    en: "Enterprise intelligence for executive leaders",
  },
  "nav.dashboard": { ar: "لوحة القيادة", en: "Dashboard" },
  "nav.analytics": { ar: "التحليلات", en: "Analytics" },
  "nav.assistant": { ar: "المساعد الذكي", en: "AI Assistant" },
  "nav.settings": { ar: "الإعدادات", en: "Settings" },
  "auth.signin": { ar: "تسجيل الدخول", en: "Sign in" },
  "auth.signup": { ar: "إنشاء حساب", en: "Sign up" },
  "auth.signout": { ar: "تسجيل الخروج", en: "Sign out" },
  "auth.email": { ar: "البريد الإلكتروني", en: "Email" },
  "auth.password": { ar: "كلمة المرور", en: "Password" },
  "auth.name": { ar: "الاسم", en: "Full name" },
  "auth.have_account": { ar: "لديك حساب؟", en: "Have an account?" },
  "auth.no_account": { ar: "ليس لديك حساب؟", en: "No account?" },
  "auth.welcome": { ar: "مرحباً بعودتك", en: "Welcome back" },
  "auth.create_account": { ar: "أنشئ حسابك", en: "Create your account" },
  "dashboard.title": { ar: "لوحة القيادة التنفيذية", en: "Executive Dashboard" },
  "dashboard.subtitle": {
    ar: "نظرة شاملة على أداء المؤسسة في الوقت الفعلي",
    en: "Real-time view of enterprise performance",
  },
  "kpi.revenue": { ar: "الإيرادات", en: "Revenue" },
  "kpi.users": { ar: "المستخدمون النشطون", en: "Active users" },
  "kpi.conversion": { ar: "معدل التحويل", en: "Conversion" },
  "kpi.ai_calls": { ar: "استدعاءات الذكاء الاصطناعي", en: "AI calls" },
  "chart.revenue_title": { ar: "الإيرادات الشهرية", en: "Monthly revenue" },
  "chart.activity_title": { ar: "نشاط المنصة", en: "Platform activity" },
  "assistant.title": { ar: "المساعد التنفيذي الذكي", en: "Executive AI Assistant" },
  "assistant.empty": {
    ar: "اسأل عن أداء المؤسسة، أو اطلب تقريراً، أو حلل بياناتك.",
    en: "Ask about performance, request a report, or analyze your data.",
  },
  "assistant.placeholder": {
    ar: "اطرح سؤالاً على المساعد...",
    en: "Ask your assistant...",
  },
  "assistant.new": { ar: "محادثة جديدة", en: "New chat" },
  "assistant.threads": { ar: "المحادثات", en: "Conversations" },
  "assistant.delete": { ar: "حذف", en: "Delete" },
  "common.loading": { ar: "جارٍ التحميل...", en: "Loading..." },
  "common.search": { ar: "بحث", en: "Search" },
  "common.error": { ar: "حدث خطأ", en: "Something went wrong" },
  "lang.toggle": { ar: "EN", en: "ع" },
  "lang.label": { ar: "اللغة", en: "Language" },
};

type Ctx = { locale: Locale; t: (k: string) => string; setLocale: (l: Locale) => void };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("locale")) as Locale | null;
    if (stored === "ar" || stored === "en") setLocaleState(stored);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem("locale", l);
  };

  const t = (k: string) => dict[k]?.[locale] ?? k;
  return <I18nContext.Provider value={{ locale, t, setLocale }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}
