/**
 * سطح `/sec/knowledge` (O7 د): البحث الدلالي. كان مقيَّدًا بـ`h.similarity != null`
 * فيخفي الفارغ، لكنّ الصفر («لم يُقَس» في هذا المستودع) كان يمرّ فيطبع `0%`. الحارس صار
 * وسمًا محايدًا: «تطابق لم يُقَس» في الوضع الدلالي، و«مطابقة نصّية» في الوضع النصّي
 * الاحتياطي. يُرسم المكوّن الحقيقي بدوالّ خادم مزروعة ويُكتب البحث كما يفعل المستخدم.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({
  mode: "semantic" as "semantic" | "keyword",
  similarities: [] as unknown[],
}));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
  createServerFn: () => ({}),
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Link: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/components/sec/sec-shell", () => ({
  SecPageHeader: ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {children}
    </header>
  ),
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("@/lib/authz.functions", () => ({
  getCurrentUserIsAdmin: async () => ({ isAdmin: false }),
}));
vi.mock("@/lib/kb.functions", () => ({
  kbListCategories: async () => [],
  kbListArticles: async () => [],
  kbGetArticle: async () => null,
  kbSeedFoundational: async () => ({ upserted: 0 }),
  kbEmbedMissing: async () => ({ updated: 0, remaining: 0, failures: [] }),
  kbStats: async () => ({ total: 0, embedded: 0 }),
  kbSemanticSearch: async () => ({
    mode: server.mode,
    reason: null,
    hits: server.similarities.map((similarity, i) => ({
      id: `hit-${i + 1}`,
      doc_code: `KB-${i + 1}`,
      title_ar: `مقالة ${i + 1}`,
      title_en: null,
      summary_ar: `ملخّص ${i + 1}`,
      summary_en: null,
      category_code: null,
      risk_level: null,
      priority: null,
      similarity,
    })),
  }),
}));

/** نصّ الدرجة في كل نتيجة: آخر عنصر في صفّ العنوان داخل زرّ النتيجة. */
async function search(mode: "semantic" | "keyword", similarities: unknown[]) {
  server.mode = mode;
  server.similarities = similarities;
  const { Route } = (await import("./sec.knowledge")) as unknown as {
    Route: { options: { component: () => React.ReactElement } };
  };
  const Page = Route.options.component;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByPlaceholderText(/ماذا أفعل عند تسرب الغاز/), {
    target: { value: "تسرب الغاز" },
  });
  await waitFor(() => expect(screen.getByText("مقالة 1")).toBeTruthy());
  const scores = similarities.map((_, i) => {
    const button = screen.getByText(`مقالة ${i + 1}`).closest("button");
    return button?.querySelector("div > span")?.textContent ?? "";
  });
  return { scores, view };
}

describe("سطح /sec/knowledge: التشابه الفارغ لا يُطبع نسبةً", () => {
  it("الدلالي بكوساين محسوب ⇒ «تطابق 82%»", async () => {
    const { scores } = await search("semantic", [0.82]);
    expect(scores).toEqual(["تطابق 82%"]);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["NaN", Number.NaN],
    ["0", 0],
  ])("الدلالي وsimilarity=%s ⇒ «تطابق لم يُقَس»", async (_label, value) => {
    const { scores, view } = await search("semantic", [value]);
    expect(scores).toEqual(["تطابق لم يُقَس"]);
    const hitsText = Array.from(view.container.querySelectorAll("button"))
      .map((b) => b.textContent)
      .join(" ");
    expect(hitsText).not.toMatch(/NaN|null|undefined/);
    expect(hitsText).not.toMatch(/(^|[^\d.])0%/);
  });

  it("النصّي الاحتياطي (similarity=null بالبناء) ⇒ «مطابقة نصّية» بلا نسبة", async () => {
    const { scores } = await search("keyword", [null, null]);
    expect(scores).toEqual(["مطابقة نصّية", "مطابقة نصّية"]);
  });

  it("المصدر: لا ضرب في مئة لتشابه في الصفحة، والوسم من المكوّن المشترك", () => {
    const src = readFileSync("src/routes/_authenticated/sec.knowledge.tsx", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[\s;{}(])\/\/[^\n]*/gm, "$1");
    expect(src).not.toMatch(/similarity\s*\*\s*100/);
    expect(src).toMatch(/<SimilarityLabel\b/);
    // مزروع: السطر القديم المحروس بـ`!= null` وحده يطبع 0% للصفر.
    const oldGuarded = (s: number | null) => (s != null ? `${(s * 100).toFixed(0)}%` : "");
    expect(oldGuarded(0)).toBe("0%");
    expect(oldGuarded(Number.NaN)).toBe("NaN%");
    expect(oldGuarded(null)).toBe("");
  });
});
