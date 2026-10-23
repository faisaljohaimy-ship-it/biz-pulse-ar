/**
 * واجهة فِن — سلوكٌ مُصيَّر في jsdom: الشريط، الحالات، الشارة، الأخطاء، كتل الكود.
 *
 * ناقل الشبكة (`streamFinnReply`) مُحاكى بالكامل: لا طلب حقيقي ولا مزوّد. والمحاكاة
 * تُشغَّل بترتيب ما يفعله الناقل الحقيقي (onMeta ثم onDelta…) فتُفحص الواجهة لا الناقل
 * (الناقل نفسه في `client.test.ts`).
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FinnTransportResult, FinnReplyMeta } from "@/lib/finn-agent/client";
import { FINN_BANNER_AR, FINN_STARTERS } from "@/lib/finn-agent/copy";
import { FINN_LIMITS } from "@/lib/finn-agent/limits";
import type { FinnEngineStatus } from "@/lib/finn-agent/status";

type Script = (opts: {
  onMeta: (meta: FinnReplyMeta) => void;
  onDelta: (text: string) => void;
  signal: AbortSignal;
  messages: ReadonlyArray<{ role: string; content: string }>;
}) => Promise<FinnTransportResult>;

const transport = vi.hoisted(() => ({
  calls: [] as Array<ReadonlyArray<{ role: string; content: string }>>,
  script: null as null | Script,
}));

vi.mock("@/lib/finn-agent/client", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  streamFinnReply: async (opts: Parameters<Script>[0]) => {
    transport.calls.push(opts.messages);
    if (!transport.script) throw new Error("no script");
    return transport.script(opts);
  },
}));

import FinnChat from "./FinnChat";

const GPT_READY: FinnEngineStatus = {
  gpt: true,
  gptModel: "gpt-4.1",
  fallback: true,
  paused: false,
};

const ok = (truncated = false): FinnTransportResult => ({ ok: true, truncated });
const fail = (kind: "engine" | "network", message: string): FinnTransportResult => ({
  ok: false,
  aborted: false,
  kind,
  message,
});

beforeEach(() => {
  transport.calls = [];
  transport.script = async ({ onMeta, onDelta }) => {
    onMeta({ engine: "gpt", fallback: null });
    onDelta("مرحبًا ");
    onDelta("بك");
    return ok();
  };
});
afterEach(() => vi.restoreAllMocks());

const textbox = () => screen.getByRole("textbox", { name: /رسالتك إلى فِن/ });
async function send(text: string) {
  fireEvent.change(textbox(), { target: { value: text } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /إرسال/ }));
  });
}

describe("الحالة الفارغة والشريط", () => {
  it("الشريط «يقترح ولا ينفّذ — راجع قبل أي تنفيذ» ظاهرٌ دائمًا", () => {
    render(<FinnChat engine={GPT_READY} />);
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(FINN_BANNER_AR);
    expect(note).toBeVisible();
  });

  it("الشريط يبقى ظاهرًا بعد المحادثة والخطأ", async () => {
    render(<FinnChat engine={GPT_READY} />);
    await send("اكتب دالة");
    await waitFor(() => expect(screen.getByText(/مرحبًا بك/)).toBeInTheDocument());
    expect(screen.getByRole("note")).toHaveTextContent(FINN_BANNER_AR);
  });

  it("أربع بدايات سريعة تملأ الحقل ولا تُرسل", () => {
    render(<FinnChat engine={GPT_READY} />);
    expect(FINN_STARTERS).toHaveLength(4);
    for (const starter of FINN_STARTERS) {
      expect(screen.getByRole("button", { name: starter.label })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: FINN_STARTERS[3].label }));
    expect((textbox() as HTMLTextAreaElement).value).toBe(FINN_STARTERS[3].prompt);
    expect(transport.calls).toHaveLength(0);
  });

  it("W5 #10 البداية السريعة لا تمحو نصًّا كُتب قبلها — تُلحَق به", () => {
    render(<FinnChat engine={GPT_READY} />);
    fireEvent.change(textbox(), { target: { value: "لصقتُ هذا الكود: const a = 1;" } });
    fireEvent.click(screen.getByRole("button", { name: FINN_STARTERS[0].label }));
    const value = (textbox() as HTMLTextAreaElement).value;
    expect(value).toContain("لصقتُ هذا الكود: const a = 1;");
    expect(value).toContain(FINN_STARTERS[0].prompt);
    expect(value.indexOf("لصقتُ")).toBeLessThan(value.indexOf(FINN_STARTERS[0].prompt));
  });

  it("وحقلٌ فارغ أو مسافات فقط ⇒ تحلّ البداية محلّه كما كان", () => {
    render(<FinnChat engine={GPT_READY} />);
    fireEvent.change(textbox(), { target: { value: "  \n " } });
    fireEvent.click(screen.getByRole("button", { name: FINN_STARTERS[1].label }));
    expect((textbox() as HTMLTextAreaElement).value).toBe(FINN_STARTERS[1].prompt);
  });

  it("العنوان فِن، والواجهة RTL", () => {
    const { container } = render(<FinnChat engine={GPT_READY} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("فِن");
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("لا انتهاكات وصولية ظاهرة (axe)", async () => {
    const { container } = render(<FinnChat engine={GPT_READY} />);
    expect(
      await axe(container, { rules: { "color-contrast": { enabled: false } } }),
    ).toHaveNoViolations();
  });
});

describe("مؤشر الجاهزية الصادق", () => {
  const chip = () => document.querySelector("[data-finn-readiness]") as HTMLElement;

  it("GPT مهيّأ", () => {
    render(<FinnChat engine={GPT_READY} />);
    expect(chip()).toHaveTextContent("GPT مهيّأ");
    expect(chip().dataset.finnReadiness).toBe("ok");
    // اسم النموذج للمالك، و«مهيّأ» لا تدّعي أن المزوّد يعمل.
    expect(chip().getAttribute("title")).toContain("gpt-4.1");
    expect(chip().getAttribute("title")).toMatch(/لا أن المزوّد يعمل الآن/);
  });

  it("المفتاح غائب والاحتياطي موجود ⇒ «يعمل بالاحتياطي»", () => {
    render(<FinnChat engine={{ ...GPT_READY, gpt: false }} />);
    expect(chip()).toHaveTextContent("يعمل بالاحتياطي");
    expect(chip().dataset.finnReadiness).toBe("warn");
  });

  it("متوقف بأمر التشغيل", () => {
    render(<FinnChat engine={{ ...GPT_READY, paused: true }} />);
    expect(chip()).toHaveTextContent("متوقف بأمر التشغيل");
    expect(chip().dataset.finnReadiness).toBe("off");
  });

  it("لا محرّك أصلًا", () => {
    render(
      <FinnChat engine={{ gpt: false, gptModel: "gpt-4.1", fallback: false, paused: false }} />,
    );
    expect(chip()).toHaveTextContent("لا محرّك مهيّأ");
  });

  it("لا طول مفتاح ولا قيمته في أي نصٍّ مرسوم", () => {
    const { container } = render(<FinnChat engine={GPT_READY} />);
    expect(container.textContent).not.toMatch(/sk-|OPENAI_API_KEY|FINN_OWNER/);
  });
});

describe("المحادثة والبثّ وشارة المحرّك", () => {
  it("يعرض رسالة المستخدم والردّ المبثوث، وشارة «GPT»", async () => {
    render(<FinnChat engine={GPT_READY} />);
    await send("اكتب دالة");
    await waitFor(() => expect(screen.getByText(/مرحبًا بك/)).toBeInTheDocument());
    expect(screen.getByText("اكتب دالة")).toBeInTheDocument();
    const badge = document.querySelector("[data-finn-engine]") as HTMLElement;
    expect(badge.dataset.finnEngine).toBe("gpt");
    expect(badge).toHaveTextContent("GPT");
    expect(badge).not.toHaveTextContent("احتياطي");
    // الحقل فُرِّغ بعد الإرسال، والبدايات اختفت.
    expect((textbox() as HTMLTextAreaElement).value).toBe("");
    expect(screen.queryByText("بماذا أساعدك اليوم؟")).not.toBeInTheDocument();
  });

  it("السقوط معلَن: شارة «احتياطي» وسببه، لا «GPT»", async () => {
    transport.script = async ({ onMeta, onDelta }) => {
      onMeta({ engine: "fallback", fallback: "rate_limited" });
      onDelta("رد من الاحتياطي");
      return ok();
    };
    render(<FinnChat engine={GPT_READY} />);
    await send("س");
    await waitFor(() => expect(screen.getByText(/رد من الاحتياطي/)).toBeInTheDocument());
    const badge = document.querySelector("[data-finn-engine]") as HTMLElement;
    expect(badge.dataset.finnEngine).toBe("fallback");
    expect(badge).toHaveTextContent("احتياطي");
    expect(badge).toHaveTextContent("GPT بلغ حدّ الطلبات");
    expect(badge.textContent).not.toMatch(/^GPT/);
  });

  it("ردٌّ بلا ترويسة محرّك ⇒ لا شارة (لا يُخمَّن المحرّك)", async () => {
    transport.script = async ({ onMeta, onDelta }) => {
      onMeta({ engine: null, fallback: null });
      onDelta("نص");
      return ok();
    };
    render(<FinnChat engine={GPT_READY} />);
    await send("س");
    await waitFor(() => expect(screen.getByText("نص")).toBeInTheDocument());
    expect(document.querySelector("[data-finn-engine]")).toBeNull();
  });

  it("الرد المقطوع بالطول يُعلَن", async () => {
    transport.script = async ({ onMeta, onDelta }) => {
      onMeta({ engine: "gpt", fallback: null });
      onDelta("طويل");
      return ok(true);
    };
    render(<FinnChat engine={GPT_READY} />);
    await send("س");
    await waitFor(() => expect(screen.getByText(/قُطع الرد عند الحدّ الأقصى/)).toBeInTheDocument());
  });

  it("المحادثة تُرسل كاملة بدورها في الطلب الثاني", async () => {
    render(<FinnChat engine={GPT_READY} />);
    await send("السؤال الأول");
    await waitFor(() => expect(screen.getByText(/مرحبًا بك/)).toBeInTheDocument());
    await send("السؤال الثاني");
    await waitFor(() => expect(transport.calls).toHaveLength(2));
    expect(transport.calls[1]).toEqual([
      { role: "user", content: "السؤال الأول" },
      { role: "assistant", content: "مرحبًا بك" },
      { role: "user", content: "السؤال الثاني" },
    ]);
  });

  it("«محادثة جديدة» تمسح كل شيء وتعيد الحالة الفارغة", async () => {
    render(<FinnChat engine={GPT_READY} />);
    await send("س");
    await waitFor(() => expect(screen.getByText(/مرحبًا بك/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /محادثة جديدة/ }));
    expect(screen.queryByText(/مرحبًا بك/)).not.toBeInTheDocument();
    expect(screen.getByText("بماذا أساعدك اليوم؟")).toBeInTheDocument();
  });

  it("الانتظار قبل أول مخرج: «فِن يفكّر…» وزرّ إيقاف، ثم ينتهي", async () => {
    let release: (() => void) | undefined;
    transport.script = ({ onMeta, onDelta }) =>
      new Promise((resolve) => {
        release = () => {
          onMeta({ engine: "gpt", fallback: null });
          onDelta("تم");
          resolve(ok());
        };
      });
    render(<FinnChat engine={GPT_READY} />);
    await send("س");
    expect(screen.getByRole("status")).toHaveTextContent("فِن يفكّر");
    expect(screen.getByRole("button", { name: /إيقاف/ })).toBeInTheDocument();
    await act(async () => release?.());
    await waitFor(() => expect(screen.getByText("تم")).toBeInTheDocument());
    expect(screen.queryByText(/فِن يفكّر/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /إرسال/ })).toBeInTheDocument();
  });
});

describe("الخطأ العربي وإعادة المحاولة", () => {
  it("يعرض رسالة عربية بزرّ إعادة المحاولة، ويُزيل الرد الفارغ", async () => {
    transport.script = async () => fail("engine", "تعذّر الحصول على ردّ من المحرّكين الآن.");
    render(<FinnChat engine={GPT_READY} />);
    await send("س");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("تعذّر الحصول على ردّ من المحرّكين الآن.");
    expect(within(alert).getByRole("button", { name: /إعادة المحاولة/ })).toBeInTheDocument();
    expect(alert.textContent).not.toMatch(/unauthor|token|jwt|bearer|api[\s_-]?key/i);
    expect(document.querySelector("article")).toBeNull();
  });

  it("إعادة المحاولة تعيد الإرسال بلا تكرار رسالة المستخدم", async () => {
    let attempt = 0;
    transport.script = async ({ onMeta, onDelta }) => {
      attempt += 1;
      if (attempt === 1) return fail("network", "تعذّر الاتصال بالخادم.");
      onMeta({ engine: "gpt", fallback: null });
      onDelta("نجح");
      return ok();
    };
    render(<FinnChat engine={GPT_READY} />);
    await send("سؤالي");
    const alert = await screen.findByRole("alert");
    await act(async () => {
      fireEvent.click(within(alert).getByRole("button", { name: /إعادة المحاولة/ }));
    });
    await waitFor(() => expect(screen.getByText("نجح")).toBeInTheDocument());
    expect(screen.getAllByText("سؤالي")).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(transport.calls).toHaveLength(2);
    expect(transport.calls[1]).toEqual([{ role: "user", content: "سؤالي" }]);
  });

  it("W5 #8 إعادة المحاولة بالكيبورد لا تُضيع التركيز: ينتقل إلى حقل الكتابة", async () => {
    transport.script = async () => fail("network", "تعذّر الاتصال بالخادم.");
    render(<FinnChat engine={GPT_READY} />);
    await send("سؤالي");
    const alert = await screen.findByRole("alert");
    const retryButton = within(alert).getByRole("button", { name: /إعادة المحاولة/ });
    retryButton.focus();
    expect(document.activeElement).toBe(retryButton);
    await act(async () => {
      fireEvent.click(retryButton);
    });
    // الزرّ زال مع التنبيه، والتركيز لم يسقط على <body>.
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(textbox());
  });

  it("فشلٌ بعد وصول نصٍّ جزئيّ: يبقى الجزء موسومًا ناقصًا مع الخطأ", async () => {
    transport.script = async ({ onMeta, onDelta }) => {
      onMeta({ engine: "gpt", fallback: null });
      onDelta("بداية");
      return fail("engine", "انقطع البثّ قبل اكتمال الرد.");
    };
    render(<FinnChat engine={GPT_READY} />);
    await send("س");
    await screen.findByRole("alert");
    expect(screen.getByText("بداية")).toBeInTheDocument();
    expect(screen.getByText("توقّف الرد قبل اكتماله.")).toBeInTheDocument();
  });
});

describe("كتل الكود والـMarkdown", () => {
  const withReply = (text: string) => {
    transport.script = async ({ onMeta, onDelta }) => {
      onMeta({ engine: "gpt", fallback: null });
      onDelta(text);
      return ok();
    };
  };

  it("كتلة مسوّرة: اسم اللغة وزرّ «نسخ» ينسخ الكود وحده", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    withReply("هذه الدالة:\n\n```ts\nexport const a = 1;\n```\n\nانتهى.");
    render(<FinnChat engine={GPT_READY} />);
    await send("س");
    const copy = await screen.findByRole("button", { name: /نسخ/ });
    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(document.querySelector("pre")?.getAttribute("dir")).toBe("ltr");
    await act(async () => {
      fireEvent.click(copy);
    });
    expect(writeText).toHaveBeenCalledWith("export const a = 1;");
    await waitFor(() => expect(screen.getByText("تم النسخ")).toBeInTheDocument());
  });

  it("فشل النسخ يُعلَن ولا ينهار", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    Object.defineProperty(document, "execCommand", { value: () => false, configurable: true });
    withReply("```sql\nselect 1;\n```");
    render(<FinnChat engine={GPT_READY} />);
    await send("س");
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /نسخ/ }));
    });
    await waitFor(() => expect(screen.getByText("تعذّر النسخ")).toBeInTheDocument());
  });

  it("HTML الخام لا يُنفَّذ ولا يُعرض كعنصر", async () => {
    withReply('<img src=x onerror="alert(1)"> <script>alert(2)</script> <b>غامق</b>');
    const { container } = render(<FinnChat engine={GPT_READY} />);
    await send("س");
    await waitFor(() => expect(container.querySelector("article")).not.toBeNull());
    const article = container.querySelector("article") as HTMLElement;
    expect(article.querySelector("script")).toBeNull();
    expect(article.querySelector("img")).toBeNull();
    expect(article.querySelector("b")).toBeNull();
  });

  it("الصور لا تُحمَّل (بدائلها النصّية فقط) والروابط بـrel آمن في تبويبٍ جديد", async () => {
    withReply("![شعار](https://example.com/x.png) و[موقع](https://example.com)");
    const { container } = render(<FinnChat engine={GPT_READY} />);
    await send("س");
    const link = await screen.findByRole("link", { name: "موقع" });
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("[شعار]");
  });

  it("رابط javascript: لا يصير href", async () => {
    withReply("[اضغط](javascript:alert(1))");
    const { container } = render(<FinnChat engine={GPT_READY} />);
    await send("س");
    await waitFor(() => expect(container.querySelector("article")).not.toBeNull());
    const anchors = [...container.querySelectorAll("article a")];
    for (const a of anchors) expect(a.getAttribute("href") ?? "").not.toMatch(/^javascript:/i);
  });

  it("W5 #7 رابط غير آمن لا يصير <a> فارغ الوجهة بتبويبٍ جديد — نصٌّ عاديّ", async () => {
    withReply(
      "[أ](javascript:alert(1)) [ب](data:text/html;base64,AAAA) [ج](/relative) [د](#frag) و[سليم](https://example.com/p)",
    );
    const { container } = render(<FinnChat engine={GPT_READY} />);
    await send("س");
    await screen.findByRole("link", { name: "سليم" });
    const anchors = [...container.querySelectorAll("article a")];
    expect(anchors).toHaveLength(1);
    expect(anchors[0].getAttribute("href")).toBe("https://example.com/p");
    // الوجهة الحقيقية ظاهرة للمالك قبل النقر.
    expect(anchors[0].getAttribute("title")).toBe("https://example.com/p");
    // وغير الآمنة بقي نصّها المقروء.
    for (const label of ["أ", "ب", "ج", "د"]) {
      expect(container.querySelector("article")?.textContent).toContain(label);
    }
    expect(container.querySelector('article a[href=""]')).toBeNull();
  });

  it("mailto: مسموح", async () => {
    withReply("[راسل](mailto:a@b.co)");
    const { container } = render(<FinnChat engine={GPT_READY} />);
    await send("س");
    await screen.findByRole("link", { name: "راسل" });
    expect(container.querySelector("article a")?.getAttribute("href")).toBe("mailto:a@b.co");
  });

  it("الجداول (GFM) تُرسم داخل صندوق يتمرّر أفقيًّا", async () => {
    withReply("| أ | ب |\n|---|---|\n| 1 | 2 |");
    const { container } = render(<FinnChat engine={GPT_READY} />);
    await send("س");
    const table = await waitFor(() => {
      const t = container.querySelector("article table");
      if (!t) throw new Error("no table");
      return t;
    });
    expect(table.parentElement?.className).toMatch(/overflow-x-auto/);
  });

  it("نصّ المستخدم يُعرض نصًّا خامًا — وسمٌ مكتوب لا يصير عنصرًا", async () => {
    render(<FinnChat engine={GPT_READY} />);
    await send("<script>x</script> **غامق**");
    await waitFor(() =>
      expect(screen.getByText(/<script>x<\/script> \*\*غامق\*\*/)).toBeInTheDocument(),
    );
    expect(document.querySelector("script")).toBeNull();
  });
});

describe("الإرسال", () => {
  it("رسالة فارغة لا تُرسل، والزرّ معطّل", () => {
    render(<FinnChat engine={GPT_READY} />);
    expect(screen.getByRole("button", { name: /إرسال/ })).toBeDisabled();
    fireEvent.change(textbox(), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: /إرسال/ })).toBeDisabled();
  });

  it("Enter يرسل وShift+Enter لا يرسل (سطح المكتب)", async () => {
    render(<FinnChat engine={GPT_READY} />);
    fireEvent.change(textbox(), { target: { value: "سؤال" } });
    fireEvent.keyDown(textbox(), { key: "Enter", shiftKey: true });
    expect(transport.calls).toHaveLength(0);
    await act(async () => {
      fireEvent.keyDown(textbox(), { key: "Enter" });
    });
    await waitFor(() => expect(transport.calls).toHaveLength(1));
  });

  // W5 #9: كان `maxLength` يقصّ اللصق الطويل بصمت فيُرسَل ناقصًا. الحدّ باقٍ (حدّ الخادم نفسه)
  // لكن بالإعلان والمنع لا بالبتر الصامت.
  it("لا maxlength: لصقٌ أطول من الحدّ يبقى كاملًا ويُمنع إرساله بتحذيرٍ صريح", () => {
    render(<FinnChat engine={GPT_READY} />);
    expect(textbox().getAttribute("maxlength")).toBeNull();
    const pasted = "x".repeat(FINN_LIMITS.maxMessageChars + 9_000);
    fireEvent.change(textbox(), { target: { value: pasted } });
    expect((textbox() as HTMLTextAreaElement).value).toHaveLength(pasted.length);
    expect(screen.getByRole("button", { name: /إرسال/ })).toBeDisabled();
    const warning = screen.getByText(/أطول من الحدّ/);
    expect(warning).toHaveTextContent((9_000).toLocaleString("ar-SA"));
    expect(transport.calls).toHaveLength(0);
  });

  it("عند الحدّ تمامًا يُرسَل، وبعد التقليص يزول التحذير ويعود الإرسال", async () => {
    render(<FinnChat engine={GPT_READY} />);
    fireEvent.change(textbox(), {
      target: { value: "x".repeat(FINN_LIMITS.maxMessageChars + 1) },
    });
    expect(screen.getByRole("button", { name: /إرسال/ })).toBeDisabled();
    fireEvent.change(textbox(), { target: { value: "x".repeat(FINN_LIMITS.maxMessageChars) } });
    expect(screen.queryByText(/أطول من الحدّ/)).toBeNull();
    expect(screen.getByRole("button", { name: /إرسال/ })).toBeEnabled();
  });
});
