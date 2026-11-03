/**
 * لوحة سَدِيد الحقيقية — تقدّمٌ صادق وإعادةٌ تلقائيةٌ ظاهرة وبلا إعادة على المهلة
 * (F1 + F7، ٢٠٢٦/١١/٠٣).
 *
 * تُصيَّر `SadeedCopilot` نفسها (لا نسخة منها) فوق `chat` مزيَّفة قابلة للتحريك
 * ومؤقّتات مزيَّفة، وتُفحص النتائج المرئية:
 *
 *  ① انتظارٌ طويل: الرسالة «ما زال سَدِيد يعمل…» عند ١٢ ث و«أطول من المعتاد»
 *    عند ٢٥ ث، وزرّ الإيقاف ظاهرٌ طوال الانتظار ويستدعي `chat.stop`.
 *  ② خطأٌ مؤقّت: إشعار «إعادة المحاولة تلقائيًا (١/٢)» في **النصّ**، ثم تُستدعى
 *    `regenerate` — لا وميض خطأ أحمر.
 *  ③ المهلة (`TimeoutError`): رسالة «استغرق الرد أطول من المعتاد» مع زرّ إعادة
 *    المحاولة اليدوي، و**لا** `regenerate` تلقائية مهما طال الوقت.
 *  ④ نفاد الإعادتين: يظهر الخطأ الحقيقي بزرّه، لا إشعارٌ عالق.
 *  ⑤ الاستمرارية (المراجعة ٢٠٢٦/١١/٠٣): العدّاد ومراحل ١٢/٢٥ ث تقيس انتظار المستخدم
 *     كلّه عبر الإعادة التلقائية (الفقاعة تُفكَّك وتُركَّب في الفاصل)، وتبدأ من الصفر
 *     عند كل هدوء: ردٌّ جاهز، إيقاف، خطأٌ نهائي، أو دورٌ جديد يبدأ في الفاصل.
 *  ⑥ دورٌ جديد في الفاصل: لا إشعار إعادةٍ على سؤالٍ لم يفشل، ولا إعادة تنطلق،
 *     وحصّة الإعادة كاملة للدور الجديد.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createElement, useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeChat = {
  messages: unknown[];
  status: "ready" | "submitted" | "streaming" | "error";
  error: Error | undefined;
  regenerate: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  sendMessage: ReturnType<typeof vi.fn>;
  setMessages: ReturnType<typeof vi.fn>;
};

const fake = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const holder = {
    chat: null as unknown as FakeChat,
    composerRef: { current: null as HTMLTextAreaElement | null },
    version: 0,
  };
  return {
    holder,
    listeners,
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    snapshot: () => holder.version,
  };
});

vi.mock("@/lib/sadeed-core/provider", () => ({
  useSadeedChat: () => {
    useSyncExternalStore(fake.subscribe, fake.snapshot, fake.snapshot);
    return { chat: fake.holder.chat, composerRef: fake.holder.composerRef };
  },
}));

// عدّاد إعادة رسم اللوحة: الزرّ في ترويستها يُعاد رسمه كلّما أُعيد رسم اللوحة.
const renders = vi.hoisted(() => ({ panel: 0 }));
vi.mock("@/components/sadeed/SadeedMuteToggle", () => ({
  SadeedMuteToggle: () => {
    renders.panel += 1;
    return null;
  },
}));

// ثقيلٌ بصريًّا ولا شأن له بهذا الحارس (فيديو، لوحات متحرّكة).
vi.mock("@/components/sadeed/SadeedVideoAvatar", () => ({ SadeedVideoAvatar: () => null }));
vi.mock("@/components/sadeed/SadeedSignatureBackdrop", () => ({
  SadeedSignatureBackdrop: () => null,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
  isSupabaseConfigured: true,
}));

import { CHAT_TIMEOUT_AR, CHAT_TIMEOUT_CODE } from "@/lib/sadeed-core/services/chat-error-text";
import { useSadeedStore } from "@/lib/sadeed-core/store";
import { SadeedCopilot } from "./SadeedCopilot";
import { THINKING_AR, autoRetryNoticeAr } from "./ThinkingBubble";

// نصّ المالك حرفيًّا — لا ثوابت الكود (راجع ThinkingBubble.test.tsx).
const WORKING_AR = "ما زال سَدِيد يعمل على ردّك — قد يستغرق بعض الأسئلة قرابة نصف دقيقة";
const SLOW_AR = "يستغرق أطول من المعتاد — يمكنك إيقاف الطلب أو الانتظار";

/** يحرّك حالة الدردشة المزيَّفة ويُعيد رسم اللوحة. */
function setChat(patch: Partial<FakeChat>) {
  act(() => {
    fake.holder.chat = { ...fake.holder.chat, ...patch };
    fake.holder.version += 1;
    for (const cb of fake.listeners) cb();
  });
}
const elapse = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
const errorOf = (message: string) => Object.assign(new Error(message), { name: "Error" });

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom لا يعرّف هذين: التمرير التلقائي للمحادثة وتشغيل وسائط اللوحة.
  Element.prototype.scrollTo = vi.fn();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
  );
  fake.holder.chat = {
    messages: [],
    status: "ready",
    error: undefined,
    regenerate: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    sendMessage: vi.fn(async () => {}),
    setMessages: vi.fn(),
  };
  fake.holder.version = 0;
  useSadeedStore.setState({ mode: "docked", voice: "idle", pageContext: null });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  useSadeedStore.setState({ mode: "collapsed" });
});

function renderPanel() {
  return render(createElement(SadeedCopilot));
}
const stopButton = () => screen.getByRole("button", { name: "إيقاف الرد" });

describe("انتظار طويل — تقدّم صادق وزرّ إيقاف", () => {
  it("12 ث ثم 25 ث تتبدّل الرسالة، والإيقاف ظاهر طوال الانتظار ويوقف فعلًا", async () => {
    renderPanel();
    setChat({ status: "submitted" });

    expect(screen.getByText(THINKING_AR)).toBeInTheDocument();
    expect(stopButton()).toBeInTheDocument();

    await elapse(6_000);
    expect(screen.getByText("6 ث")).toBeInTheDocument();
    expect(stopButton()).toBeInTheDocument();

    await elapse(6_000);
    expect(screen.getByText(WORKING_AR)).toBeInTheDocument();
    expect(stopButton()).toBeInTheDocument();

    await elapse(13_000);
    expect(screen.getByText(SLOW_AR)).toBeInTheDocument();
    expect(screen.getByText("25 ث")).toBeInTheDocument();
    expect(stopButton()).toBeInTheDocument();

    fireEvent.click(stopButton());
    expect(fake.holder.chat.stop).toHaveBeenCalledTimes(1);
  });

  it("عدّاد الثواني حالةُ الفقاعة وحدها: ثماني ثوانٍ من النبضات لا تعيد رسم اللوحة", async () => {
    renderPanel();
    const initial = renders.panel;
    setChat({ status: "submitted" });
    // المسبار حيّ: تغيّر حالة الدردشة يعيد رسم اللوحة فيرتفع العدّاد.
    expect(renders.panel).toBeGreaterThan(initial);
    await elapse(1_000);
    const before = renders.panel;
    await elapse(8_000);
    expect(screen.getByText("9 ث")).toBeInTheDocument();
    expect(renders.panel).toBe(before);
  });
});

describe("خطأ مؤقّت — إشعار الإعادة التلقائية في النصّ", () => {
  it("يظهر «إعادة المحاولة تلقائيًا (1/2)» بدل الخطأ الأحمر، ثم تُستدعى regenerate", async () => {
    renderPanel();
    setChat({ status: "error", error: errorOf(JSON.stringify({ error: "busy" })) });

    // الإشعار في النص، لا الخطأ الأحمر ولا زرّ «إعادة المحاولة».
    expect(screen.getByText(autoRetryNoticeAr(1))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /إعادة المحاولة/ })).not.toBeInTheDocument();
    expect(fake.holder.chat.regenerate).not.toHaveBeenCalled();

    await elapse(3_000);
    expect(fake.holder.chat.regenerate).toHaveBeenCalledTimes(1);

    // الإعادة جارية: الفقاعة نفسها تحمل الإشعار.
    setChat({ status: "submitted", error: undefined });
    expect(screen.getByText(autoRetryNoticeAr(1))).toBeInTheDocument();
  });

  it("بعد نفاد الإعادتين يظهر الخطأ الحقيقي بزرّه — لا إشعارٌ عالق", async () => {
    renderPanel();
    const err = errorOf(JSON.stringify({ error: "busy" }));
    for (const attempt of [1, 2]) {
      setChat({ status: "error", error: err });
      expect(screen.getByText(autoRetryNoticeAr(attempt))).toBeInTheDocument();
      await elapse(3_000);
      setChat({ status: "submitted", error: undefined });
    }
    expect(fake.holder.chat.regenerate).toHaveBeenCalledTimes(2);

    setChat({ status: "error", error: err });
    await elapse(10_000);
    expect(fake.holder.chat.regenerate).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(autoRetryNoticeAr(2))).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /إعادة المحاولة/ })).toBeInTheDocument();
  });
});

describe("مهلة العميل — رسالة صادقة وإعادة يدوية، بلا إعادة تلقائية", () => {
  it("TimeoutError ⇒ «استغرق الرد أطول من المعتاد» + زرّ إعادة، و`regenerate` لا تُستدعى", async () => {
    renderPanel();
    setChat({ status: "error", error: errorOf(CHAT_TIMEOUT_CODE) });

    expect(screen.getByText(CHAT_TIMEOUT_AR)).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: /إعادة المحاولة/ });
    expect(screen.queryByText(/تلقائيًا/)).not.toBeInTheDocument();

    await elapse(60_000);
    expect(fake.holder.chat.regenerate).not.toHaveBeenCalled();
    expect(screen.getByText(CHAT_TIMEOUT_AR)).toBeInTheDocument();

    // اليدويّة تعمل.
    fireEvent.click(retry);
    expect(fake.holder.chat.regenerate).toHaveBeenCalledTimes(1);
  });
});

describe("استمرارية الانتظار عبر الإعادة التلقائية — الفقاعة تُفكَّك وتُركَّب في الفاصل", () => {
  const busy = () => errorOf(JSON.stringify({ error: "busy" }));

  it("العدّاد والمراحل تقيس الانتظار كلّه: ٣٠ ث ثم خطأ مؤقّت ثم إعادة ⇒ لا صفر جديد", async () => {
    renderPanel();
    setChat({ status: "submitted" });
    await elapse(30_000);
    expect(screen.getByText("30 ث")).toBeInTheDocument();
    expect(screen.getByText(SLOW_AR)).toBeInTheDocument();

    // الفاصل: إشعار الإعادة (لا «يمكنك إيقاف الطلب» — لا طلب جارٍ) والعدّاد لم يُصفَّر.
    setChat({ status: "error", error: busy() });
    expect(screen.getByText(autoRetryNoticeAr(1))).toBeInTheDocument();
    expect(screen.queryByText(SLOW_AR)).not.toBeInTheDocument();
    expect(screen.getByText("30 ث")).toBeInTheDocument();

    await elapse(3_000);
    expect(fake.holder.chat.regenerate).toHaveBeenCalledTimes(1);
    // الإعادة جارية: الزمن الكلّي ٣٣ ث والمرحلة «أطول من المعتاد» فورًا لا بعد ٢٥ ث أخرى.
    setChat({ status: "submitted", error: undefined });
    expect(screen.getByText("33 ث")).toBeInTheDocument();
    expect(screen.getByText(SLOW_AR)).toBeInTheDocument();
    expect(stopButton()).toBeInTheDocument();
  });

  it("الردّ الجاهز يصفّر الانتظار: الدور التالي يبدأ من الصفر", async () => {
    renderPanel();
    setChat({ status: "submitted" });
    await elapse(20_000);
    expect(screen.getByText("20 ث")).toBeInTheDocument();

    setChat({ status: "ready" });
    setChat({ status: "submitted" });
    expect(screen.getByText(THINKING_AR)).toBeInTheDocument();
    expect(screen.queryByText(/\d+ ث/)).not.toBeInTheDocument();
    await elapse(2_000);
    expect(screen.queryByText(/\d+ ث/)).not.toBeInTheDocument();
  });

  it("الخطأ النهائي يصفّر الانتظار: الإعادة اليدوية تبدأ من الصفر لا من زمن الفشل", async () => {
    renderPanel();
    setChat({ status: "submitted" });
    await elapse(20_000);
    expect(screen.getByText("20 ث")).toBeInTheDocument();

    // مهلة العميل لا تُعاد تلقائيًّا ⇒ خطأ نهائي بزرّه.
    setChat({ status: "error", error: errorOf(CHAT_TIMEOUT_CODE) });
    fireEvent.click(screen.getByRole("button", { name: /إعادة المحاولة/ }));
    expect(fake.holder.chat.regenerate).toHaveBeenCalledTimes(1);

    setChat({ status: "submitted", error: undefined });
    expect(screen.getByText(THINKING_AR)).toBeInTheDocument();
    expect(screen.queryByText(/\d+ ث/)).not.toBeInTheDocument();
    await elapse(2_000);
    expect(screen.queryByText(/\d+ ث/)).not.toBeInTheDocument();
  });

  it("دورٌ جديد في فاصل الإعادة ⇒ لا إشعار ولا إعادة، والانتظار والحصّة من جديد", async () => {
    renderPanel();
    setChat({ status: "submitted" });
    await elapse(20_000);
    setChat({ status: "error", error: busy() });
    expect(screen.getByText(autoRetryNoticeAr(1))).toBeInTheDocument();

    // المستخدم يرسل سؤالًا آخر قبل أن تنطلق الإعادة (الفاصل ≥ 1.2 ث).
    await elapse(500);
    setChat({ status: "submitted", error: undefined });
    expect(screen.queryByText(autoRetryNoticeAr(1))).not.toBeInTheDocument();
    expect(screen.getByText(THINKING_AR)).toBeInTheDocument();

    // مؤقّت الإعادة أُلغي، والانتظار لا يرث ٢٠ ث السؤال السابق.
    await elapse(2_000);
    expect(fake.holder.chat.regenerate).not.toHaveBeenCalled();
    expect(screen.queryByText(/\d+ ث/)).not.toBeInTheDocument();
    expect(screen.queryByText(WORKING_AR)).not.toBeInTheDocument();

    // الدور الجديد يفشل بدوره: حصّته كاملة — الإعادة الأولى (1/2) لا الثانية.
    setChat({ status: "error", error: busy() });
    expect(screen.getByText(autoRetryNoticeAr(1))).toBeInTheDocument();
    await elapse(3_000);
    expect(fake.holder.chat.regenerate).toHaveBeenCalledTimes(1);
  });
});
