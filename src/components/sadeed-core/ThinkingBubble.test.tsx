/**
 * فقاعة «سَدِيد يفكّر…» — تقدّمٌ صادق بالزمن وحده (F7، ٢٠٢٦/١١/٠٣).
 *
 * مؤقّتات مزيَّفة. المراحل: الثانية ٥ يظهر العدّاد، ١٢ «ما زال يعمل»، ٢٥ «أطول
 * من المعتاد». المنطقة الحيّة تتبدّل عند تبدّل الرسالة فقط (لا كل ثانية)،
 * والنقاط لا ترتدّ إلا تحت `motion-safe`.
 */
import { act, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THINKING_AR, ThinkingBubble, autoRetryNoticeAr } from "./ThinkingBubble";

// النصوص والثواني حرفيّةٌ عمدًا (نصّ المالك لا ثوابت الكود): من يبدّل نصًّا أو
// عتبةً يرى هذا الملف يحمرّ.
const WORKING_AR = "ما زال سَدِيد يعمل — الأسئلة التحليلية قد تستغرق حتى نصف دقيقة";
const SLOW_AR = "يستغرق أطول من المعتاد — يمكنك إيقاف الطلب أو الانتظار";

function mount(props: { retry?: number } = {}) {
  return render(
    <ul>
      <ThinkingBubble retry={props.retry ?? 0} />
    </ul>,
  );
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

  it("الثانية ١٢: «ما زال سَدِيد يعمل — الأسئلة التحليلية قد تستغرق حتى نصف دقيقة»", async () => {
    mount();
    await elapse(11);
    expect(live()).toHaveTextContent(THINKING_AR);
    await elapse(1);
    expect(live()).toHaveTextContent(WORKING_AR);
    expect(live().textContent).toContain("ما زال");
    expect(live().textContent).toContain("حتى نصف دقيقة");
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
