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
  "app.name": { ar: "نكسس — نظام التشغيل الذكي", en: "Nexus AI OS" },
  "app.tagline": {
    ar: "مركز القيادة الذكية للمؤسسات",
    en: "Intelligent command for enterprises",
  },
  "nav.dashboard": { ar: "مركز القيادة", en: "Command Center" },
  "nav.analytics": { ar: "التحليلات", en: "Analytics" },
  "nav.assistant": { ar: "المساعد الذكي", en: "AI Assistant" },
  "nav.agents": { ar: "الوكلاء الذكيون", en: "AI Agents" },
  "nav.tasks": { ar: "مدير المهام", en: "Task Manager" },
  "nav.files": { ar: "مركز الملفات", en: "File Center" },
  "nav.voice": { ar: "المساعد الصوتي", en: "Voice Assistant" },
  "nav.tts": { ar: "النص إلى صوت", en: "Text to Speech" },
  "nav.marketplace": { ar: "متجر الأدوات", en: "Tools Marketplace" },
  "nav.knowledge": { ar: "قاعدة المعرفة", en: "Knowledge Base" },
  "nav.workflows": { ar: "أتمتة سير العمل", en: "Workflows" },
  "nav.prompts": { ar: "مكتبة الأوامر", en: "Prompt Library" },
  "nav.team": { ar: "الفريق", en: "Team" },
  "nav.admin": { ar: "لوحة الإدارة", en: "Admin Panel" },
  "nav.settings": { ar: "الإعدادات", en: "Settings" },
  "nav.group.workspace": { ar: "مساحة العمل", en: "Workspace" },
  "nav.group.executive": { ar: "التنفيذي", en: "Executive" },
  "nav.group.enterprise": { ar: "المؤسسة", en: "Enterprise" },
  "nav.group.intelligence": { ar: "الذكاء", en: "Intelligence" },
  "nav.group.collab": { ar: "التعاون", en: "Collaboration" },
  "nav.group.admin": { ar: "الإدارة", en: "Administration" },
  "nav.briefing": { ar: "موجز التنفيذيين", en: "Executive Briefing" },
  "nav.chief": { ar: "رئيس المستشارين", en: "Chief of Staff" },
  "nav.twin": { ar: "التوأم الرقمي", en: "Digital Twin" },
  "nav.integrations": { ar: "مركز التكاملات", en: "Integrations Center" },
  "nav.aiops": { ar: "عمليات الذكاء", en: "AI Operations" },
  "nav.orchestration": { ar: "تنسيق العمليات", en: "Orchestration" },
  "nav.intelligence": { ar: "ذكاء القرارات", en: "Decision Intelligence" },
  "nav.boardroom": { ar: "قاعة المجلس", en: "Boardroom" },
  "theme.toggle": { ar: "الوضع", en: "Theme" },
  "common.coming_soon": { ar: "قريباً", en: "Coming soon" },
  "common.new": { ar: "جديد", en: "New" },
  "common.save": { ar: "حفظ", en: "Save" },
  "common.cancel": { ar: "إلغاء", en: "Cancel" },
  "common.delete": { ar: "حذف", en: "Delete" },
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
  "dashboard.title": { ar: "مركز القيادة الذكي", en: "AI Command Center" },
  "dashboard.subtitle": {
    ar: "نظرة شاملة على أداء المؤسسة مدعومة بالذكاء الاصطناعي",
    en: "AI-driven view of your enterprise in real time",
  },
  "dashboard.greeting": { ar: "مرحباً", en: "Welcome" },
  "dashboard.status_live": { ar: "متصل مباشرة", en: "Live" },
  "dashboard.ask_placeholder": {
    ar: "اسأل المساعد عن أي شيء — تقرير، تحليل، توقع...",
    en: "Ask the assistant anything — report, analysis, forecast...",
  },
  "dashboard.suggestion_1": { ar: "لخّص أداء الربع الحالي", en: "Summarize this quarter's performance" },
  "dashboard.suggestion_2": { ar: "ما أكبر فرص النمو؟", en: "What are the biggest growth opportunities?" },
  "dashboard.suggestion_3": { ar: "حلّل سلوك المستخدمين", en: "Analyze user behavior trends" },
  "dashboard.open_assistant": { ar: "افتح المساعد", en: "Open Assistant" },
  "dashboard.insights": { ar: "أهم الإشارات الذكية", en: "Top AI signals" },
  "dashboard.insight_1_t": { ar: "نمو غير مسبوق في القطاع الرقمي", en: "Record growth in the digital segment" },
  "dashboard.insight_1_d": {
    ar: "ارتفع تبني الذكاء الاصطناعي بنسبة 24٪ هذا الشهر.",
    en: "AI adoption is up 24% this month.",
  },
  "dashboard.insight_2_t": { ar: "انخفاض في معدل التحويل", en: "Conversion dip detected" },
  "dashboard.insight_2_d": {
    ar: "تراجع طفيف بنسبة 1.2٪ — يُنصح بمراجعة المسار.",
    en: "Down 1.2% — funnel review recommended.",
  },
  "dashboard.insight_3_t": { ar: "فرصة تحسين الكفاءة", en: "Efficiency opportunity" },
  "dashboard.insight_3_d": {
    ar: "أتمتة 8 سير عمل يمكن أن توفر ~120 ساعة شهرياً.",
    en: "Automating 8 flows could save ~120 hours/month.",
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
  "assistant.model": { ar: "النموذج", en: "Model" },
  "assistant.sugg_1": { ar: "لخّص آخر تقرير ربعي", en: "Summarize the latest quarterly report" },
  "assistant.sugg_2": { ar: "اقترح 3 مبادرات لزيادة الإيرادات", en: "Suggest 3 initiatives to grow revenue" },
  "assistant.sugg_3": { ar: "حلّل أداء الفرق هذا الشهر", en: "Analyze team performance this month" },
  "assistant.sugg_4": { ar: "اكتب رسالة تنفيذية للمساهمين", en: "Draft an executive note to shareholders" },
  "common.loading": { ar: "جارٍ التحميل...", en: "Loading..." },
  "common.search": { ar: "بحث", en: "Search" },
  "common.error": { ar: "حدث خطأ", en: "Something went wrong" },
  "lang.toggle": { ar: "EN", en: "ع" },
  "lang.label": { ar: "اللغة", en: "Language" },
};

type Ctx = { locale: Locale; t: (k: string) => string; setLocale: (l: Locale) => void };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

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
