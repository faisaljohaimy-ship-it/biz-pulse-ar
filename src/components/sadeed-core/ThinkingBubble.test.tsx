/**
 * فقاعة «سَدِيد يفكّر…» — تقدّمٌ صادق بالزمن وحده (F7، ٢٠٢٦/١١/٠٣).
 *
 * مؤقّتات مزيَّفة. المراحل: الثانية ٥ يظهر العدّاد، ١٢ «ما زال يعمل»، ٢٥ «أطول
 * من المعتاد». المنطقة الحيّة تتبدّل عند تبدّل الرسالة فقط (لا كل ثانية)،
 * والنقاط لا ترتدّ إلا تحت `motion-safe`.
 *
 * وبداية القياس **ملكُ الأب** (`since`): الفقاعة تُفكَّك وتُركَّب في فاصل الإعادة
 * التلقائية، فكان العدّاد يبدأ من الصفر عند كل إعادة (المراجعة ٢٠٢٦/١١/٠٣). والقياس
 * بساعة رتيبة (`performance.now`) لا بساعة الجدار.
 */
import { act, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THINKING_AR, ThinkingBubble, autoRetryNoticeAr, type WaitSince } from "./ThinkingBubble";

// النصوص والثواني حرفيّةٌ عمدًا (نصّ المالك لا ثوابت الكود): من يبدّل نصًّا أو
// عتبةً يرى هذا الملف يحمرّ.
const WORKING_AR = "ما زال سَدِيد يعمل على ردّك — قد يستغرق بعض الأسئلة قرابة نصف دقيقة";
const SLOW_AR = "يستغرق أطول من المعتاد — يمكنك إيقاف الطلب أو الانتظار";

function mount(props: { retry?: number; gap?: boolean; since?: WaitSince } = {}) {
  const since = props.since ?? { current: null };
  const bubble = (p: { retry?: number; gap?: boolean }) => (
    <ul>
      <ThinkingBubble retry={p.retry ?? 0} gap={p.gap} since={since} />
    </ul>
  );
  const view = render(bubble(props));
  return {
    ...view,
    since,
    again: (p: { retry?: number; gap?: boolean }) => view.rerender(bubble(p)),
  };
}
const elapse = (seconds: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(seconds * 1000);
  });
const live = () => screen.getByRole("status");

describe("ThinkingBubble — تقدّم صادق بالزمن", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("اللحظة صفر: «سَدِيد يفكّر…» بلا عدّاد", () => {
    mount();
    expect(live()).toHaveTextContent(THINKING_AR);
    expect(screen.queryByText(/\d+ ث/)).not.toBeInTheDocument();
  });

  it("العدّاد يظهر عند الثانية ٥ لا قبلها، ويعدّ بالثواني المنقضية", async () => {
    mount();
    await elapse(4);
    expect(screen.queryByText(/\d+ ث/)).not.toBeInTheDocument();
    await elapse(1);
    expect(screen.getByText("5 ث")).toBeInTheDocument();
    await elapse(3);
    expect(screen.getByText("8 ث")).toBeInTheDocument();
    // ما زالت الرسالة الأولى.
    expect(live()).toHaveTextContent(THINKING_AR);
  });

  it("الثانية ١٢: «ما زال سَدِيد يعمل على ردّك — قد يستغرق بعض الأسئلة قرابة نصف دقيقة»", async () => {
    mount();
    await elapse(11);
    expect(live()).toHaveTextContent(THINKING_AR);
    await elapse(1);
    expect(live()).toHaveTextContent(WORKING_AR);
    expect(live().textContent).toContain("ما زال");
    expect(live().textContent).toContain("قرابة نصف دقيقة");
    // لا تنسب البطء إلى «نوع السؤال»: العميل لا يعرفه (المراجعة ٢٠٢٦/١١/٠٣).
    expect(live().textContent).not.toMatch(/التحليلية|حتى نصف/);
  });

  it("الثانية ٢٥: «يستغرق أطول من المعتاد — يمكنك إيقاف الطلب أو الانتظار»", async () => {
    mount();
    await elapse(24);
    expect(live()).toHaveTextContent(WORKING_AR);
    await elapse(1);
    expect(live()).toHaveTextContent(SLOW_AR);
    expect(live().textContent).toContain("إيقاف الطلب");
    // لا ادّعاء مرحلةٍ خادمية: لا «يقرأ/يبحث/يحلّل البيانات» في أيٍّ من النصوص.
    for (const text of [THINKING_AR, WORKING_AR, SLOW_AR]) {
      expect(text).not.toMatch(/يقرأ|يبحث|يتحقق|يصوغ|مرحلة/);
    }
  });

  it("المنطقة الحيّة مهذّبة ولا تتبدّل كل ثانية: ثلاث رسائل فقط في دورٍ من ٣٠ ث", async () => {
    mount();
    const region = live();
    expect(region).toHaveAttribute("aria-live", "polite");
    const seen: string[] = [region.textContent ?? ""];
    const observer = new MutationObserver(() => {
      const t = live().textContent ?? "";
      if (seen[seen.length - 1] !== t) seen.push(t);
    });
    observer.observe(region, { childList: true, characterData: true, subtree: true });
    for (let s = 0; s < 30; s++) await elapse(1);
    // مراقب المنطقة نفسها: العدّاد خارجها فلا يُعلَن، والنصّ يتبدّل مرّتين فوق الأولى.
    await Promise.resolve();
    observer.disconnect();
    expect(seen).toEqual([THINKING_AR, WORKING_AR, SLOW_AR]);
    // العدّاد مخفيّ عن قارئ الشاشة، وخارج المنطقة الحيّة.
    const counter = screen.getByText("30 ث");
    expect(counter).toHaveAttribute("aria-hidden", "true");
    expect(region).not.toContainElement(counter);
  });

  it("إشعار الإعادة التلقائية في النص (لا في الصوت وحده) ثم يُستبدل بمراحل الانتظار", async () => {
    mount({ retry: 1 });
    expect(live()).toHaveTextContent(autoRetryNoticeAr(1));
    expect(live().textContent).toContain("(1/2)");
    await elapse(12);
    expect(live()).toHaveTextContent(WORKING_AR);
  });

  it("بداية القياس ملك الأب: تفكيك الفقاعة وتركيبها لا يصفّر العدّاد ولا المراحل", async () => {
    const since: WaitSince = { current: null };
    const first = mount({ since });
    await elapse(10);
    expect(screen.getByText("10 ث")).toBeInTheDocument();
    first.unmount();

    // فاصل الإعادة التلقائية: لا فقاعة ثانيتين، ثم تُركَّب نسخةٌ جديدة.
    await elapse(2);
    mount({ since });
    // فورًا — لا انتظار نبضة — يظهر الزمن الكلي لا صفر.
    expect(screen.getByText("12 ث")).toBeInTheDocument();
    expect(live()).toHaveTextContent(WORKING_AR);
    // ومرحلة ٢٥ ث تبلغ في ١٣ ث لاحقة لا في ٢٥ ث من التركيب الثاني.
    await elapse(13);
    expect(screen.getByText("25 ث")).toBeInTheDocument();
    expect(live()).toHaveTextContent(SLOW_AR);
  });

  it("تصفير الأب (`since.current = null`) يبدأ انتظارًا جديدًا", async () => {
    const { since } = mount();
    await elapse(10);
    expect(screen.getByText("10 ث")).toBeInTheDocument();

    since.current = null;
    // النبضة التالية تضبط البداية الجديدة ثم يعدّ من الصفر.
    await elapse(1);
    expect(screen.queryByText(/\d+ ث/)).not.toBeInTheDocument();
    expect(live()).toHaveTextContent(THINKING_AR);
    await elapse(5);
    expect(screen.getByText("5 ث")).toBeInTheDocument();
  });

  it("ساعة رتيبة: تعديل ساعة الجدار لا يعطي ثواني سالبة ولا قفزات", async () => {
    mount();
    await elapse(6);
    expect(screen.getByText("6 ث")).toBeInTheDocument();

    // الجهاز يُرجع ساعته ساعةً كاملة (ضبط يدوي أو مزامنة شبكة).
    vi.setSystemTime(Date.now() - 3_600_000);
    await elapse(2);
    expect(screen.getByText("8 ث")).toBeInTheDocument();

    // وللأمام: لا قفزة إلى «ما زال يعمل» قبل أوانها.
    vi.setSystemTime(Date.now() + 7_200_000);
    await elapse(1);
    expect(screen.getByText("9 ث")).toBeInTheDocument();
    expect(live()).toHaveTextContent(THINKING_AR);
  });

  it("الفاصل بين محاولتين: إشعار الإعادة مهما طال الانتظار الكلّي، ولا «إيقاف الطلب»", async () => {
    const { again } = mount({
      retry: 1,
      gap: true,
      since: { current: performance.now() - 40_000 },
    });
    // ٤٠ ث منقضية، لكن الطلب انتهى فعلًا: لا «يمكنك إيقاف الطلب» (لا طلب يُوقَف).
    expect(live()).toHaveTextContent(autoRetryNoticeAr(1));
    expect(screen.getByText("40 ث")).toBeInTheDocument();
    expect(live().textContent).not.toContain("إيقاف الطلب");

    // الإعادة انطلقت: تعود مراحل الانتظار على الزمن الكلّي.
    again({ retry: 1, gap: false });
    expect(live()).toHaveTextContent(SLOW_AR);
  });

  it("العدّاد لا ينكمش ولا يلتفّ على لوحة ضيقة (shrink-0 whitespace-nowrap)", async () => {
    mount();
    await elapse(6);
    const counter = screen.getByText("6 ث");
    expect(counter.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["shrink-0", "whitespace-nowrap"]),
    );
  });

  it("الإزالة تنظّف المؤقّت (لا تسريب)", async () => {
    const { unmount } = mount();
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("تقليل الحركة: النقاط لا ترتدّ إلا تحت motion-safe (لا animate-bounce عارٍ)", () => {
    const { container } = mount();
    const dots = container.querySelectorAll("span.rounded-full");
    expect(dots).toHaveLength(3);
    for (const dot of dots) {
      expect(dot.className).toContain("motion-safe:animate-bounce");
      expect(dot.className.split(/\s+/)).not.toContain("animate-bounce");
    }
  });

  it("بلا مخالفات وصولية في أي مرحلة", async () => {
    vi.useRealTimers();
    const { container } = mount({ retry: 1 });
    expect(await axe(container)).toHaveNoViolations();
  });
});
