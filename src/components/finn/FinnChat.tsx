/**
 * واجهة محادثة فِن — بطاقةٌ واحدة بارتفاعٍ مقيس: الترويسة والشريط التحذيري ثابتان
 * في أعلاها، والرسائل تتمرّر داخلها، والكتابة ثابتة في أسفلها.
 *
 * **ثباتٌ بالتخطيط لا بـ`sticky`**: سلف الصفحة `overflow-x` فيصير `sticky` ملصقًا
 * بما لا يتمرّر (درس الشريط العلوي في CLAUDE.md). فالبطاقة عمودٌ مرن بارتفاعٍ محسوب،
 * وما يتمرّر منها صندوق الرسائل وحده — والصفحة لا تسكرول أفقيًّا أبدًا.
 *
 * الحالات: فارغة (بدايات سريعة) · انتظار (فِن يفكّر — محدودٌ بمهلة الخادم) · خطأ عربي
 * بإعادة محاولة · ومؤشر جاهزية المحرّكين صادق (منطقيّات الخادم، لا قياس اتصال).
 * المحادثة في ذاكرة الصفحة وحدها. لا صوت ولا TTS.
 *
 * هذا الملف يُحمَّل كسولًا (`React.lazy` في الصفحة) فلا يدخل Markdown ولا هذه الواجهة
 * في أي حزمة لغير من يفتح `/finn`.
 */
import {
  CircleCheck,
  OctagonAlert,
  Plus,
  RotateCw,
  SquareTerminal,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  describeFinnReadiness,
  FINN_COPY,
  FINN_STARTERS,
  type FinnReadiness,
} from "@/lib/finn-agent/copy";
import type { FinnEngineStatus } from "@/lib/finn-agent/status";
import { FinnBanner } from "./FinnBanner";
import { FinnComposer } from "./FinnComposer";
import { FinnMessage } from "./FinnMessage";
import { useFinnChat } from "./use-finn-chat";

const TONE_ICON = { ok: CircleCheck, warn: TriangleAlert, off: OctagonAlert } as const;
const TONE_COLOR: Record<FinnReadiness["tone"], string> = {
  ok: "text-[color:var(--tone-emerald)]",
  warn: "text-[color:var(--tone-amber)]",
  off: "text-[color:var(--tone-rose)]",
};

function ReadinessChip({ engine }: { engine: FinnEngineStatus }) {
  const readiness = describeFinnReadiness(engine);
  const Icon = TONE_ICON[readiness.tone];
  return (
    <p
      data-finn-readiness={readiness.tone}
      title={readiness.detail}
      className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[color:var(--chip)] px-2.5 text-[12px] font-semibold text-[color:var(--ink)]"
    >
      <Icon aria-hidden className={`size-3.5 shrink-0 ${TONE_COLOR[readiness.tone]}`} />
      <span className="truncate">{readiness.label}</span>
      <span className="sr-only">. {readiness.detail}</span>
    </p>
  );
}

export default function FinnChat({ engine }: { engine: FinnEngineStatus }) {
  const { messages, status, error, send, retry, stop, reset } = useFinnChat();
  const [draft, setDraft] = useState("");
  const [focusSignal, setFocusSignal] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const busy = status !== "idle";

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    // يلاحق آخر الردّ ما دام المالك قريبًا من القاع؛ إن صعد يقرأ لا يُسحب.
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, status, error]);

  const submit = () => {
    const text = draft;
    if (!text.trim() || busy) return;
    setDraft("");
    stick.current = true;
    void send(text);
  };

  const lastIndex = messages.length - 1;

  return (
    <section
      dir="rtl"
      aria-label={FINN_COPY.title}
      className="mx-auto w-full max-w-4xl px-3 py-3 md:px-6 md:py-5"
    >
      <div
        // ارتفاعٌ محسوب من رموز القشرة (الشريط العلوي + صفّ الترويسة) مع أرضيةٍ تُبقي
        // الحقل مستعملًا على الشاشات القصيرة (تسكرول الصفحة عندها عموديًّا فقط).
        className="flex h-[calc(100dvh-var(--nx-topbar-total,2.5rem)-var(--nx-hdr-h,64px)-2.5rem)] min-h-[30rem] flex-col overflow-hidden rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] shadow-[var(--nx-card-shadow)]"
      >
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full border border-[color:var(--hairline)] bg-[color:var(--chip)]">
            <SquareTerminal aria-hidden className="size-5 text-[color:var(--tone-blue)]" />
          </span>
          {/* العنوان لا يُقصّ على الجوال: الإجراءات تنزل إلى صفٍّ ثانٍ (`basis-full`) بدل أن
              تعصر الوصف إلى «مسا…» (قِيس على 390). فوق sm تعود إلى جانب العنوان. */}
          <div className="min-w-[9rem] flex-1">
            <h1 className="text-lg font-bold leading-tight text-[color:var(--ink)]">
              {FINN_COPY.title}
            </h1>
            <p className="text-[13px] leading-5 text-[color:var(--ink-2)]">{FINN_COPY.subtitle}</p>
          </div>
          <div className="flex basis-full flex-wrap items-center gap-2 sm:basis-auto">
            <ReadinessChip engine={engine} />
            <button
              type="button"
              onClick={() => {
                reset();
                setDraft("");
                setFocusSignal((n) => n + 1);
              }}
              disabled={messages.length === 0 && !busy}
              className="nx-focus-ring inline-flex min-h-11! items-center gap-2 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--chip)] px-3 text-[14px] font-semibold text-[color:var(--ink)] hover:bg-[color:var(--chip-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus aria-hidden className="size-4" />
              {FINN_COPY.newChat}
            </button>
          </div>
        </header>

        {/* الشريط الثابت: خارج منطقة التمرير فلا يغيب. */}
        <FinnBanner />

        <div
          ref={scroller}
          onScroll={onScroll}
          role="log"
          aria-label={FINN_COPY.conversationLabel}
          aria-busy={busy}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4"
        >
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-xl flex-col items-center gap-3 py-6 text-center">
              <h2 className="text-xl font-bold text-[color:var(--ink)]">{FINN_COPY.emptyTitle}</h2>
              <p className="text-[14px] leading-7 text-[color:var(--ink-2)]">
                {FINN_COPY.emptyHint}
              </p>
              <div className="mt-2 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {FINN_STARTERS.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => {
                      // لا تمحو نصًّا كُتب أو لُصق قبلها (W5 #10): تُلحَق به.
                      setDraft((d) => (d.trim() ? `${d}\n\n${starter.prompt}` : starter.prompt));
                      setFocusSignal((n) => n + 1);
                    }}
                    className="nx-focus-ring min-h-11! rounded-xl border border-[color:var(--hairline)] bg-[color:var(--chip)] px-4 py-2.5 text-start text-[14px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[color:var(--chip-hover)]"
                  >
                    {starter.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <FinnMessage
                key={message.id}
                message={message}
                streaming={busy && index === lastIndex && message.role === "assistant"}
              />
            ))
          )}

          {error ? (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--tone-rose)] bg-[color-mix(in_srgb,var(--tone-rose)_10%,transparent)] px-4 py-3"
            >
              <OctagonAlert aria-hidden className="size-5 shrink-0 text-[color:var(--tone-rose)]" />
              <p className="min-w-0 flex-1 text-[14px] leading-6 text-[color:var(--ink)]">
                {error.message}
              </p>
              {error.kind !== "not_found" && error.kind !== "too_large" ? (
                <button
                  type="button"
                  onClick={() => {
                    retry();
                    // الزرّ يزول مع التنبيه فيسقط التركيز على <body> (WCAG 2.4.3): يُنقل
                    // إلى الحقل، وهو المسار نفسه الذي تستعمله «محادثة جديدة» (W5 #8).
                    setFocusSignal((n) => n + 1);
                  }}
                  className="nx-focus-ring inline-flex min-h-11! items-center gap-2 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--chip-strong)] px-3 text-[14px] font-semibold text-[color:var(--ink)] hover:bg-[color:var(--chip-hover)]"
                >
                  <RotateCw aria-hidden className="size-4" />
                  {FINN_COPY.retry}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <FinnComposer
          value={draft}
          onChange={setDraft}
          onSend={submit}
          onStop={stop}
          busy={busy}
          focusSignal={focusSignal}
        />
      </div>
    </section>
  );
}
