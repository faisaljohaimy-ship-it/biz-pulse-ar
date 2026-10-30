/**
 * قياس O7 (د): كم سطحًا يطبع `NaN%`/`0%`/`null%`/`undefined%` حين يصل التشابه فارغًا؟
 *
 * الأسطح الثلاثة: `/sadeed-documents` (نتيجة البحث) و`/sec/knowledge` (البحث الدلالي)
 * ونصّ وكيل المعرفة (دليل `[مرجع … · تطابق …]` و«أعلى تطابق»). المدخلات الأربعة الثابتة
 * `null · undefined · NaN · 0` — كل خلية (سطح × مدخل) تُحكم بنصّ ما رُسم فعلًا.
 *
 * **قائمٌ بذاته**: لا يستورد وحدة جديدة، فيُشغَّل نفسه على الشجرة الأقدم (`75a23048c`):
 *   `O7_MEASURE_ONLY=1 npx vitest run src/lib/sadeed/rag/o7-surfaces.measure.test.tsx`
 * (لا تأكيدات «بعد»). على الشجرة الحالية يثبّت `0` سطحًا و`0` خلية — حارس انحدار.
 *
 * حدوده: يقيس ما يُرسم من مكوّنات الأسطح بدوالّ خادم مزروعة، لا الإنتاج؛
 * وما يبلغه تشابهٌ فارغ في الإنتاج اليوم «لم يُقَس».
 */
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const MEASURE_ONLY = process.env.O7_MEASURE_ONLY === "1";
const BAD = /(^|[^\d.])0%|NaN|null|undefined/;
const INPUTS: Array<[string, unknown]> = [
  ["null", null],
  ["undefined", undefined],
  ["NaN", Number.NaN],
  ["0", 0],
];

const server = vi.hoisted(() => ({ similarity: null as unknown }));

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
    mode: "semantic",
    reason: null,
    hits: [
      {
        id: "hit-1",
        doc_code: "KB-1",
        title_ar: "مقالة ألف",
        title_en: null,
        summary_ar: "ملخّص",
        summary_en: null,
        category_code: null,
        risk_level: null,
        priority: null,
        similarity: server.similarity,
      },
    ],
  }),
}));
vi.mock("@/lib/sadeed/documents.functions", () => ({
  listSadeedDocuments: async () => [],
  ingestSadeedDocument: async () => ({}),
  deleteSadeedDocument: async () => ({}),
  searchSadeedDocuments: async () => ({
    matches: [
      {
        chunk_id: "chunk-1",
        document_id: "doc-1",
        title: "مستند ألف",
        content: "نصّ المقطع",
        similarity: server.similarity,
      },
    ],
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) }, storage: {} },
}));
vi.mock("@/lib/sadeed/rag/retrieve.server", () => ({
  retrieveWithEvidenceGate: async () => ({
    gate_result: "passed",
    max_similarity: server.similarity,
    hits: [
      {
        id: "kb-1",
        doc_code: "SEC-01",
        title_ar: "توجيه ألف",
        title_en: null,
        summary_ar: "ملخّص",
        summary_en: null,
        arm: "hybrid",
        // الكوساين المحسوب (`dense_score`) هو ما يقرؤه الوكيل، و`similarity` رقم البوّابة الذي
        // قرأه قبل المراجعة: الحقلان يحملان المدخل نفسه كي يبقى القياس صالحًا على الشجرتين.
        dense_score: server.similarity,
        similarity: server.similarity,
      },
    ],
  }),
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));

type Page = { Route: { options: { component: () => React.ReactElement } } };
const wrap = (el: React.ReactElement) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {el}
  </QueryClientProvider>
);

/** نصّ ما رُسم في سطح المستندات. */
async function documentsText(): Promise<string> {
  const { Route } = (await import("@/routes/_authenticated/sadeed-documents")) as unknown as Page;
  const Component = Route.options.component;
  const view = render(wrap(<Component />));
  const input = screen.getByPlaceholderText(/ما إجراءات الإخلاء/);
  fireEvent.change(input, { target: { value: "إجراءات الإخلاء" } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(screen.getByText("مستند ألف")).toBeTruthy());
  const text = screen.getByText("مستند ألف").closest("div")?.parentElement?.textContent ?? "";
  view.unmount();
  return text;
}

/** نصّ ما رُسم في سطح المعرفة (زرّ النتيجة وحده — لا بطاقة التغطية). */
async function knowledgeText(): Promise<string> {
  const { Route } = (await import("@/routes/_authenticated/sec.knowledge")) as unknown as Page;
  const Component = Route.options.component;
  const view = render(wrap(<Component />));
  fireEvent.change(screen.getByPlaceholderText(/ماذا أفعل عند تسرب الغاز/), {
    target: { value: "تسرب الغاز" },
  });
  await waitFor(() => expect(screen.getByText("مقالة ألف")).toBeTruthy());
  const text = screen.getByText("مقالة ألف").closest("button")?.textContent ?? "";
  view.unmount();
  return text;
}

/** نصّ دليل الوكيل ونصّه العربي المجمَّع. */
async function agentText(): Promise<string> {
  await import("@/lib/sadeed/orchestrator/agents");
  const { getAgent } = await import("@/lib/sadeed/orchestrator/registry");
  const result = await getAgent("knowledge")!.run({
    mission_id: "m-1",
    request: { question: "ما اشتراطات الأسوار؟", orgId: null } as never,
    memory: null,
    prior_results: [],
    signal: new AbortController().signal,
  });
  const c = result.contribution as { text_ar?: string; evidence?: string[] };
  return `${c.text_ar ?? ""}\n${(c.evidence ?? []).join("\n")}`;
}

const SURFACES: Array<[string, () => Promise<string>]> = [
  ["/sadeed-documents", documentsText],
  ["/sec/knowledge", knowledgeText],
  ["نصّ وكيل المعرفة", agentText],
];

describe("O7 (د): الأسطح الثلاثة × أربعة مدخلات فارغة", () => {
  it("يعدّ الأسطح والخلايا التي تطبع NaN/0%/null/undefined", async () => {
    const bad: Record<string, string[]> = {};
    for (const [surface, render_] of SURFACES) {
      bad[surface] = [];
      for (const [label, value] of INPUTS) {
        server.similarity = value;
        const text = await render_();
        cleanup();
        if (BAD.test(text)) bad[surface]!.push(label);
      }
    }
    const surfacesBad = Object.values(bad).filter((v) => v.length > 0).length;
    const cellsBad = Object.values(bad).reduce((n, v) => n + v.length, 0);
    process.stdout.write(
      `O7_SURFACES_MEASURE ${JSON.stringify({ surfaces: SURFACES.length, inputs: INPUTS.length, surfacesBad, cellsBad, bad })}\n`,
    );
    expect(SURFACES).toHaveLength(3);
    if (!MEASURE_ONLY) {
      expect(surfacesBad).toBe(0);
      expect(cellsBad).toBe(0);
    }
  });
});
