/**
 * fixtures: ردود مزوّدين جاهزة بأشكالها الحقيقية (مقتضبة)، ونقل HTTP مُحقَن لمحرّك الاختبار
 * وخادم stub. كلها بيانات اختبار مكتوبة يدويًّا، لا أرقام مقيسة ولا ادّعاء عن المزوّدين.
 *
 * `routeFor(url)` يحدّد المزوّد من المضيف/المسار (يقبل عنوان stub أيضًا). `makeTransport(plan)`
 * يعيد نقلًا يقرأ سلوك كل مزوّد من الخطة: "ok" | "timeout" | "reset" | "oversize" |
 * "malformed" | "status500" | {status, body, latencyMs} (الحقول الغائبة من الكائن تأخذ الردّ الاعتيادي).
 */

export const STUB_PREFIX = "http://127.0.0.1:8787/stub/";

export const FIXTURES = {
  google: {
    items: [
      {
        title: "Hot work permit | HCIS",
        link: "https://hcis.gov.sa/permits/hot-work",
        snippet: "Hot work permit requirements for industrial sites.",
        pagemap: { metatags: [{ "article:published_time": "2026-05-01T00:00:00Z" }] },
      },
      {
        title: "Guideline",
        link: "https://www.moi.gov.sa/guides/g1?utm_source=newsletter",
        snippet: "General guideline.",
      },
    ],
  },
  brave: {
    web: {
      results: [
        {
          title: "<strong>Hot</strong> work permit | HCIS",
          url: "https://www.hcis.gov.sa/permits/hot-work/",
          description: "Duplicate of the Google result with <b>markup</b>.",
          page_age: "2026-04-01T10:00:00",
        },
        {
          title: "Blog post",
          url: "https://blog.example.com/hot-work",
          description: "A blog post about hot work.",
        },
      ],
    },
  },
  tavily: {
    results: [
      {
        title: "Regulation text",
        url: "https://laws.boe.gov.sa/reg/123",
        content: "The regulation states the obligations of the operator.",
        published_date: "2025-12-31",
      },
    ],
  },
  github: {
    items: [
      {
        name: "retry.ts",
        path: "src/retry.ts",
        html_url: "https://github.com/example/repo/blob/main/src/retry.ts",
        repository: { full_name: "example/repo", description: "Retry helpers" },
        text_matches: [{ fragment: "export async function retry() {}" }],
      },
    ],
  },
  wikipedia: {
    query: {
      search: [
        {
          title: "Hot work",
          snippet: 'Hot <span class="searchmatch">work</span> is any process that generates heat.',
          timestamp: "2026-01-02T03:04:05Z",
        },
      ],
    },
  },
  wikidata: {
    search: [
      {
        id: "Q12345",
        label: "Hot work",
        description: "welding and cutting",
        concepturi: "http://www.wikidata.org/entity/Q12345",
      },
    ],
  },
  openalex: {
    results: [
      {
        id: "https://openalex.org/W1",
        display_name: "A study of hot work incidents",
        doi: "https://doi.org/10.1000/xyz",
        publication_date: "2021-03-04",
        primary_location: { source: { display_name: "Journal of Safety" } },
      },
    ],
  },
  mdn: {
    documents: [
      {
        title: "fetch()",
        mdn_url: "/en-US/docs/Web/API/Window/fetch",
        summary: "The fetch method.",
      },
    ],
  },
  npm: {
    objects: [
      {
        package: {
          name: "zod",
          version: "4.6.7",
          description: "TypeScript-first schema validation",
          date: "2026-09-01T00:00:00.000Z",
          links: { npm: "https://www.npmjs.com/package/zod" },
        },
      },
    ],
  },
  nvd: {
    vulnerabilities: [
      {
        cve: {
          id: "CVE-2024-12345",
          published: "2024-06-01T00:00:00.000",
          descriptions: [{ lang: "en", value: "A vulnerability description." }],
        },
      },
    ],
  },
  osv: {
    vulns: [
      {
        id: "GHSA-aaaa-bbbb-cccc",
        summary: "Prototype pollution in zod-like",
        published: "2024-06-01T00:00:00Z",
        modified: "2024-07-01T00:00:00Z",
      },
    ],
  },
  osvById: {
    id: "GHSA-aaaa-bbbb-cccc",
    summary: "Prototype pollution in zod-like",
    published: "2024-06-01T00:00:00Z",
  },
  advisories: [
    {
      ghsa_id: "GHSA-1111-2222-3333",
      severity: "critical",
      summary: "Remote code execution in example-package",
      vulnerabilities: [{ package: { name: "example-package" } }],
    },
    {
      ghsa_id: "GHSA-4444-5555-6666",
      severity: "high",
      summary: "Path traversal in other-package",
      vulnerabilities: [{ package: { name: "other-package" } }],
    },
  ],
  appHealth: { status: "ok", subsystems: { web: { status: "ok" }, db: { status: "ok" } } },
  chatHealth: { ok: true, gate: "verified", key_present: true },
  telegram: { ok: true, result: { message_id: 1 } },
};

/** يحدّد اسم المزوّد من العنوان (يزيل بادئة stub إن وُجدت). */
export function routeFor(rawUrl) {
  const stripped = rawUrl.startsWith(STUB_PREFIX)
    ? "https://" + rawUrl.slice(STUB_PREFIX.length)
    : rawUrl;
  let host = "";
  let path = "";
  const m = /^https?:\/\/([^/?#]+)([^?#]*)/.exec(stripped);
  if (m) {
    host = m[1].toLowerCase();
    path = m[2];
  }
  if (host === "www.googleapis.com") return "google";
  if (host === "api.search.brave.com") return "brave";
  if (host === "api.tavily.com") return "tavily";
  if (host === "api.github.com") return path.startsWith("/advisories") ? "advisories" : "github";
  if (host === "api.osv.dev") return path.startsWith("/v1/vulns/") ? "osvById" : "osv";
  if (host.endsWith(".wikipedia.org")) return "wikipedia";
  if (host === "www.wikidata.org") return "wikidata";
  if (host === "api.openalex.org") return "openalex";
  if (host === "developer.mozilla.org") return "mdn";
  if (host === "registry.npmjs.org") return "npm";
  if (host === "services.nvd.nist.gov") return "nvd";
  if (path.endsWith("/api/public/health")) return "appHealth";
  if (path.endsWith("/api/chat/health")) return "chatHealth";
  return "unknown";
}

function oversizePayload(name) {
  const big = "x".repeat(2000);
  const row = {
    title: big,
    link: "https://example.com/" + big,
    url: "https://example.com/" + big,
    snippet: big,
  };
  if (name === "google") return { items: Array.from({ length: 2000 }, () => row) };
  return JSON.stringify({ blob: big.repeat(300) });
}

/**
 * @param {Record<string, any>} plan اسم المزوّد ← سلوك. غير المذكور = "ok" بزمن 120 مللي ثانية.
 * @param {{calls?: object[]}} [sink]
 */
export function makeTransport(plan = {}, sink = {}) {
  sink.calls = sink.calls || [];
  return async (req) => {
    const name = routeFor(req.url);
    sink.calls.push({ name, url: req.url, method: req.method, node: req.node });
    const behaviour = plan[name] === undefined ? "ok" : plan[name];
    const latencyMs = 120;
    if (behaviour === "ok") {
      return { status: 200, body: FIXTURES[name] === undefined ? {} : FIXTURES[name], latencyMs };
    }
    if (behaviour === "timeout") return { status: 200, body: {}, latencyMs: req.timeoutMs + 5000 };
    if (behaviour === "reset") {
      const error = new Error("socket hang up");
      error.latencyMs = 40;
      throw error;
    }
    if (behaviour === "malformed") return { status: 200, body: "{not json at all", latencyMs };
    if (behaviour === "oversize") return { status: 200, body: oversizePayload(name), latencyMs };
    if (behaviour === "status500") return { status: 500, body: "boom", latencyMs };
    if (typeof behaviour === "object") {
      // كائن بلا body = ردّ المزوّد الاعتيادي بهذا الكمون (مثلًا {latencyMs: 300}).
      return {
        status: 200,
        body: FIXTURES[name] === undefined ? {} : FIXTURES[name],
        latencyMs,
        ...behaviour,
      };
    }
    throw new Error("سلوك نقل غير معروف: " + String(behaviour));
  };
}
