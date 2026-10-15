/**
 * بطاقة «SADEED AI» — صدر الرئيسية يمينًا (≈ ٢/٧ من الصفّ، المواصفة §4.5).
 *
 * التشريح كما في الصورة: الوجه والعنوان والوصف وشارة الحضور
 * (`SadeedStagePresence variant="compact"`)، ثم التحية، ثم ستّ رقاقات أسئلة
 * في عمودين، ثم صندوق كتابة بزرّي الإرسال والإرفاق.
 *
 * ## لوحة سَدِيد واحدة — والبطاقة تكلّمها بـ`useSadeed()` وحدها
 * لا وحدة كوبايلوت ولا دردشة ثانية هنا (المواصفة §3.8–3.9): كل فعلٍ يفتح
 * اللوحة الواحدة (`open`) ويرسل عبر الدماغ الكانوني (`ask`). وما يحتاج إكمالًا
 * من المستخدم («حلّل حادثًا معيّنًا») يُفتح مسودّةً في صندوق اللوحة
 * (`open({ draft })`) لا سؤالًا ناقصًا يُرسَل. والإرفاق يفتح اللوحة حيث منتقي
 * الملفّات — لا منتقيَ ثانيًا هنا.
 *
 * ## الحضور صادق (المادة ٢٧)
 * «متصل الآن» لا تُكتب إلا حين يقول `‎/api/chat/health`‎ إن مزوّد الذكاء جاهز.
 * الفحص يُطلب هنا مباشرةً — نقطةٌ عامّة بلا مصادقة، تعيد قيمًا منطقية فقط —
 * لا عبر وحدة خدمة الدردشة (فتلك تجرّ حزمة الدردشة إلى مسار الدخول). وتعذّر
 * الفحص يُقال «تعذّر التحقق»، لا «متصل» ولا «منقطع».
 *
 * ## التحية بالاسم الأول وحده
 * من `full_name`/`name` في جلسة المستخدم نفسه — لا البريد (معرّفٌ لا اسم)،
 * ولا اسمٌ مخترَع. والزائر ومن لا اسم له: «مرحبًا بك».
 */
import { useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Cctv,
  FileSearch,
  Lightbulb,
  Paperclip,
  Route as RouteIcon,
  SendHorizontal,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useSadeed } from "@/lib/sadeed-core/hooks/useSadeed";
import { SADEED_DISPLAY_NAME_AR_PLAIN, SADEED_DISPLAY_NAME_EN } from "@/lib/sadeed-core/branding";
import {
  SadeedStagePresence,
  type SadeedConnection,
} from "@/components/sadeed/SadeedStagePresence";
import "@/styles/home/home-sadeed.css";

/* ── الأسئلة السريعة الستّ — بترتيب الصورة (عمودان، يمينًا ثم يسارًا) ──── */

type QuickAction = {
  key: string;
  ar: string;
  en: string;
  icon: LucideIcon;
} & (
  | { send: { ar: string; en: string } }
  /** سؤالٌ يكمله المستخدم: يُفتح مسودّةً في صندوق اللوحة ولا يُرسل. */
  | { draft: { ar: string; en: string } }
);

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: "summary",
    ar: "ملخّص الحالة الأمنية",
    en: "Security status summary",
    icon: ClipboardList,
    send: {
      ar: "أعطني ملخّصًا موجزًا للحالة الأمنية اليوم.",
      en: "Give me a brief summary of today's security status.",
    },
  },
  {
    key: "risks",
    ar: "أبرز المخاطر اليوم",
    en: "Today's top risks",
    icon: ShieldAlert,
    send: { ar: "ما أبرز المخاطر اليوم؟", en: "What are today's top risks?" },
  },
  {
    key: "cameras",
    ar: "تتبّع كاميرات الموقع",
    en: "Track site cameras",
    icon: Cctv,
    send: {
      ar: "تتبّع حالة كاميرات المواقع وآخر تنبيهاتها.",
      en: "Track the status of site cameras and their latest alerts.",
    },
  },
  {
    key: "incident",
    ar: "حلّل حادثًا معيّنًا",
    en: "Analyse a specific incident",
    icon: FileSearch,
    draft: { ar: "حلّل الحادث: ", en: "Analyse the incident: " },
  },
  {
    key: "improve",
    ar: "اقتراحات تحسين",
    en: "Improvement suggestions",
    icon: Lightbulb,
    send: {
      ar: "ما اقتراحاتك لتحسين الجاهزية الأمنية؟",
      en: "What do you suggest to improve security readiness?",
    },
  },
  {
    key: "patrols",
    ar: "تقرير دوريات المنطقة",
    en: "Regional patrols report",
    icon: RouteIcon,
    send: {
      ar: "أعطني تقرير الدوريات في كل منطقة.",
      en: "Give me the patrols report for each region.",
    },
  },
];

/* ── فحص الصحّة — قيمٌ منطقية فقط، بمهلة ───────────────────────────────── */

/** مهلة الفحص: أربع ثوانٍ كمهلة قراءات العرض — بعدها «تعذّر التحقق». */
const HEALTH_TIMEOUT_MS = 4_000;

/**
 * يعيد `true` حين يبلغ الخادم بمزوّد ذكاءٍ جاهز، و`false` حين يكون حيًّا بلا
 * مزوّد، ويرمي حين يتعذّر الفحص. والجاهزية **OR عبر المفاتيح القادرة** —
 * الخادم يطويها في `key_present` ويسمّي المزوّد في `provider`، فأيّهما يكفي.
 */
async function readChatReady(signal: AbortSignal): Promise<boolean> {
  const ctrl = new AbortController();
  const stop = () => ctrl.abort();
  signal.addEventListener("abort", stop, { once: true });
  const timer = setTimeout(stop, HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch("/api/chat/health", {
      method: "GET",
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`chat health ${res.status}`);
    const body: unknown = await res.json();
    if (!body || typeof body !== "object") throw new Error("chat health: malformed");
    const j = body as { ok?: unknown; key_present?: unknown; provider?: unknown };
    if (j.ok !== true) throw new Error("chat health: not ok");
    return j.key_present === true || (typeof j.provider === "string" && j.provider.length > 0);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", stop);
  }
}

/* ── الاسم الأول — من اسم المستخدم نفسه لا من بريده ──────────────────── */

/** بادئاتٌ تصنع مع ما بعدها اسمًا أوّل واحدًا: «عبد الله» · «أبو بكر». */
const COMPOUND_FIRST = new Set(["عبد", "أبو", "ابو", "abd", "abdul", "abdel", "abu"]);

function firstNameOf(user: User | null): string | null {
  const meta = (user?.user_metadata ?? {}) as { full_name?: unknown; name?: unknown };
  const raw =
    typeof meta.full_name === "string" && meta.full_name.trim()
      ? meta.full_name
      : typeof meta.name === "string"
        ? meta.name
        : "";
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  // اسمٌ هو بريدٌ في حقيقته (يضعه بعض المزوّدين) معرّفٌ لا اسم — لا يُعرض.
  if (parts.length === 0 || parts[0].includes("@")) return null;
  if (parts.length > 1 && COMPOUND_FIRST.has(parts[0].toLowerCase())) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}

/* ── البطاقة ────────────────────────────────────────────────────────────── */

export function HomeSadeedCard() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { user, loading: authLoading } = useAuth();
  const { open, ask } = useSadeed();
  const name = ar ? SADEED_DISPLAY_NAME_AR_PLAIN : SADEED_DISPLAY_NAME_EN;

  // البوابة الوحيدة `!authLoading` كقراءات العرض. ولا إعادة صامتة: تعذّر
  // الفحص يُقال في الشارة نفسها (المادة ١٤)، والفحص التالي بعد دقيقتين.
  const health = useQuery({
    queryKey: ["home-chat-health"],
    queryFn: ({ signal }) => readChatReady(signal),
    enabled: !authLoading,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const connection: SadeedConnection = health.isError
    ? "unknown"
    : health.isPending
      ? "checking"
      : health.data
        ? "ready"
        : "local";

  const first = authLoading ? null : firstNameOf(user);
  const hello = ar
    ? first
      ? `مرحبًا ${first}،`
      : "مرحبًا بك،"
    : first
      ? `Hello ${first},`
      : "Welcome,";

  /* ── صندوق الكتابة ── */
  const [text, setText] = useState("");
  // التركيب بمحرّر الإدخال (IME): Enter التي تُثبّت الكلمة ليست إرسالًا.
  const composingRef = useRef(false);

  const send = () => {
    const prompt = text.trim();
    // صندوقٌ فارغ: الإرسال يفتح اللوحة جاهزةً للكتابة — لا سؤال فارغ.
    open({ focus: true });
    if (!prompt) return;
    ask(prompt);
    setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    // سفاري يطلق keydown بعد compositionend ورمزه 229 — فالثلاثة معًا.
    if (composingRef.current || e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    send();
  };

  return (
    <section
      aria-labelledby="nx-home-sadeed-title"
      // اتجاه اللغة على البطاقة: الصدر مرتّبٌ يسارًا ← يمينًا (D5) والنصّ عربيّ.
      dir={ar ? "rtl" : "ltr"}
      className="nx-home-panel nx-home-sadeed"
    >
      <SadeedStagePresence
        variant="compact"
        ar={ar}
        headingId="nx-home-sadeed-title"
        connection={connection}
      >
        <p className="nx-sd-greeting">
          <span className="nx-sd-greeting-hello">{hello}</span>
          <span className="nx-sd-greeting-ask">
            {ar ? "كيف يمكنني مساعدتك اليوم؟" : "How can I help you today?"}
          </span>
        </p>
      </SadeedStagePresence>

      <ul
        className="nx-sd-chips"
        aria-label={ar ? `أسئلة سريعة لـ${name}` : `Quick asks for ${name}`}
      >
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.key}>
              <button
                type="button"
                className="nx-sd-chip"
                onClick={() => {
                  if ("draft" in a) {
                    open({ focus: true, draft: ar ? a.draft.ar : a.draft.en });
                    return;
                  }
                  open({ focus: true });
                  ask(ar ? a.send.ar : a.send.en);
                }}
              >
                <span aria-hidden className="nx-sd-chip-icon">
                  <Icon />
                </span>
                <span className="nx-sd-chip-label">{ar ? a.ar : a.en}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* الإرسال في جهة البداية (يمينًا) والإرفاق في نهاية الحقل — كما في
          الصورة، وترتيب التنقّل بلوحة المفاتيح هو ترتيب الرسم نفسه. */}
      <form
        className="nx-sd-composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <button
          type="submit"
          className="nx-sd-send"
          aria-label={ar ? `أرسل السؤال إلى ${name}` : `Send the question to ${name}`}
          title={ar ? `أرسل السؤال إلى ${name}` : `Send the question to ${name}`}
        >
          <SendHorizontal aria-hidden />
        </button>
        <div className="nx-sd-field">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
            rows={1}
            enterKeyHint="send"
            aria-label={ar ? `اكتب سؤالك إلى ${name}` : `Write your question to ${name}`}
            placeholder={ar ? "اكتب سؤالك هنا…" : "Type your question here…"}
            className="nx-sd-input"
          />
          <button
            type="button"
            className="nx-sd-attach"
            onClick={() => open({ focus: true })}
            aria-label={ar ? `أرفق ملفًّا في لوحة ${name}` : `Attach a file in the ${name} panel`}
            title={ar ? `أرفق ملفًّا في لوحة ${name}` : `Attach a file in the ${name} panel`}
          >
            <Paperclip aria-hidden />
          </button>
        </div>
      </form>
    </section>
  );
}
