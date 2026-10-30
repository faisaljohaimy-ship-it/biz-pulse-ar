/**
 * سطح `/sadeed-documents` (O7 د): نتيجة البحث لا تطبع `0%` ولا `NaN%` ولا `null%` حين
 * يصل التشابه فارغًا. كان السطر `تطابق {Math.round(m.similarity * 100)}%` بلا حارس:
 * `null` ⇒ «تطابق 0%»، و`undefined` ⇒ «تطابق NaN%». يُرسم المكوّن الحقيقي بدوالّ خادم
 * مزروعة، ويُكتب البحث ويُضغط Enter كما يفعل المستخدم.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

type Match = {
  chunk_id: string;
  document_id: string;
  title: string;
  content: string;
  similarity: unknown;
};

const server = vi.hoisted(() => ({ matches: [] as unknown[] }));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
  createServerFn: () => ({}),
}));
vi.mock("@/lib/sadeed/documents.functions", () => ({
  listSadeedDocuments: async () => [],
  ingestSadeedDocument: async () => ({}),
  deleteSadeedDocument: async () => ({}),
  searchSadeedDocuments: async () => ({ matches: server.matches }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) }, storage: {} },
}));

const match = (n: number, similarity: unknown): Match => ({
  chunk_id: `chunk-${n}`,
  document_id: "doc-1",
  title: `مستند ${n}`,
  content: `نصّ المقطع ${n}`,
  similarity,
});

/** نص الدرجات وحدها: كل بطاقة نتيجة تحمل الدرجة في آخر `span` من صفّ العنوان. */
async function renderSearch(matches: Match[]) {
  server.matches = matches;
  const { Route } = (await import("./sadeed-documents")) as unknown as {
    Route: { options: { component: () => React.ReactElement } };
  };
  const Page = Route.options.component;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  const input = screen.getByPlaceholderText(/ما إجراءات الإخلاء/);
  fireEvent.change(input, { target: { value: "إجراءات الإخلاء" } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(screen.getByText("مستند 1")).toBeTruthy());
  const scores = matches.map((m) => {
    const card = screen.getByText(m.title).closest("div")?.parentElement;
    return card?.querySelector("div > span:last-child")?.textContent ?? "";
  });
  return { view, scores };
}

describe("سطح /sadeed-documents: التشابه الفارغ لا يُطبع نسبةً", () => {
  it("كوساين محسوب ⇒ «تطابق 82%»", async () => {
    const { scores } = await renderSearch([match(1, 0.82)]);
    expect(scores).toEqual(["تطابق 82%"]);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["NaN", Number.NaN],
    ["0", 0],
  ])("similarity=%s ⇒ «تطابق لم يُقَس» لا 0% ولا NaN%", async (_label, value) => {
    const { scores, view } = await renderSearch([match(1, value)]);
    expect(scores).toEqual(["تطابق لم يُقَس"]);
    const text = view.container.textContent ?? "";
    expect(text).not.toMatch(/NaN|null|undefined/);
    expect(text).not.toMatch(/(^|[^\d.])0%/);
  });

  it("مختلطة: المحسوب ينسب والفارغ يُوسم — في الصفحة نفسها", async () => {
    const { scores } = await renderSearch([match(1, 0.91), match(2, null), match(3, undefined)]);
    expect(scores).toEqual(["تطابق 91%", "تطابق لم يُقَس", "تطابق لم يُقَس"]);
  });

  it("المصدر: لا ضرب في مئة لتشابه في الصفحة، والوسم من المكوّن المشترك", () => {
    const src = readFileSync("src/routes/_authenticated/sadeed-documents.tsx", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[\s;{}(])\/\/[^\n]*/gm, "$1");
    expect(src).not.toMatch(/similarity\s*\*\s*100/);
    expect(src).toMatch(/<SimilarityLabel\b/);
    // مزروع: السطر القديم يُدان بالكاشف نفسه.
    expect("{Math.round(m.similarity * 100)}%".match(/similarity\s*\*\s*100/)).not.toBeNull();
  });
});
