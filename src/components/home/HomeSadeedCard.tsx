/**
 * بطاقة «SADEED AI» — صدر الرئيسية يمينًا (≈ ٢/٧ من الصفّ، المواصفة §4.5)،
 * **كما رُسمت في مخطّط المالك** (قرار ٢٠٢٦/١٠/١٤ «طبق الصورة بحذافيرها»).
 *
 * التشريح كما في الصورة: الهوية والشارة والتحية بجانب الشخصية
 * (`SadeedStagePresence variant="compact"`)، ثم ستّ رقاقات في عمودين برموزها
 * الملوّنة، ثم صندوق كتابة أبيض: زرّ الإرسال الأزرق المستدير في البداية،
 * ومشبكٌ زخرفيّ بجوار النصّ، والإرفاق في نهاية الحقل.
 *
 * ## لوحة سَدِيد واحدة — والبطاقة تكلّمها بـ`useSadeed()` وحدها
 * لا وحدة كوبايلوت ولا دردشة ثانية هنا (المواصفة §3.8–3.9): كل سؤالٍ يفتح
 * اللوحة الواحدة (`open`) ويرسل عبر الدماغ الكانوني (`ask`). وما يحتاج إكمالًا
 * من المستخدم («تحليل حادث معين») يُفتح مسودّةً في صندوق اللوحة
 * (`open({ draft })`) لا سؤالًا ناقصًا يُرسَل. والإرفاق يفتح اللوحة حيث منتقي
 * الملفّات — لا منتقيَ ثانيًا هنا.
 *
 * ## «فتح كاميرات الموقع» رابطٌ لا سؤال
 * الرقاقة تقول «فتح»، وسَدِيد لا يفتح صفحات — فهي رابطٌ حقيقي إلى صفحة
 * الكاميرات (`/sec/cctv`) بالرسم نفسه، لا سؤالٌ يَعِد بما لا يفعله.
 *
 * ## الحضور صادق (المادة ٢٧)
 * «متصل الآن» لا تُكتب إلا حين يقول `‎/api/chat/health`‎ إن مزوّد الذكاء جاهز.
 * الفحص يُطلب هنا مباشرةً — نقطةٌ عامّة بلا مصادقة، تعيد قيمًا منطقية فقط —
 * لا عبر وحدة خدمة الدردشة (فتلك تجرّ حزمة الدردشة إلى مسار الدخول). وتعذّر
 * الفحص يُقال «تعذّر التحقق»، لا «متصل» ولا «منقطع».
 *
 * ## التحية بالاسم الأول وحده
 * من `full_name`/`name` في جلسة المستخدم نفسه — لا البريد (معرّفٌ لا اسم)،
 * ولا اسمٌ مخترَع. والزائر ومن لا اسم له: «مرحباً بك».
 *
 * ## الرموز رسمٌ لا حكم
 * رموز الرقاقات صورٌ ظلّية مملوءة بـ`currentColor` بفتحاتٍ مفرَّغة (لا تعبئة
 * بيضاء خام)، ولونها من رموز البطاقة في CSS: الأزرق للأسئلة، والأحمر لرقاقة
 * المخاطر وحدها كما رُسمت.
 */
import { useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Paperclip } from "lucide-react";
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

/* ── رموز الرقاقات كما رُسمت: صورٌ ظلّية 16×16 بفتحاتٍ مفرَّغة ─────────── */

type GlyphKind = "summary" | "risks" | "cameras" | "incident" | "improve" | "patrols";

/** حافظةٌ مستديرة بلسانٍ علوي — جسم رموز الحافظة الأربعة. */
const CLIPBOARD =
  "M4 2.2H5.2V1.7C5.2 1.1 5.6.7 6.2.7H9.8C10.4.7 10.8 1.1 10.8 1.7V2.2H12C13.1 2.2 13.9 3 13.9 4.1V13.8C13.9 14.9 13.1 15.6 12 15.6H4C2.9 15.6 2.1 14.9 2.1 13.8V4.1C2.1 3 2.9 2.2 4 2.2Z";

const GLYPHS: Record<GlyphKind, string> = {
  // حافظةٌ بثلاثة أسطر.
  summary: `${CLIPBOARD}M4.7 6.1H11.3V7.5H4.7ZM4.7 8.9H11.3V10.3H4.7ZM4.7 11.7H9.3V13.1H4.7Z`,
  // حافظةٌ بعلامة تنبيه.
  risks: `${CLIPBOARD}M7.2 5.2H8.8L8.5 10.2H7.5ZM8 11.4A.95.95 0 1 1 8 13.3A.95.95 0 1 1 8 11.4ZM4.6 13.9H11.4V14.6H4.6Z`,
  // كاميرا ويب: رأسٌ مستدير بعدسة، وعنقٌ وقاعدة.
  cameras:
    "M8 1A5.6 5.6 0 1 1 8 12.2A5.6 5.6 0 1 1 8 1ZM8 4A2.6 2.6 0 1 0 8 9.2A2.6 2.6 0 1 0 8 4ZM8 5.5A1.1 1.1 0 1 1 8 7.7A1.1 1.1 0 1 1 8 5.5ZM6.6 12.2H9.4V13.3H6.6ZM3.6 13.3H12.4C13 13.3 13.4 13.7 13.4 14.3V14.6C13.4 15.2 13 15.6 12.4 15.6H3.6C3 15.6 2.6 15.2 2.6 14.6V14.3C2.6 13.7 3 13.3 3.6 13.3Z",
  // مربّعٌ مستدير بحلقةٍ ونقطة.
  incident:
    "M4.6 1.4H11.4C13.1 1.4 14.6 2.9 14.6 4.6V11.4C14.6 13.1 13.1 14.6 11.4 14.6H4.6C2.9 14.6 1.4 13.1 1.4 11.4V4.6C1.4 2.9 2.9 1.4 4.6 1.4ZM8 3.9A4.1 4.1 0 1 0 8 12.1A4.1 4.1 0 1 0 8 3.9ZM8 5.3A2.7 2.7 0 1 1 8 10.7A2.7 2.7 0 1 1 8 5.3ZM8 6.9A1.1 1.1 0 1 0 8 9.1A1.1 1.1 0 1 0 8 6.9Z",
  // حافظةٌ ببيتٍ مفرَّغ — مقترحات التحسين.
  improve: `${CLIPBOARD}M8 4.9L12 8.3V13H4V8.3ZM8 6.7L10.5 8.9V11.6H5.5V8.9ZM8 8.6A.9.9 0 1 0 8 10.4A.9.9 0 1 0 8 8.6Z`,
  // حافظةٌ بدبّوس مسارٍ وخطّ — الدوريات.
  patrols: `${CLIPBOARD}M8 4.6C9.6 4.6 10.6 5.7 10.6 7.1C10.6 8.8 8.8 10.3 8 11C7.2 10.3 5.4 8.8 5.4 7.1C5.4 5.7 6.4 4.6 8 4.6ZM8 6.2A.9.9 0 1 0 8 8A.9.9 0 1 0 8 6.2ZM4.9 12.2H11.1V13.4H4.9Z`,
};

function ChipGlyph({ kind }: { kind: GlyphKind }) {
  return (
    <svg viewBox="0 0 16 16" focusable="false" aria-hidden className="nx-sd-chip-glyph">
      <path d={GLYPHS[kind]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/**
 * سهم الإرسال كما رُسم (مقيسٌ على المخطّط بمقياس 8×، بكسلٌ لكل وحدة عند
 * 20px): طائرةٌ ورقية من فوق نحو اليمين — جسمٌ مثلّثٌ كبير رأسه يمينًا، وذيلٌ
 * مثلّثٌ صغير رأسه يسارًا، بينهما شقٌّ قائم.
 */
function SendGlyph() {
  return (
    <svg viewBox="0 0 20 20" focusable="false" aria-hidden className="nx-sd-send-glyph">
      <path
        d="M8.3 1.7L19.5 9.3C20 9.7 20 10.3 19.5 10.7L8.3 18.3ZM.7 10L6.9 7.1V12.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ── الرقاقات الستّ — بترتيب الصورة (عمودان، يمينًا ثم يسارًا) ─────────── */

type QuickAction = {
  key: GlyphKind;
  ar: string;
  en: string;
  /** لون الرمز كما رُسم: الأحمر لرقاقة المخاطر وحدها. */
  tone: "blue" | "alarm";
} & (
  | { send: { ar: string; en: string } }
  /** سؤالٌ يكمله المستخدم: يُفتح مسودّةً في صندوق اللوحة ولا يُرسل. */
  | { draft: { ar: string; en: string } }
  /** رابطٌ إلى صفحة النظام نفسها — الرقاقة تقول «فتح». */
  | { to: "/sec/cctv" }
);

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: "summary",
    ar: "ملخص الحالة الأمنية",
    en: "Security status summary",
    tone: "blue",
    send: {
      ar: "أعطني ملخصًا موجزًا للحالة الأمنية اليوم.",
      en: "Give me a brief summary of today's security status.",
    },
  },
  {
    key: "risks",
    ar: "أبرز المخاطر اليوم",
    en: "Today's top risks",
    tone: "alarm",
    send: { ar: "ما أبرز المخاطر اليوم؟", en: "What are today's top risks?" },
  },
  {
    key: "cameras",
    ar: "فتح كاميرات الموقع",
    en: "Open site cameras",
    tone: "blue",
    to: "/sec/cctv",
  },
  {
    key: "incident",
    ar: "تحليل حادث معين",
    en: "Analyse a specific incident",
    tone: "blue",
    draft: { ar: "حلّل الحادث: ", en: "Analyse the incident: " },
  },
  {
    key: "improve",
    ar: "مقترحات تحسين",
    en: "Improvement suggestions",
    tone: "blue",
    send: {
      ar: "ما مقترحاتك لتحسين الجاهزية الأمنية؟",
      en: "What do you suggest to improve security readiness?",
    },
  },
  {
    key: "patrols",
    ar: "تقرير دوريات المنطقة",
    en: "Regional patrols report",
    tone: "blue",
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
  const hello = ar ? `مرحباً ${first ?? "بك"}` : first ? `Hello ${first}` : "Welcome";

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
        {/* التحية كما رُسمت: سطران في فقاعةٍ بيضاء الإطار. */}
        <p className="nx-sd-greeting">
          <span className="nx-sd-greeting-hello">{hello}</span>
          <span className="nx-sd-greeting-ask">
            {ar ? "كيف يمكنني مساعدتك اليوم ؟" : "How can I help you today?"}
          </span>
        </p>
      </SadeedStagePresence>

      <ul
        className="nx-sd-chips"
        aria-label={ar ? `أسئلة سريعة لـ${name}` : `Quick asks for ${name}`}
      >
        {QUICK_ACTIONS.map((a) => {
          const body = (
            <>
              <span aria-hidden className="nx-sd-chip-icon">
                <ChipGlyph kind={a.key} />
              </span>
              <span className="nx-sd-chip-label">{ar ? a.ar : a.en}</span>
            </>
          );
          return (
            <li key={a.key}>
              {"to" in a ? (
                <Link to={a.to} className="nx-sd-chip" data-tone={a.tone}>
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  className="nx-sd-chip"
                  data-tone={a.tone}
                  onClick={() => {
                    if ("draft" in a) {
                      open({ focus: true, draft: ar ? a.draft.ar : a.draft.en });
                      return;
                    }
                    open({ focus: true });
                    ask(ar ? a.send.ar : a.send.en);
                  }}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* شريط الكتابة كما رُسم: الإرسال في البداية (يمينًا)، ثم مشبكٌ
          زخرفيّ بجوار النصّ — داخل وسم الحقل فالنقر عليه يركّز الكتابة —
          ثم الحقل، والإرفاق في النهاية. وترتيب التنقّل هو ترتيب الرسم. */}
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
          <SendGlyph />
        </button>
        <label className="nx-sd-field">
          <span aria-hidden className="nx-sd-lead">
            <Paperclip />
          </span>
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
            placeholder={ar ? "اكتب سؤالك هنا …" : "Type your question here …"}
            className="nx-sd-input"
          />
        </label>
        <button
          type="button"
          className="nx-sd-attach"
          onClick={() => open({ focus: true })}
          aria-label={ar ? `أرفق ملفًّا في لوحة ${name}` : `Attach a file in the ${name} panel`}
          title={ar ? `أرفق ملفًّا في لوحة ${name}` : `Attach a file in the ${name} panel`}
        >
          <Paperclip aria-hidden />
        </button>
      </form>
    </section>
  );
}
