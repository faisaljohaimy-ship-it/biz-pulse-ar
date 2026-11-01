/**
 * إرفاق ملف في واجهة فِن (أمر المالك ٢٠٢٦/١٠/٣١) — سلوكٌ مُصيَّر في jsdom.
 *
 * الشبكتان مُحاكاتان كلّتاهما: ناقل المحادثة (`streamFinnReply`) و`authenticatedFetch` للاستيراد. فالذي يُفحص
 * هنا الواجهة وحدها: المشبك على المساحتين الكاملتين دون بطاقة الرئيسية، الفحص في العميل بلا طلب شبكة، المعاينة
 * ثم التأكيد بالملف نفسه والرمز، الأخطاء وإعادة المحاولة، الإلغاء بقطع الطلب، «محادثة جديدة» والمغادرة،
 * وأن **المحادثة لا تتأثر**: جسم طلبها يبقى `[{role,content}]` ولا يحوي حرفًا من الملف.
 */
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FinnReplyMeta, FinnTransportResult } from "@/lib/finn-agent/client";
import type { FinnEngineStatus } from "@/lib/finn-agent/status";

type Messages = ReadonlyArray<{ role: string; content: string }>;
const transport = vi.hoisted(() => ({ calls: [] as Messages[] }));
const net = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("@/lib/finn-agent/client", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  streamFinnReply: async (opts: {
    onMeta: (meta: FinnReplyMeta) => void;
    onDelta: (text: string) => void;
    messages: Messages;
  }): Promise<FinnTransportResult> => {
    transport.calls.push(opts.messages);
    opts.onMeta({ engine: "gpt", fallback: null });
    opts.onDelta("تم");
    return { ok: true, truncated: false };
  },
}));
vi.mock("@/lib/auth-fetch", () => ({
  authenticatedFetch: (...args: unknown[]) => net.fetch(...args),
}));

import { FINN_IMPORT_COPY } from "@/lib/finn-import/client";
import { FINN_IMPORT_ACCEPT, FINN_IMPORT_LIMITS } from "@/lib/finn-import/contract";
import FinnChat from "./FinnChat";
import { useFinnImport } from "./use-finn-import";

const ENGINE: FinnEngineStatus = { gpt: true, gptModel: "gpt-4.1", fallback: true, paused: false };

const PREVIEW = {
  ok: true,
  kind: "preview",
  file: { name: "orders.xlsx", kind: "xlsx", bytes: 2048 },
  sheets: [
    { name: "الأوامر", rows: 120, cols: 3, headers: ["رقم الأمر", "الموقع", "الحالة"] },
    { name: "Sheet2", rows: 7, cols: 2, headers: ["a", "b"] },
  ],
  totals: { rows_total: 127, rows_total_exact: true, rows_loaded: 127, parts: 1, truncated: false },
  pii: { id_numbers: 2, phones: 1, emails: 0, masked: true },
  warnings: [] as string[],
  token: "fixture-token-1",
  expires_at: "2026-10-31T12:00:00.000Z",
};
const DONE = {
  ok: true,
  kind: "done",
  documents: 2,
  status: "queued",
  message_ar: "x",
  partial: { total: 2, queued: 2, deduped: 0, failed: 0 },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const fmt = (n: number) => n.toLocaleString("ar-SA");
/** هل في النصّ محرفُ تحكّم أو قلب اتجاه أو عرضٍ صفريّ؟ (بالرقم لا بنمطٍ يحوي المحارف نفسها.) */
const hasHiddenChars = (text: string): boolean =>
  Array.from(text).some((ch) => {
    const c = ch.codePointAt(0) ?? 0;
    return (
      c < 32 ||
      (c >= 0x200b && c <= 0x200f) ||
      (c >= 0x202a && c <= 0x202e) ||
      (c >= 0x2060 && c <= 0x2069)
    );
  });
const file = (name = "orders.csv", body = "id,site\n1,A\n2,B\n") =>
  new File([body], name, { type: "text/csv" });

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;
const paperclip = () => screen.getByRole("button", { name: "إرفاق ملف" });
const card = () => screen.getByRole("region", { name: FINN_IMPORT_COPY.cardLabel });
const textbox = () => screen.getByRole("textbox", { name: /رسالتك إلى فِن/ });
const btn = (name: string | RegExp) => within(card()).getByRole("button", { name });

async function pick(f: File) {
  await act(async () => {
    fireEvent.change(fileInput(), { target: { files: [f] } });
  });
}
const click = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el);
  });
};
const form = (call: number) => (net.fetch.mock.calls[call][1] as RequestInit).body as FormData;
const signal = (call: number) =>
  (net.fetch.mock.calls[call][1] as RequestInit).signal as AbortSignal;

/** fetch معلّق يتحكّم به الاختبار ويُقطع بإشارة الإلغاء كما يفعل المتصفح. */
function deferred() {
  const pending: Array<{ resolve: (r: Response) => void }> = [];
  net.fetch.mockImplementation(
    (_url: string, init: RequestInit) =>
      new Promise((resolve, reject) => {
        pending.push({ resolve });
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("The request was aborted.", "AbortError")),
        );
      }),
  );
  return pending;
}

let logged: string[] = [];
beforeEach(() => {
  transport.calls = [];
  net.fetch.mockReset();
  logged = [];
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...a: unknown[]) => {
      logged.push(`${level}:${a.map(String).join(" ")}`);
    });
  }
});
afterEach(() => {
  expect(logged.filter((l) => !/scrollTo|not wrapped in act/i.test(l))).toEqual([]);
  vi.restoreAllMocks();
});

describe("أين يظهر المشبك", () => {
  it("المساحة الكاملة (allowImport): مشبك باسم «إرفاق ملف» + حقل ملف مخفي بالخاصية وبالاسم وبالامتدادات", () => {
    render(<FinnChat engine={ENGINE} allowImport />);
    const clip = paperclip();
    expect(clip.className).toMatch(/min-h-11!/);
    expect(clip.className).toMatch(/min-w-11!/);
    expect(clip).not.toBeDisabled();
    const input = fileInput();
    expect(input.hasAttribute("hidden")).toBe(true);
    expect(input.getAttribute("aria-label")).toBe(FINN_IMPORT_COPY.inputLabel);
    expect(input.getAttribute("accept")).toBe(FINN_IMPORT_ACCEPT);
    expect(input.multiple).toBe(false);
    // حقل الكتابة والإرسال سليمان، ولا اسمٌ ملتبس مع أزرار المحادثة.
    expect(screen.getByRole("button", { name: /إرسال/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /إرفاق/ })).toHaveLength(1);
    expect(screen.getByText(/لا يُرسَل محتواه إلى محادثة فِن/)).toBeInTheDocument();
  });

  it("بلا allowImport (الافتراضي) وفي البطاقة المضمَّنة: لا مشبك ولا حقل ملف", () => {
    const { unmount } = render(<FinnChat engine={ENGINE} />);
    expect(screen.queryByRole("button", { name: /إرفاق/ })).toBeNull();
    expect(fileInput()).toBeNull();
    unmount();
    render(<FinnChat engine={ENGINE} variant="inline" />);
    expect(screen.queryByRole("button", { name: /إرفاق/ })).toBeNull();
    expect(fileInput()).toBeNull();
    expect(screen.queryByText(/لا يُرسَل محتواه إلى محادثة فِن/)).toBeNull();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("نقر المشبك يفتح منتقي الملفات (نقر الحقل المخفي)", () => {
    render(<FinnChat engine={ENGINE} allowImport />);
    const clicked = vi.fn();
    fileInput().addEventListener("click", clicked);
    fireEvent.click(paperclip());
    expect(clicked).toHaveBeenCalledTimes(1);
  });
});

describe("الفحص في العميل — بلا أي طلب شبكة", () => {
  it.each([
    ["virus.exe", /الأنواع المقبولة/],
    ["noextension", /الأنواع المقبولة/],
    ["old.xls", /xlsx/],
    ["macro.xlsm", /xlsx/],
    ["bin.xlsb", /csv/],
  ])("%s ⇒ رسالة عربية في تنبيه، ولا طلب", async (name, message) => {
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file(name));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(message);
    expect(alert.textContent).not.toContain(name);
    expect(net.fetch).not.toHaveBeenCalled();
    expect(transport.calls).toHaveLength(0);
    // لا إعادة محاولة لما لا يُصلح بإعادته: الإغلاق وحده.
    expect(within(card()).queryByRole("button", { name: FINN_IMPORT_COPY.retry })).toBeNull();
    expect(
      within(card()).queryByRole("button", { name: FINN_IMPORT_COPY.freshPreview }),
    ).toBeNull();
  });

  it("ملف فارغ ⇒ رسالة، ولا طلب", async () => {
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(new File([], "empty.csv"));
    expect(screen.getByRole("alert")).toHaveTextContent("الملف فارغ");
    expect(net.fetch).not.toHaveBeenCalled();
  });

  it("فوق الحدّ الأقصى ⇒ رسالة بالحدّ، ولا طلب؛ والحدّ تمامًا يمرّ إلى المعاينة", async () => {
    render(<FinnChat engine={ENGINE} allowImport />);
    const big = file("big.csv");
    Object.defineProperty(big, "size", { value: FINN_IMPORT_LIMITS.maxFileBytes + 1 });
    await pick(big);
    expect(screen.getByRole("alert")).toHaveTextContent(fmt(4));
    expect(net.fetch).not.toHaveBeenCalled();

    net.fetch.mockImplementation(async () => json(PREVIEW));
    const edge = file("edge.csv");
    Object.defineProperty(edge, "size", { value: FINN_IMPORT_LIMITS.maxFileBytes });
    await pick(edge);
    await waitFor(() => expect(net.fetch).toHaveBeenCalledTimes(1));
  });

  it("إغلاق التنبيه يزيل البطاقة ويعيد التركيز إلى المشبك", async () => {
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file("x.exe"));
    await click(btn(FINN_IMPORT_COPY.close));
    expect(screen.queryByRole("region", { name: FINN_IMPORT_COPY.cardLabel })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(document.activeElement).toBe(paperclip());
  });
});

describe("المسار الكامل: معاينة ← تأكيد ← قيد الفهرسة", () => {
  it("المعاينة تلقائية بحقل multipart، وتعرض الملخص كاملًا، ولا تكتب شيئًا في المحادثة", async () => {
    const pending = deferred();
    const { container } = render(<FinnChat engine={ENGINE} allowImport />);
    fireEvent.change(textbox(), { target: { value: "مسودّتي" } });
    await pick(file("orders.csv"));

    // أثناء الانتظار: نصّ تقدّم في منطقة حيّة مهذّبة بلا role=status، والمشبك معطّل، والتركيز على البطاقة.
    expect(card()).toHaveAttribute("data-finn-import", "previewing");
    const live = within(card()).getByText(FINN_IMPORT_COPY.previewing);
    expect(live.closest("[aria-live]")?.getAttribute("aria-live")).toBe("polite");
    expect(screen.queryAllByRole("status")).toHaveLength(0);
    expect(paperclip()).toBeDisabled();
    expect(document.activeElement).toBe(card());
    expect(btn(FINN_IMPORT_COPY.cancel)).toBeInTheDocument();

    expect(net.fetch).toHaveBeenCalledTimes(1);
    expect(net.fetch.mock.calls[0][0]).toBe("/api/finn/import");
    expect([...form(0).keys()]).toEqual(["action", "file"]);
    expect(form(0).get("action")).toBe("preview");
    expect((form(0).get("file") as File).name).toBe("orders.csv");

    await act(async () => pending[0].resolve(json(PREVIEW)));
    await screen.findByText(new RegExp(`سيُحمَّل ${fmt(127)} من ${fmt(127)} صفًّا في وثيقة واحدة`));
    const region = card();
    expect(region).toHaveAttribute("data-finn-import", "ready");
    // اسم الملف من اختيار المالك، والأوراق بصفوفها وأعمدتها وترويساتها (نصًّا).
    expect(region).toHaveTextContent("orders.csv");
    expect(region).toHaveTextContent("الأوامر");
    expect(region).toHaveTextContent(`الصفوف ${fmt(120)}، الأعمدة ${fmt(3)}`);
    for (const h of ["رقم الأمر", "الموقع", "الحالة", "a", "b"]) {
      expect(within(region).getByText(h)).toBeInTheDocument();
    }
    // الأنماط الشخصية: ما حُجب بالصيغ المعروفة وحدها، وحدود الحجب بصدق (لا ادّعاء شمول).
    expect(region).toHaveTextContent(/حُجب في النص \(بالصيغ المعروفة\): هوية أو إقامة .*، جوال /);
    expect(region.textContent).not.toContain("·");
    expect(region.textContent).not.toContain("وكلّها");
    expect(region).toHaveTextContent(/بصيغةٍ غير معروفة/);
    expect(region).toHaveTextContent(/الأسماء والعناوين لا تُحجب/);
    expect(region).toHaveTextContent(
      /لا يُرسَل محتوى الملف إلى المحادثة ولا إلى نموذج الإجابة عند التحميل، لكنّ نصّه \(بعد الحجب\) يُرسَل أثناء الفهرسة إلى مزوّد التضمين، وبعد اكتمالها قد تُستخدم مقاطع منه سياقًا/,
    );
    expect(region).toHaveTextContent(/مكتبة المعرفة فقط/);
    // لا تحذير اقتطاع، ولا رمز التأكيد يظهر للمالك.
    expect(region).not.toHaveTextContent("سيُقتطع");
    expect(container.textContent).not.toContain(PREVIEW.token);
    expect(btn(FINN_IMPORT_COPY.confirm)).toBeInTheDocument();
    expect(btn(FINN_IMPORT_COPY.cancel)).toBeInTheDocument();
    // المحادثة لم تُمسّ: مسودّة الكتابة كما هي، ولا رسالة، ولا ناقل.
    expect((textbox() as HTMLTextAreaElement).value).toBe("مسودّتي");
    expect(screen.queryByRole("article")).toBeNull();
    expect(transport.calls).toHaveLength(0);
  });

  it("التأكيد يعيد رفع الملف نفسه مع الرمز، ثم «حُمِّلت N وثيقة — قيد الفهرسة» ولا ادّعاء جاهزية", async () => {
    net.fetch.mockResolvedValueOnce(json(PREVIEW)).mockResolvedValueOnce(json(DONE));
    render(<FinnChat engine={ENGINE} allowImport />);
    const chosen = file("orders.csv", "id,site\n1,A\n");
    await pick(chosen);
    await screen.findByText(/سيُحمَّل/);
    await click(btn(FINN_IMPORT_COPY.confirm));

    expect(net.fetch).toHaveBeenCalledTimes(2);
    expect([...form(1).keys()]).toEqual(["action", "token", "file"]);
    expect(form(1).get("action")).toBe("execute");
    expect(form(1).get("token")).toBe(PREVIEW.token);
    const resent = form(1).get("file") as File;
    expect(resent.name).toBe("orders.csv");
    expect(await resent.text()).toBe(await chosen.text());

    await waitFor(() => expect(card()).toHaveAttribute("data-finn-import", "done"));
    const region = card();
    expect(region).toHaveTextContent("تم تحميل وثيقتين — قيد الفهرسة (قد تستغرق دقائق)");
    expect(region.textContent).not.toMatch(/جاهز|اكتملت الفهرسة|مفهرس/);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(paperclip()).not.toBeDisabled();
    await click(btn(FINN_IMPORT_COPY.close));
    expect(screen.queryByRole("region", { name: FINN_IMPORT_COPY.cardLabel })).toBeNull();
    expect(document.activeElement).toBe(paperclip());
  });

  it("أثناء التحميل: نصّ تقدّم حيّ، والمشبك معطّل، وزرّ «إيقاف الانتظار»، ولا تأكيد ثانٍ", async () => {
    net.fetch.mockResolvedValueOnce(json(PREVIEW));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    const pending = deferred();
    await click(btn(FINN_IMPORT_COPY.confirm));
    expect(card()).toHaveAttribute("data-finn-import", "executing");
    expect(
      within(card()).getByText(FINN_IMPORT_COPY.executing).closest("[aria-live]"),
    ).not.toBeNull();
    expect(screen.queryAllByRole("status")).toHaveLength(0);
    expect(paperclip()).toBeDisabled();
    expect(within(card()).queryByRole("button", { name: FINN_IMPORT_COPY.confirm })).toBeNull();
    expect(btn(FINN_IMPORT_COPY.cancelLoad)).toBeInTheDocument();
    expect(net.fetch).toHaveBeenCalledTimes(2);
    await act(async () => pending[0].resolve(json(DONE)));
    await waitFor(() => expect(card()).toHaveAttribute("data-finn-import", "done"));
  });

  it("الاقتطاع والتحذيرات تظهر صراحةً بمثلّثٍ ونصّ، والإجمالي التقديري «نحو»، وجملة اقتطاعٍ واحدة", async () => {
    net.fetch.mockResolvedValueOnce(
      json({
        ...PREVIEW,
        totals: {
          rows_total: 183_456,
          rows_total_exact: false,
          rows_loaded: 60_000,
          parts: 3,
          truncated: true,
        },
        pii: { id_numbers: 3, phones: 1, emails: 12, masked: true },
        warnings: [
          `الملف لم يُحمَّل كاملًا: سيُحمَّل ${fmt(60_000)} صفًّا من أصل نحو ${fmt(183_456)}.`,
          "تُجوهلت ورقتان بعد الحدّ الأقصى.",
        ],
      }),
    );
    const { container } = render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/في .* وثائق$/);
    const region = card();
    // الصدق العددي: الإجمالي تقدير فيُطبع «نحو» (المادة ٢٧)، لا رقمٌ يقينيّ مختلَق.
    expect(region).toHaveTextContent(
      `سيُحمَّل ${fmt(60_000)} من نحو ${fmt(183_456)} صفًّا في ${fmt(3)} وثائق`,
    );
    // جملة اقتطاعٍ واحدة هي تحذير الخادم؛ لا نسخةٌ ثانية من العميل بأرقامٍ يقينية.
    expect(region.textContent).not.toContain("سيُقتطع");
    expect(region.textContent).not.toContain("لن يدخل المكتبة");
    expect(region.textContent?.split("لم يُحمَّل كاملًا")).toHaveLength(2);
    expect(region).toHaveTextContent("تُجوهلت ورقتان بعد الحدّ الأقصى.");
    expect(region).toHaveTextContent(`هوية أو إقامة ${fmt(3)}`);
    expect(region).toHaveTextContent(`بريد ${fmt(12)}`);
    // الدلالة بالشكل لا باللون: مثلّث التحذير مرسوم (svg) قرب كل تحذير.
    expect(
      container.querySelectorAll('[data-finn-import] svg[aria-hidden="true"]').length,
    ).toBeGreaterThan(2);
  });

  it("ترتيب الإفصاحات: العدد والتحذيرات ثم الأنماط الشخصية والنطاق، وقائمة الأوراق الطويلة آخرًا", async () => {
    net.fetch.mockResolvedValueOnce(
      json({
        ...PREVIEW,
        warnings: ["تحذير-أول", "تحذير-ثانٍ"],
        sheets: Array.from({ length: 6 }, (_v, i) => ({
          name: `ورقة-${i + 1}`,
          rows: 10,
          cols: 2,
          headers: ["أ", "ب"],
        })),
      }),
    );
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    const region = card();
    const at = (text: string | RegExp) => within(region).getByText(text);
    const before = (a: HTMLElement, b: HTMLElement) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const totals = at(/سيُحمَّل/);
    const warn1 = at("تحذير-أول");
    const warn2 = at("تحذير-ثانٍ");
    const pii = at(/حُجب في النص/);
    const scope = at(FINN_IMPORT_COPY.scope);
    const firstSheet = at("ورقة-1");
    const lastSheet = at("ورقة-6");
    for (const [a, b] of [
      [totals, warn1],
      [warn1, warn2],
      [warn2, pii],
      [pii, scope],
      [scope, firstSheet],
      [firstSheet, lastSheet],
    ] as const) {
      expect(before(a, b)).toBe(true);
    }
  });

  it("حلقة التركيز لا تُقصّ: القسم الجذر (يُركَّز برمجيًّا) بلا nx-focus-ring وبلا حلقة، والمنطقة المتمرّرة بهامشٍ يتّسع لحلقتها", async () => {
    net.fetch.mockResolvedValueOnce(json(PREVIEW));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    expect(card().className).not.toMatch(/nx-focus-ring/);
    expect(card().className).toMatch(/focus-visible:outline-none/);
    const details = within(card()).getByRole("region", { name: FINN_IMPORT_COPY.detailsLabel });
    expect(details.className).toMatch(/nx-focus-ring/);
    expect(details.className).toMatch(/\bmx-1\b/);
  });

  it("على شاشةٍ قصيرة ينكمش سجلّ المحادثة إلى أرضيةٍ لا إلى سطر: له min-h-20 وللبطاقة min-h-0", async () => {
    net.fetch.mockResolvedValueOnce(json(PREVIEW));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    expect(screen.getByRole("log").className).toMatch(/\bmin-h-20\b/);
    expect(screen.getByRole("log").className).not.toMatch(/\bmin-h-0\b/);
    expect(card().className).toMatch(/\bmin-h-0\b/);
  });

  it("رسالة التمام تذكر ما لم يُكرَّر لوجوده سابقًا (لا يُترك المالك يظنّ أنّ المعاينة تخلّفت)", async () => {
    net.fetch
      .mockResolvedValueOnce(json(PREVIEW))
      .mockResolvedValueOnce(
        json({ ...DONE, documents: 2, partial: { total: 3, queued: 2, deduped: 1, failed: 0 } }),
      );
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    await click(btn(FINN_IMPORT_COPY.confirm));
    await waitFor(() => expect(card()).toHaveAttribute("data-finn-import", "done"));
    expect(card()).toHaveTextContent("تم تحميل وثيقتين — قيد الفهرسة (قد تستغرق دقائق)");
    expect(card()).toHaveTextContent(`الموجود سابقًا ولم يُكرَّر: ${fmt(1)}`);
  });
});

describe("الأخطاء وإعادة المحاولة", () => {
  it("عطل مؤقّت: تنبيه واحد بنصّ عربي وزرّ «حاول مجدّدًا» يعيد المعاينة نفسها فتنجح", async () => {
    net.fetch
      .mockResolvedValueOnce(
        json({ ok: false, error: "unavailable", message_ar: "تعذّر تحليل الملف الآن." }, 503),
      )
      .mockResolvedValueOnce(json(PREVIEW));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file("same.csv"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("تعذّر تحليل الملف الآن.");
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    await click(btn(FINN_IMPORT_COPY.retry));
    await screen.findByText(/سيُحمَّل/);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(net.fetch).toHaveBeenCalledTimes(2);
    expect(form(1).get("action")).toBe("preview");
    expect((form(1).get("file") as File).name).toBe("same.csv");
  });

  it("تجاوز المعدّل: الانتظار المطلوب يظهر، والمحاولة المعادة آمنة", async () => {
    net.fetch.mockResolvedValueOnce(
      json(
        { ok: false, error: "rate_limited", message_ar: "طلبات كثيرة.", retry_after_s: 30 },
        429,
      ),
    );
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("طلبات كثيرة.");
    expect(alert).toHaveTextContent(`حاول بعد ${fmt(30)} ثانية.`);
    expect(btn(FINN_IMPORT_COPY.retry)).toBeInTheDocument();
  });

  it("انقطاع الشبكة أو الجلسة: جملة عربية محايدة، لا نصّ مصادقة", async () => {
    net.fetch.mockRejectedValueOnce(new Error("Authentication session unavailable."));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("تعذّر الاتصال بالخادم");
    expect(alert.textContent).not.toMatch(/authenticat|unauthor|token|session/i);
    expect(btn(FINN_IMPORT_COPY.retry)).toBeInTheDocument();
  });

  it("نصّ الخادم الإنجليزي أو الحامل لـ«token» لا يبلغ الشاشة", async () => {
    net.fetch.mockResolvedValueOnce(
      json({ ok: false, error: "malformed", message_ar: "Unauthorized: bad token" }, 422),
    );
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toMatch(/unauthor|token/i);
    expect(alert).toHaveTextContent("تعذّر إكمال العملية");
  });

  it("انتهى الرمز عند التأكيد: «معاينة جديدة» تعيد المعاينة من الملف نفسه (لا رمز قديم)", async () => {
    net.fetch
      .mockResolvedValueOnce(json(PREVIEW))
      .mockResolvedValueOnce(
        json({ ok: false, error: "token_expired", message_ar: "انتهت مهلة المعاينة." }, 410),
      )
      .mockResolvedValueOnce(json({ ...PREVIEW, token: "fixture-token-2" }))
      .mockResolvedValueOnce(json(DONE));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file("again.csv"));
    await screen.findByText(/سيُحمَّل/);
    await click(btn(FINN_IMPORT_COPY.confirm));
    expect(await screen.findByRole("alert")).toHaveTextContent("انتهت مهلة المعاينة.");
    // لا «حاول مجدّدًا» بالرمز الميّت؛ المعاينة الجديدة وحدها.
    expect(within(card()).queryByRole("button", { name: FINN_IMPORT_COPY.retry })).toBeNull();
    await click(btn(FINN_IMPORT_COPY.freshPreview));
    await screen.findByText(/سيُحمَّل/);
    expect(form(2).get("action")).toBe("preview");
    expect(form(2).get("token")).toBeNull();
    expect((form(2).get("file") as File).name).toBe("again.csv");
    await click(btn(FINN_IMPORT_COPY.confirm));
    expect(form(3).get("token")).toBe("fixture-token-2");
  });

  it("تغيّرت بصمة الملف ⇒ معاينة جديدة أيضًا", async () => {
    net.fetch
      .mockResolvedValueOnce(json(PREVIEW))
      .mockResolvedValueOnce(
        json({ ok: false, error: "file_changed", message_ar: "تغيّر الملف." }, 409),
      );
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    await click(btn(FINN_IMPORT_COPY.confirm));
    await screen.findByRole("alert");
    expect(btn(FINN_IMPORT_COPY.freshPreview)).toBeInTheDocument();
  });

  it.each([
    ["unsafe", 422, "رُفض الملف: يحوي ماكرو."],
    ["malformed", 422, "الملف تالف."],
    ["already_used", 409, "نُفِّذ هذا التحميل من قبل."],
    ["disabled", 503, "التحميل متوقف."],
    ["confirmation_unavailable", 503, "التأكيد غير مفعّل."],
  ])("%s ⇒ تنبيهٌ بالإغلاق وحده (لا إعادة ولا معاينة جديدة)", async (error, status, message_ar) => {
    net.fetch.mockResolvedValueOnce(json({ ok: false, error, message_ar }, status));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    expect(await screen.findByRole("alert")).toHaveTextContent(message_ar);
    const names = within(card())
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(names).toEqual([FINN_IMPORT_COPY.close]);
  });

  it("فشلٌ متأخر بعد استهلاك الرمز (503): لا «حاول مجدّدًا» بالرمز المحروق بل «أعد المعاينة» — ولا يُعاد الرمز نفسه أبدًا", async () => {
    net.fetch
      .mockResolvedValueOnce(json(PREVIEW))
      .mockResolvedValueOnce(
        json(
          {
            ok: false,
            error: "unavailable",
            message_ar: "تعذّر إكمال التحميل، وقد يكون بعض الملف حُمِّل.",
            retry_after_s: 30,
            partial: { total: 1, queued: 0, deduped: 0, failed: 1 },
          },
          503,
        ),
      )
      .mockResolvedValueOnce(json({ ...PREVIEW, token: "fixture-token-2" }))
      .mockResolvedValueOnce(json(DONE));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    await click(btn(FINN_IMPORT_COPY.confirm));
    const alert = await screen.findByRole("alert");
    // الرسالة تصف الواقع: قد يكون بعضٌ حُمِّل.
    expect(alert).toHaveTextContent("وقد يكون بعض الملف حُمِّل");
    expect(within(card()).queryByRole("button", { name: FINN_IMPORT_COPY.retry })).toBeNull();
    await click(btn(FINN_IMPORT_COPY.freshPreview));
    await screen.findByText(/سيُحمَّل/);
    // الطلب الثالث معاينةٌ جديدة من الملف نفسه (لا رمز)، لا إعادةُ تنفيذٍ بالرمز المستهلك.
    expect(form(2).get("action")).toBe("preview");
    expect(form(2).get("token")).toBeNull();
    await click(btn(FINN_IMPORT_COPY.confirm));
    await waitFor(() => expect(card()).toHaveAttribute("data-finn-import", "done"));
    expect(form(3).get("action")).toBe("execute");
    expect(form(3).get("token")).toBe("fixture-token-2");
    const executeTokens = net.fetch.mock.calls
      .map((_c, i) => form(i))
      .filter((f) => f.get("action") === "execute")
      .map((f) => f.get("token"));
    expect(executeTokens).toEqual([PREVIEW.token, "fixture-token-2"]);
  });

  it.each([
    [
      "جزئي 502",
      () => json({ ok: false, error: "unavailable", message_ar: "اكتمل جزء من التحميل." }, 502),
    ],
    ["انقطاع الشبكة", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("فشل التنفيذ بعد وصول الطلب (%s) ⇒ «أعد المعاينة» لا إعادة بالرمز", async (_n, outcome) => {
    net.fetch.mockResolvedValueOnce(json(PREVIEW)).mockImplementationOnce(outcome);
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    await click(btn(FINN_IMPORT_COPY.confirm));
    await screen.findByRole("alert");
    expect(btn(FINN_IMPORT_COPY.freshPreview)).toBeInTheDocument();
    expect(within(card()).queryByRole("button", { name: FINN_IMPORT_COPY.retry })).toBeNull();
  });

  it("تجاوز المعدّل عند التنفيذ يبقى إعادةً بالرمز نفسه (الحدّ يُفحص قبل الاستهلاك)", async () => {
    net.fetch
      .mockResolvedValueOnce(json(PREVIEW))
      .mockResolvedValueOnce(
        json(
          { ok: false, error: "rate_limited", message_ar: "طلبات كثيرة.", retry_after_s: 600 },
          429,
        ),
      )
      .mockResolvedValueOnce(json(DONE));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    await click(btn(FINN_IMPORT_COPY.confirm));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(`حاول بعد ${fmt(10)} دقائق.`);
    expect(
      within(card()).queryByRole("button", { name: FINN_IMPORT_COPY.freshPreview }),
    ).toBeNull();
    await click(btn(FINN_IMPORT_COPY.retry));
    await waitFor(() => expect(card()).toHaveAttribute("data-finn-import", "done"));
    expect(form(2).get("action")).toBe("execute");
    expect(form(2).get("token")).toBe(PREVIEW.token);
  });

  it("ردٌّ غير مفهوم (200 بلا شكل المعاينة) ⇒ تنبيه، لا معاينة مدّعاة", async () => {
    net.fetch.mockResolvedValueOnce(json({ ok: true, hello: "world" }));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    expect(await screen.findByRole("alert")).toHaveTextContent("تعذّر إكمال العملية");
    expect(within(card()).queryByRole("button", { name: FINN_IMPORT_COPY.confirm })).toBeNull();
  });

  it("تنبيه الاستيراد لا يلتبس بتنبيه المحادثة: يوجد تنبيه واحد فقط ما دام الخطأ ظاهرًا", async () => {
    render(<FinnChat engine={ENGINE} allowImport />);
    expect(screen.queryByRole("alert")).toBeNull();
    await pick(file("x.exe"));
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    await click(btn(FINN_IMPORT_COPY.close));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("الإلغاء", () => {
  it("إلغاء المعاينة يقطع الطلب ويزيل البطاقة بلا تنبيه ويعيد التركيز إلى المشبك", async () => {
    deferred();
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    expect(signal(0).aborted).toBe(false);
    await click(btn(FINN_IMPORT_COPY.cancel));
    expect(signal(0).aborted).toBe(true);
    expect(screen.queryByRole("region", { name: FINN_IMPORT_COPY.cardLabel })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(paperclip()).not.toBeDisabled();
    expect(document.activeElement).toBe(paperclip());
  });

  it("كل اختيار يُفرِّغ قيمة حقل الملف فور التقاطه (وإلا لم يُطلق المتصفح change عند اختيار الملف نفسه ثانيةً)", async () => {
    net.fetch.mockResolvedValue(json(PREVIEW));
    render(<FinnChat engine={ENGINE} allowImport />);
    const input = fileInput();
    let current = "C:\\fakepath\\orders.csv";
    const writes: string[] = [];
    Object.defineProperty(input, "value", {
      configurable: true,
      get: () => current,
      set: (v: string) => {
        writes.push(v);
        current = v;
      },
    });
    await pick(file("orders.csv"));
    await screen.findByText(/سيُحمَّل/);
    expect(writes).toEqual([""]);
    expect(current).toBe("");
  });

  it("إلغاء المعاينة الجاهزة يمحو الملف: اختياره ثانيةً ممكن (الحقل يُفرَّغ)", async () => {
    net.fetch.mockImplementation(async () => json(PREVIEW));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file("one.csv"));
    await screen.findByText(/سيُحمَّل/);
    await click(btn(FINN_IMPORT_COPY.cancel));
    expect(screen.queryByRole("region", { name: FINN_IMPORT_COPY.cardLabel })).toBeNull();
    expect(fileInput().value).toBe("");
    await pick(file("one.csv"));
    await screen.findByText(/سيُحمَّل/);
    expect(net.fetch).toHaveBeenCalledTimes(2);
  });

  it("إيقاف انتظار التحميل الجاري يقطع الانتظار ويحذّر بأن الخادم قد يكون أتمّ الكتابة", async () => {
    net.fetch.mockResolvedValueOnce(json(PREVIEW));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    deferred();
    await click(btn(FINN_IMPORT_COPY.confirm));
    await click(btn(FINN_IMPORT_COPY.cancelLoad));
    expect(signal(1).aborted).toBe(true);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("قد يكون التحميل اكتمل");
    expect(alert).toHaveTextContent("راجع مكتبة المعرفة");
    // لا إعادة بالرمز بعد قطعٍ يدوي (قد يكون الخادم استهلكه): معاينةٌ جديدة أو الإغلاق.
    expect(
      within(card())
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual([FINN_IMPORT_COPY.freshPreview, FINN_IMPORT_COPY.close]);
  });

  it("نتيجةٌ متأخرة لطلبٍ أُلغي لا تُغيّر الحالة (طلب جديد يفوز)", async () => {
    const pending = deferred();
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file("a.csv"));
    await click(btn(FINN_IMPORT_COPY.cancel));
    await pick(file("b.csv"));
    expect(card()).toHaveTextContent("b.csv");
    // يصل ردّ الطلب الملغى متأخّرًا: يُهمل.
    await act(async () =>
      pending[0].resolve(json({ ...PREVIEW, file: { ...PREVIEW.file, name: "a" } })),
    );
    expect(card()).toHaveAttribute("data-finn-import", "previewing");
    expect(card()).toHaveTextContent("b.csv");
    await act(async () => pending[1].resolve(json(PREVIEW)));
    await screen.findByText(/سيُحمَّل/);
    expect(card()).toHaveTextContent("b.csv");
  });
});

describe("«محادثة جديدة» والمغادرة", () => {
  it("«محادثة جديدة» متاحة أثناء معاينة بلا رسائل، وتقطع الطلب وتمسح البطاقة", async () => {
    deferred();
    render(<FinnChat engine={ENGINE} allowImport />);
    const fresh = screen.getByRole("button", { name: /محادثة جديدة/ });
    expect(fresh).toBeDisabled();
    await pick(file());
    expect(fresh).not.toBeDisabled();
    await click(fresh);
    expect(signal(0).aborted).toBe(true);
    expect(screen.queryByRole("region", { name: FINN_IMPORT_COPY.cardLabel })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fresh).toBeDisabled();
  });

  it("وتمسح معاينةً جاهزة وتنبيهًا ظاهرًا أيضًا", async () => {
    net.fetch.mockResolvedValueOnce(json(PREVIEW));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    await click(screen.getByRole("button", { name: /محادثة جديدة/ }));
    expect(screen.queryByRole("region", { name: FINN_IMPORT_COPY.cardLabel })).toBeNull();

    await pick(file("x.exe"));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await click(screen.getByRole("button", { name: /محادثة جديدة/ }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("«محادثة جديدة» معطَّلة أثناء التنفيذ (الخادم قد يكتب): لا يُمحى الكارت بصمت، وتعود بعد النتيجة", async () => {
    net.fetch.mockResolvedValueOnce(json(PREVIEW));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    const pending = deferred();
    await click(btn(FINN_IMPORT_COPY.confirm));
    expect(card()).toHaveAttribute("data-finn-import", "executing");
    const fresh = screen.getByRole("button", { name: /محادثة جديدة/ });
    expect(fresh).toBeDisabled();
    await click(fresh);
    // النقر على معطَّل لا يفعل شيئًا: البطاقة قائمة والطلب لم يُقطع.
    expect(card()).toHaveAttribute("data-finn-import", "executing");
    expect(signal(1).aborted).toBe(false);
    await act(async () => pending[0].resolve(json(DONE)));
    await waitFor(() => expect(card()).toHaveAttribute("data-finn-import", "done"));
    expect(fresh).not.toBeDisabled();
  });

  it("إزالة المكوّن (مغادرة الصفحة) تقطع الطلب الجاري", async () => {
    deferred();
    const { unmount } = render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    expect(signal(0).aborted).toBe(false);
    unmount();
    expect(signal(0).aborted).toBe(true);
  });
});

describe("المحادثة لا تتأثر", () => {
  it("بعد استيراد كامل: ناقل المحادثة يرسل [{role,content}] وحدها بلا حرفٍ من الملف", async () => {
    net.fetch.mockResolvedValueOnce(json(PREVIEW)).mockResolvedValueOnce(json(DONE));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file("secret-name.csv", "id,site\n9999999999,SECRET-CELL\n"));
    await screen.findByText(/سيُحمَّل/);
    await click(btn(FINN_IMPORT_COPY.confirm));
    await waitFor(() => expect(card()).toHaveAttribute("data-finn-import", "done"));
    await click(btn(FINN_IMPORT_COPY.close));

    fireEvent.change(textbox(), { target: { value: "ما حال المنصّة؟" } });
    await click(screen.getByRole("button", { name: /إرسال/ }));
    await waitFor(() => expect(transport.calls).toHaveLength(1));
    expect(transport.calls[0]).toEqual([{ role: "user", content: "ما حال المنصّة؟" }]);
    const wire = JSON.stringify(transport.calls);
    for (const leak of [
      "secret-name",
      "SECRET-CELL",
      "9999999999",
      "الأوامر",
      "fixture-token",
      "orders",
    ]) {
      expect(wire).not.toContain(leak);
    }
    // والسجلّ المعروض لا يحمل أثرًا للملف.
    expect(screen.getByRole("log").textContent).not.toMatch(/secret-name|SECRET-CELL/);
  });

  it("لا نداء fetch خامًا في دورة الاستيراد كلّها: الشبكة الوحيدة authenticatedFetch إلى نقطة الاستيراد (M14c)", async () => {
    const raw = vi.fn(async () => {
      throw new Error("fetch خام يتجاوز عدّاد authenticatedFetch");
    });
    vi.stubGlobal("fetch", raw);
    try {
      net.fetch.mockResolvedValueOnce(json(PREVIEW)).mockResolvedValueOnce(json(DONE));
      render(<FinnChat engine={ENGINE} allowImport />);
      await pick(file("orders.csv", "id,site\n1,A\n"));
      await screen.findByText(/سيُحمَّل/);
      await click(btn(FINN_IMPORT_COPY.confirm));
      await waitFor(() => expect(card()).toHaveAttribute("data-finn-import", "done"));
      await click(btn(FINN_IMPORT_COPY.close));
      expect(raw).not.toHaveBeenCalled();
      expect(net.fetch.mock.calls.map((c) => c[0])).toEqual([
        "/api/finn/import",
        "/api/finn/import",
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("الإرسال أثناء معاينة جارية لا يتأثر بها ولا يؤثر فيها", async () => {
    const pending = deferred();
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    fireEvent.change(textbox(), { target: { value: "سؤال" } });
    await click(screen.getByRole("button", { name: /إرسال/ }));
    await waitFor(() => expect(transport.calls).toHaveLength(1));
    expect(transport.calls[0]).toEqual([{ role: "user", content: "سؤال" }]);
    expect(card()).toHaveAttribute("data-finn-import", "previewing");
    await act(async () => pending[0].resolve(json(PREVIEW)));
    await screen.findByText(/سيُحمَّل/);
  });
});

describe("نصٌّ من الملف يُعرض نصًّا لا HTML", () => {
  it("<img onerror> و<b> في الاسم والورقة والترويسة تبقى حروفًا خاملة", async () => {
    const evil = '<img src=x onerror="alert(1)">';
    net.fetch.mockResolvedValueOnce(
      json({
        ...PREVIEW,
        sheets: [
          { name: "<b>ورقة</b>", rows: 1, cols: 2, headers: [evil, "<script>alert(2)</script>"] },
        ],
      }),
    );
    const { container } = render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file(`${evil}.csv`));
    await screen.findByText(/سيُحمَّل/);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(within(card()).getByText(evil)).toBeInTheDocument();
    expect(card()).toHaveTextContent("<b>ورقة</b>");
    expect(card()).toHaveTextContent("<script>alert(2)</script>");
  });

  it("اسم الملف بمحارف قلب الاتجاه والتحكّم يُنظَّف قبل العرض، والطويل يُقتطع مع title", async () => {
    net.fetch.mockResolvedValueOnce(json(PREVIEW));
    render(<FinnChat engine={ENGINE} allowImport />);
    const name = `invoice${String.fromCodePoint(0x202e)}gpj.exe${"x".repeat(300)}.csv`;
    await pick(file(name));
    await screen.findByText(/سيُحمَّل/);
    const shown = card().querySelector("[title]") as HTMLElement;
    expect(hasHiddenChars(shown.textContent ?? "")).toBe(false);
    expect(Array.from(shown.textContent ?? "").length).toBeLessThanOrEqual(120);
    expect(shown.getAttribute("title")).toBe(shown.textContent);
    expect(shown.getAttribute("dir")).toBe("auto");
    expect(shown.className).toMatch(/\btruncate\b/);
  });
});

describe("الوصولية والتخطيط", () => {
  it("axe: لا انتهاكات في حالات المعاينة والجاهزة والتمام والخطأ", async () => {
    const opts = { rules: { "color-contrast": { enabled: false } } };
    net.fetch
      .mockResolvedValueOnce(json(PREVIEW))
      .mockResolvedValueOnce(json(DONE))
      .mockResolvedValueOnce(
        json({ ok: false, error: "unavailable", message_ar: "تعذّر الآن." }, 503),
      );
    const pending = [] as Array<(r: Response) => void>;
    const { container } = render(<FinnChat engine={ENGINE} allowImport />);
    expect(await axe(container, opts)).toHaveNoViolations();

    // جارية
    net.fetch.mockReset();
    net.fetch.mockImplementationOnce(() => new Promise((resolve) => pending.push(resolve)));
    await pick(file());
    expect(await axe(container, opts)).toHaveNoViolations();
    await act(async () => pending[0](json(PREVIEW)));
    await screen.findByText(/سيُحمَّل/);
    expect(await axe(container, opts)).toHaveNoViolations();

    // تمّ
    net.fetch.mockResolvedValueOnce(json(DONE));
    await click(btn(FINN_IMPORT_COPY.confirm));
    await waitFor(() => expect(card()).toHaveAttribute("data-finn-import", "done"));
    expect(await axe(container, opts)).toHaveNoViolations();

    // خطأ
    await click(btn(FINN_IMPORT_COPY.close));
    await pick(file("x.exe"));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(await axe(container, opts)).toHaveNoViolations();
  });

  it("كل زرٍّ في البطاقة ≥ 44px، والتفاصيل مسقوفة بتمرير داخلي قابل للتركيز، ولا sticky/fixed", async () => {
    net.fetch.mockResolvedValueOnce(json(PREVIEW));
    render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    const region = card();
    for (const button of within(region).getAllByRole("button")) {
      expect(button.className, button.textContent ?? "").toMatch(/min-h-11!/);
    }
    expect(region.className).toMatch(/max-h-56/);
    const details = within(region).getByRole("region", { name: FINN_IMPORT_COPY.detailsLabel });
    expect(details.className).toMatch(/overflow-y-auto/);
    expect(details.getAttribute("tabindex")).toBe("0");
    expect(region.outerHTML).not.toMatch(/\bsticky\b|\bfixed\b/);
    // الأزرار خارج منطقة التمرير فلا تُخفيها كثرة الأوراق.
    expect(details.querySelector("button")).toBeNull();
    // ولا لونٌ صريح مكتوب في أسلوب العنصر.
    expect(region.outerHTML).not.toMatch(/style="[^"]*(#|rgb|hsl)/i);
  });

  it("الاتجاه RTL على جذر المحادثة، والبطاقة داخل بطاقة المحادثة فوق حقل الكتابة", async () => {
    net.fetch.mockResolvedValueOnce(json(PREVIEW));
    const { container } = render(<FinnChat engine={ENGINE} allowImport />);
    await pick(file());
    await screen.findByText(/سيُحمَّل/);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
    const region = card();
    const form_ = textbox().closest("form") as HTMLElement;
    // البطاقة تسبق النموذج في الشجرة (فوقه بصريًّا) وتشاركه الأب نفسه.
    expect(region.parentElement).toBe(form_.parentElement);
    expect(region.compareDocumentPosition(form_) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("الخطّاف: التأكيد الثاني أثناء التنفيذ", () => {
  it("confirm() مرّتين متتاليتين ⇒ طلب تنفيذ واحد، ولا يُقطع الأول، والنتيجة done (لا 409 كاذب)", async () => {
    const pending: Array<(r: Response) => void> = [];
    net.fetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((resolve) => {
          pending.push(resolve);
          void init;
        }),
    );
    const { result } = renderHook(() => useFinnImport());
    await act(async () => result.current.pick(file()));
    await act(async () => pending[0](json(PREVIEW)));
    await waitFor(() => expect(result.current.state.phase).toBe("ready"));

    await act(async () => {
      result.current.confirm();
      result.current.confirm();
    });
    expect(result.current.state.phase).toBe("executing");
    // معاينة واحدة + تنفيذ واحد فقط؛ والتنفيذ الأول لم يُجهَض.
    expect(net.fetch).toHaveBeenCalledTimes(2);
    expect(signal(1).aborted).toBe(false);

    await act(async () => pending[1](json(DONE)));
    await waitFor(() => expect(result.current.state.phase).toBe("done"));
    expect(net.fetch).toHaveBeenCalledTimes(2);
  });
});
