// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * اختبارات أدوات الدعم: المحرّك المصغّر نفسه (حرّاسه تحمرّ على الانتهاك)، وخادم stub، وسكربت التوقيع،
 * ومُولِّد المسارات. لا يثبت شيئًا عن n8n الحقيقي: المحرّك ليس n8n (انظر ترويسته).
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evalValue, runWorkflow } from "../test-support/mini-engine.js";
import { FIXTURES, makeTransport, routeFor } from "../test-support/fixtures.js";
import { createStubServer } from "../test-support/stub-server.mjs";
import {
  buildSignedRequest,
  curlCommand,
  verifyResponse,
} from "../../scripts/n8n-sign-example.mjs";
import {
  ENV,
  NOW,
  ROOT,
  SECRET_FNN,
  SECRET_SADEED,
  UUID,
  invariantProblems,
  loadCode,
  researchBody,
  runSigned,
  workflowByName,
} from "./helpers.js";

const node = (name: string, type: string, parameters: any = {}, extra: any = {}) => ({
  id: name,
  name,
  type: "n8n-nodes-base." + type,
  typeVersion: 1,
  position: [0, 0],
  parameters,
  ...extra,
});
const conn = (from: string, to: string, out = 0, input = 0) => ({
  [from]: {
    main: Array.from({ length: out + 1 }, (_, i) =>
      i === out ? [{ node: to, type: "main", index: input }] : [],
    ),
  },
});
const webhookNode = () =>
  node("Webhook", "webhook", {
    httpMethod: "POST",
    path: "p",
    responseMode: "responseNode",
    options: {},
  });
const codeNode = (name: string, jsCode: string, extra: any = {}) =>
  node(name, "code", { language: "javaScript", mode: "runOnceForAllItems", jsCode }, extra);
const respondNode = (name = "Respond", body = "ok") =>
  node(name, "respondToWebhook", { respondWith: "text", responseBody: body, options: {} });
const wf = (nodes: any[], connections: any) => ({
  name: "t",
  nodes,
  connections: Object.assign({}, ...connections),
  settings: {},
});
const hook = { type: "webhook", path: "p", headers: {}, body: {}, rawBody: "{}" };

describe("mini-engine: التعابير (أربعة أشكال فقط)", () => {
  const scope = {
    json: { a: { b: "x", n: 3 }, t: true },
    env: { SADEED_APP_URL: "https://app" },
    clock: { now: () => 123 },
  };
  it("الأشكال المدعومة", () => {
    expect(evalValue("={{ $json.a.b }}", scope)).toBe("x");
    expect(evalValue("={{ $json.a }}", scope)).toEqual({ b: "x", n: 3 });
    expect(evalValue("={{ $json.t }}", scope)).toBe(true);
    expect(evalValue("={{ $env.SADEED_APP_URL }}/api/x", scope)).toBe("https://app/api/x");
    expect(evalValue("={{ Date.now() }}", scope)).toBe(123);
    expect(evalValue("={{ JSON.stringify($json.a) }}", scope)).toBe('{"b":"x","n":3}');
    expect(evalValue("={{ JSON.stringify($json.a.b) }}", scope)).toBe('"x"');
    expect(evalValue("={{ JSON.stringify($json.missing.deep) }}", scope)).toBeUndefined();
    expect(evalValue("literal", scope)).toBe("literal");
    expect(evalValue("={{ $json.missing.deep }}", scope)).toBeUndefined();
    expect(evalValue(["={{ $json.a.b }}", { k: "={{ $json.a.n }}" }], scope)).toEqual([
      "x",
      { k: 3 },
    ]);
  });
  for (const bad of [
    "={{ $json.a.map(x => x) }}",
    "={{ $('N').first().json }}",
    "={{ $json['a'] }}",
    "={{ 1 + 1 }}",
    "={{ $env.lower }}",
    "={{ new Date() }}",
    "={{ JSON.stringify($json) }}",
    "={{ JSON.stringify($env.SADEED_APP_URL) }}",
    "={{ JSON.stringify($json.a, null, 2) }}",
  ]) {
    it("RED: يرمي صراحةً على " + bad, () => {
      expect(() => evalValue(bad, scope)).toThrow(/غير مدعوم/);
    });
  }
});

describe("mini-engine: حرّاسه تحمرّ على الانتهاك", () => {
  it("ردّ واحد على المسار السليم", async () => {
    const r = await runWorkflow(wf([webhookNode(), respondNode()], [conn("Webhook", "Respond")]), {
      trigger: hook,
    });
    expect(r.responses.length).toBe(1);
    expect(r.violations).toEqual([]);
  });
  it("RED: لا ردّ ⇒ no_response", async () => {
    const r = await runWorkflow(
      wf([webhookNode(), node("End", "noOp")], [conn("Webhook", "End")]),
      { trigger: hook },
    );
    expect(r.violations).toContain("no_response");
  });
  it("RED: ردّان ⇒ multiple_responses والثاني لا يُرسَل", async () => {
    const w = wf(
      [webhookNode(), respondNode("R1", "one"), respondNode("R2", "two")],
      [
        {
          Webhook: {
            main: [
              [
                { node: "R1", type: "main", index: 0 },
                { node: "R2", type: "main", index: 0 },
              ],
            ],
          },
        },
      ],
    );
    const r = await runWorkflow(w, { trigger: hook });
    expect(r.violations.join()).toContain("multiple_responses");
    expect(r.responses.length).toBe(1);
    expect(r.responses[0].body).toBe("one");
  });
  it("RED: عقدة تفشل بلا onError توقف التنفيذ وتُسجَّل", async () => {
    const w = wf(
      [webhookNode(), codeNode("Boom", 'throw new Error("x");'), respondNode()],
      [conn("Webhook", "Boom"), conn("Boom", "Respond")],
    );
    const r = await runWorkflow(w, { trigger: hook });
    expect(r.failed).toBe(true);
    expect(r.failedNodes[0].node).toBe("Boom");
    expect(r.violations).toContain("no_response");
  });
  it("continueErrorOutput يوجّه الاستثناء والعناصر ذات json.error إلى المخرج 1", async () => {
    const w = wf(
      [
        webhookNode(),
        codeNode("Boom", 'throw new Error("x");', { onError: "continueErrorOutput" }),
        respondNode("OK", "ok"),
        respondNode("ERR", "err"),
      ],
      [
        { Webhook: { main: [[{ node: "Boom", type: "main", index: 0 }]] } },
        {
          Boom: {
            main: [
              [{ node: "OK", type: "main", index: 0 }],
              [{ node: "ERR", type: "main", index: 0 }],
            ],
          },
        },
      ],
    );
    const r = await runWorkflow(w, { trigger: hook });
    expect(r.responses[0].body).toBe("err");
    const w2 = wf(
      [
        webhookNode(),
        codeNode("Soft", "return [{ json: { error: 'soft' } }];", {
          onError: "continueErrorOutput",
        }),
        respondNode("OK", "ok"),
        respondNode("ERR", "err"),
      ],
      [
        { Webhook: { main: [[{ node: "Soft", type: "main", index: 0 }]] } },
        {
          Soft: {
            main: [
              [{ node: "OK", type: "main", index: 0 }],
              [{ node: "ERR", type: "main", index: 0 }],
            ],
          },
        },
      ],
    );
    expect((await runWorkflow(w2, { trigger: hook })).responses[0].body).toBe("err");
  });
  it("continueRegularOutput يمرّر عنصر الخطأ إلى المخرج 0", async () => {
    const w = wf(
      [
        webhookNode(),
        codeNode("Boom", 'throw new Error("x");', { onError: "continueRegularOutput" }),
        respondNode("OK", "={{ $json.error }}"),
      ],
      [conn("Webhook", "Boom"), conn("Boom", "OK")],
    );
    expect((await runWorkflow(w, { trigger: hook })).responses[0].body).toBe("x");
  });
  it("RED: require لوحدة غير crypto يفشل (NODE_FUNCTION_ALLOW_BUILTIN)", async () => {
    const w = wf(
      [webhookNode(), codeNode("Fs", 'require("fs"); return [{ json: {} }];'), respondNode()],
      [conn("Webhook", "Fs"), conn("Fs", "Respond")],
    );
    const r = await runWorkflow(w, { trigger: hook });
    expect(r.failedNodes[0].error).toMatch(/Cannot find module/);
    const ok = wf(
      [
        webhookNode(),
        codeNode("C", 'require("crypto"); require("node:crypto"); return [{ json: {} }];'),
        respondNode(),
      ],
      [conn("Webhook", "C"), conn("C", "Respond")],
    );
    expect((await runWorkflow(ok, { trigger: hook })).responses.length).toBe(1);
  });
  it("RED: process وfetch محجوبان عن شيفرة Code", async () => {
    const w = wf(
      [
        webhookNode(),
        codeNode("P", "return [{ json: { p: typeof process, f: typeof fetch } }];", {
          onError: "continueRegularOutput",
        }),
        respondNode("R", "={{ $json.p }}-{{ $json.f }}"),
      ],
      [conn("Webhook", "P"), conn("P", "R")],
    );
    expect((await runWorkflow(w, { trigger: hook })).responses[0].body).toBe("undefined-undefined");
  });
  it("RED: Code لا يعيد عناصر صالحة ⇒ يفشل", async () => {
    for (const bad of ["return 5;", "return [1];", "return [{ x: 1 }];", "return;"]) {
      const w = wf(
        [webhookNode(), codeNode("C", bad), respondNode()],
        [conn("Webhook", "C"), conn("C", "Respond")],
      );
      const r = await runWorkflow(w, { trigger: hook });
      expect(r.failedNodes[0].error).toMatch(/return items properly/);
    }
  });
  it("RED: $() على عقدة لم تُنفَّذ يرمي", async () => {
    const w = wf(
      [webhookNode(), codeNode("C", '$("Nope").first(); return [{ json: {} }];'), respondNode()],
      [conn("Webhook", "C"), conn("C", "Respond")],
    );
    expect((await runWorkflow(w, { trigger: hook })).failedNodes[0].error).toMatch(
      /hasn't been executed/,
    );
  });
  it("Merge ينتظر كل مداخله، وإن غاب أحدها يبقى عالقًا ويُسجَّل stalled", async () => {
    const make = (second: boolean) => {
      const nodes = [
        webhookNode(),
        node("If", "if", {
          conditions: {
            options: {},
            combinator: "and",
            conditions: [
              {
                leftValue: "={{ $json.flag }}",
                rightValue: "",
                operator: { type: "boolean", operation: "true", singleValue: true },
              },
            ],
          },
        }),
        node("Merge", "merge", { mode: "append", numberInputs: 2 }),
        respondNode("R", "merged"),
      ];
      const set = codeNode("Flag", "return [{ json: { flag: true } }];");
      return wf(
        [nodes[0], set, nodes[1], nodes[2], nodes[3]],
        [
          conn("Webhook", "Flag"),
          conn("Flag", "If"),
          {
            If: {
              main: [
                [{ node: "Merge", type: "main", index: 0 }],
                second ? [{ node: "Merge", type: "main", index: 1 }] : [],
              ],
            },
          },
          conn("Merge", "R"),
        ],
      );
    };
    const stuck = await runWorkflow(make(true), { trigger: hook });
    expect(stuck.stalled).toEqual(["Merge"]);
    expect(stuck.violations).toContain("no_response");
  });
  it("IF صارم: قيمة غير منطقية ترمي", async () => {
    const w = wf(
      [
        webhookNode(),
        codeNode("C", "return [{ json: { flag: 'yes' } }];"),
        node("If", "if", {
          conditions: {
            options: {},
            combinator: "and",
            conditions: [
              {
                leftValue: "={{ $json.flag }}",
                rightValue: "",
                operator: { type: "boolean", operation: "true", singleValue: true },
              },
            ],
          },
        }),
      ],
      [conn("Webhook", "C"), conn("C", "If")],
    );
    expect((await runWorkflow(w, { trigger: hook })).failedNodes[0].error).toMatch(/Wrong type/);
  });
  it("المشغّل الخاطئ لا ينفَّذ، والمسار الخاطئ يُرفض", async () => {
    const w = wf([webhookNode(), respondNode()], [conn("Webhook", "Respond")]);
    expect((await runWorkflow(w, { trigger: { ...hook, path: "other" } })).executed).toBe(false);
    expect((await runWorkflow(w, { trigger: { ...hook, method: "GET" } })).executed).toBe(false);
  });
  it("static data تُسلسَل JSON في نهاية التشغيل (دوال/undefined تسقط)", async () => {
    const w = wf(
      [
        webhookNode(),
        codeNode(
          "C",
          'const sd = $getWorkflowStaticData("global"); sd.a = 1; sd.f = () => 1; sd.u = undefined; sd.n = NaN; return [{ json: {} }];',
        ),
        respondNode(),
      ],
      [conn("Webhook", "C"), conn("C", "Respond")],
    );
    const sd: any = {};
    await runWorkflow(w, { trigger: hook, staticData: sd });
    expect(sd.global).toEqual({ a: 1, n: null });
  });
});

describe("mini-engine: HTTP والكمون الافتراضي", () => {
  const httpWf = (
    items: number,
    batchSize: number | undefined,
    onError: string | null = "continueRegularOutput",
  ) =>
    wf(
      [
        webhookNode(),
        codeNode(
          "Items",
          `return Array.from({ length: ${items} }, (_, i) => ({ json: { url: "https://api.osv.dev/v1/query?i=" + i } }));`,
        ),
        node(
          "H",
          "httpRequest",
          {
            method: "GET",
            url: "={{ $json.url }}",
            options: {
              timeout: 1000,
              ...(batchSize ? { batching: { batch: { batchSize, batchInterval: 0 } } } : {}),
              response: {
                response: { fullResponse: true, neverError: true, responseFormat: "text" },
              },
            },
          },
          { onError: onError || undefined },
        ),
        respondNode("R", "done"),
      ],
      [conn("Webhook", "Items"), conn("Items", "H"), conn("H", "R")],
    );
  const slow = async () => ({ status: 200, body: {}, latencyMs: 300 });
  it("بلا دفعات: التتابع = المجموع", async () => {
    const r = await runWorkflow(httpWf(4, undefined), { trigger: hook, transport: slow });
    expect(r.elapsedMs).toBe(1200);
  });
  it("بدفعة 4: التزامن = أطول عضو", async () => {
    const r = await runWorkflow(httpWf(4, 4), { trigger: hook, transport: slow });
    expect(r.elapsedMs).toBe(300);
  });
  it("المهلة تقتطع الكلفة عند حدّ المهلة وتنتج خطأ", async () => {
    const r = await runWorkflow(httpWf(1, undefined), {
      trigger: hook,
      transport: async () => ({ status: 200, body: {}, latencyMs: 9999 }),
    });
    expect(r.elapsedMs).toBe(1000);
    expect(r.httpCalls[0].outcome).toBe("timeout");
  });
  it("RED: HTTP بلا onError وخطأ ⇒ يفشل التنفيذ", async () => {
    const r = await runWorkflow(httpWf(1, undefined, null), {
      trigger: hook,
      transport: async () => {
        throw new Error("socket hang up");
      },
    });
    expect(r.failedNodes[0].error).toContain("socket hang up");
  });
  it("اعتماد غائب يعطي رسالة تحوي Credentials", async () => {
    const w = httpWf(1, undefined);
    w.nodes[2].credentials = { httpHeaderAuth: { id: null, name: "Nx Brave Search Key" } };
    const r = await runWorkflow(w, { trigger: hook, transport: slow, credentials: [] });
    expect(r.outputs["H"][0].json.error).toMatch(/Credentials/);
  });
  // ---- مطابقة المحرّك لمصدر HttpRequestV3 (قُرئ من المصدر، لا من التذكّر) ----
  const shapeWf = (httpParams: any, hookNode = true) =>
    wf(
      [
        webhookNode(),
        codeNode(
          "Gate",
          "return [{ json: { q: { a: 1 }, h: { 'X-K': 'v' }, b: { n: 1 }, t: 700 } }];",
        ),
        node(
          "H",
          "httpRequest",
          {
            method: "GET",
            url: "https://api.osv.dev/v1/query",
            options: {
              timeout: 1000,
              response: {
                response: { fullResponse: true, neverError: true, responseFormat: "text" },
              },
            },
            ...httpParams,
          },
          { onError: "continueRegularOutput" },
        ),
        respondNode("R", "done"),
      ].slice(0, hookNode ? undefined : 0),
      [conn("Webhook", "Gate"), conn("Gate", "H"), conn("H", "R")],
    );
  const okTransport = async () => ({ status: 200, body: { hello: "world" }, latencyMs: 10 });
  const first = (r: any) => r.outputs["H"][0].json;
  it("ناتج الردّ النصّي الكامل: المتن في data (الاسم الافتراضي) لا في body", async () => {
    const r = await runWorkflow(shapeWf({}), { trigger: hook, transport: okTransport });
    expect(Object.keys(first(r)).sort()).toEqual([
      "data",
      "headers",
      "statusCode",
      "statusMessage",
    ]);
    expect(first(r).data).toBe('{"hello":"world"}');
    expect(first(r).statusCode).toBe(200);
    expect(first(r).body).toBeUndefined();
  });
  it("outputPropertyName يسمّي الحقل، وغير الكامل يعيد الحقل وحده", async () => {
    const named = shapeWf({
      options: {
        timeout: 1000,
        response: {
          response: {
            fullResponse: true,
            neverError: true,
            responseFormat: "text",
            outputPropertyName: "payload",
          },
        },
      },
    });
    const r = await runWorkflow(named, { trigger: hook, transport: okTransport });
    expect(first(r).payload).toBe('{"hello":"world"}');
    expect(first(r).data).toBeUndefined();
    const plain = shapeWf({
      options: { timeout: 1000, response: { response: { responseFormat: "text" } } },
    });
    const p = await runWorkflow(plain, { trigger: hook, transport: okTransport });
    expect(first(p)).toEqual({ data: '{"hello":"world"}' });
  });
  it("responseFormat json يضع المحلَّل في body، وغير المدعوم يرمي صراحةً", async () => {
    const json = shapeWf({
      options: {
        timeout: 1000,
        response: { response: { fullResponse: true, neverError: true, responseFormat: "json" } },
      },
    });
    const r = await runWorkflow(json, { trigger: hook, transport: okTransport });
    expect(first(r).body).toEqual({ hello: "world" });
    expect(first(r).data).toBeUndefined();
    const auto = shapeWf({
      options: { timeout: 1000, response: { response: { fullResponse: true, neverError: true } } },
    });
    const a = await runWorkflow(auto, { trigger: hook, transport: okTransport });
    expect(first(a).error).toMatch(/responseFormat غير مدعوم/);
  });
  it("jsonQuery وjsonHeaders: نصّ JSON فقط؛ الكائن الخام يفشل «not valid JSON» كما في n8n", async () => {
    const asString = shapeWf({
      sendQuery: true,
      specifyQuery: "json",
      jsonQuery: "={{ JSON.stringify($json.q) }}",
      sendHeaders: true,
      specifyHeaders: "json",
      jsonHeaders: "={{ JSON.stringify($json.h) }}",
    });
    const ok = await runWorkflow(asString, { trigger: hook, transport: okTransport });
    expect(ok.httpCalls[0].outcome).toBe("http_200");
    expect(first(ok).error).toBeUndefined();
    const rawQuery = shapeWf({
      sendQuery: true,
      specifyQuery: "json",
      jsonQuery: "={{ $json.q }}",
    });
    const q = await runWorkflow(rawQuery, { trigger: hook, transport: okTransport });
    expect(first(q).error).toBe('The value in the "JSON Query Parameters" field is not valid JSON');
    expect(q.httpCalls[0].outcome).toBe("error");
    const rawHeaders = shapeWf({
      sendHeaders: true,
      specifyHeaders: "json",
      jsonHeaders: "={{ $json.h }}",
    });
    const h = await runWorkflow(rawHeaders, { trigger: hook, transport: okTransport });
    expect(first(h).error).toBe('The value in the "JSON Headers" field is not valid JSON');
  });
  it("jsonBody يقبل الكائن الخام والنصّ، وغير الصالح يفشل", async () => {
    const seen: any[] = [];
    const transport = async (req: any) => {
      seen.push(req.body);
      return { status: 200, body: "{}", latencyMs: 1 };
    };
    for (const jsonBody of ["={{ $json.b }}", "={{ JSON.stringify($json.b) }}"]) {
      await runWorkflow(
        shapeWf({ method: "POST", sendBody: true, specifyBody: "json", jsonBody }),
        { trigger: hook, transport },
      );
    }
    expect(seen).toEqual([{ n: 1 }, { n: 1 }]);
    const bad = shapeWf({ method: "POST", sendBody: true, specifyBody: "json", jsonBody: "{oops" });
    const r = await runWorkflow(bad, { trigger: hook, transport });
    expect(first(r).error).toBe('The value in the "JSON Body" field is not valid JSON');
  });
  it("مهلة العقدة تعبيرٌ يُقرأ من العنصر؛ وبلا قيمة تعود مهلة n8n الافتراضية الطويلة (300000)", async () => {
    const dyn = shapeWf({
      options: {
        timeout: "={{ $json.t }}",
        response: { response: { fullResponse: true, neverError: true, responseFormat: "text" } },
      },
    });
    const r = await runWorkflow(dyn, {
      trigger: hook,
      transport: async () => ({ status: 200, body: "{}", latencyMs: 900 }),
    });
    expect(r.httpCalls[0].timeoutMs).toBe(700);
    expect(r.httpCalls[0].outcome).toBe("timeout");
    expect(r.elapsedMs).toBe(700);
    const none = shapeWf({
      options: {
        timeout: "={{ $json.nothing }}",
        response: { response: { fullResponse: true, neverError: true, responseFormat: "text" } },
      },
    });
    const n = await runWorkflow(none, { trigger: hook, transport: okTransport });
    expect(n.httpCalls[0].timeoutMs).toBe(300000);
  });
  it("التحويلات: الإصدار 4 يتبعها افتراضيًّا، وoptions.redirect.followRedirects=false يمنعها", async () => {
    const dflt = await runWorkflow(shapeWf({}), { trigger: hook, transport: okTransport });
    expect(dflt.httpCalls[0].followRedirects).toBe(true);
    const off = shapeWf({
      options: {
        timeout: 1000,
        redirect: { redirect: { followRedirects: false } },
        response: { response: { fullResponse: true, neverError: true, responseFormat: "text" } },
      },
    });
    const r = await runWorkflow(off, { trigger: hook, transport: okTransport });
    expect(r.httpCalls[0].followRedirects).toBe(false);
  });
  it("ترتيب فروع المخرج الواحد بالإحداثيات (y ثم x) لا بترتيب الاتصالات", async () => {
    const make = (positions: Record<string, number[]>, order: string[]) => {
      const nodes = [
        { ...webhookNode(), position: [0, 0] },
        { ...codeNode("Mark", "return [{ json: {} }];"), position: [100, 0] },
        ...["A", "B", "C"].map((n) => ({
          ...codeNode(n, "return [{ json: {} }];"),
          position: positions[n],
        })),
      ];
      return wf(nodes, [
        conn("Webhook", "Mark"),
        {
          Mark: { main: [order.map((n) => ({ node: n, type: "main", index: 0 }))] },
        },
      ]);
    };
    // C فوق (y أصغر) ثم A ثم B، والاتصالات مكتوبة بترتيب معاكس.
    const r = await runWorkflow(
      make({ A: [300, 100], B: [300, 200], C: [300, 0] }, ["B", "A", "C"]),
      { trigger: hook },
    );
    expect(r.trace.slice(2)).toEqual(["C", "A", "B"]);
    // التعادل في y يفصله x تصاعديًّا.
    const t = await runWorkflow(
      make({ A: [500, 50], B: [100, 50], C: [300, 50] }, ["A", "B", "C"]),
      { trigger: hook },
    );
    expect(t.trace.slice(2)).toEqual(["B", "C", "A"]);
  });
  it("RED: invariantProblems يحمرّ على كل انتهاك (ردود مزروعة)", () => {
    const good = {
      result: { violations: [], failedNodes: [], responses: [{}], httpCalls: [] as any[] },
      response: {
        statusCode: 200,
        headers: { "content-type": "application/json; charset=utf-8", "x-nx-resp-sig": "v1=x" },
        body: "{}",
      },
      parsed: {
        v: 1,
        ok: false,
        code: "internal",
        requestId: "",
        degraded: true,
        fetchedAt: "2026-01-01T00:00:00.000Z",
        providers: [],
        results: [],
      },
      verified: { ok: true },
    };
    expect(invariantProblems(good, "research")).toEqual([]);
    const mutate = (fn: (g: any) => void) => {
      const g = JSON.parse(JSON.stringify(good));
      fn(g);
      return invariantProblems(g, "research").join("|");
    };
    expect(
      mutate((g) => {
        g.result.responses = [];
      }),
    ).toContain("عدد الردود");
    expect(
      mutate((g) => {
        g.result.responses = [{}, {}];
      }),
    ).toContain("عدد الردود");
    expect(
      mutate((g) => {
        g.result.violations = ["no_response"];
      }),
    ).toContain("انتهاكات");
    expect(
      mutate((g) => {
        g.result.failedNodes = [{ node: "x" }];
      }),
    ).toContain("عقد فشلت");
    expect(
      mutate((g) => {
        g.response.statusCode = 500;
      }),
    ).toContain("حالة HTTP");
    expect(
      mutate((g) => {
        g.response.headers["content-type"] = "text/html";
      }),
    ).toContain("Content-Type");
    expect(
      mutate((g) => {
        g.parsed.code = "bogus";
      }),
    ).toContain("غلاف غير صالح");
    expect(
      mutate((g) => {
        g.parsed = null;
      }),
    ).toContain("الجسم ليس JSON");
    expect(
      mutate((g) => {
        g.response.body = "x".repeat(40000);
      }),
    ).toContain("32 كيلوبايت");
    expect(
      mutate((g) => {
        g.verified = { ok: false };
      }),
    ).toContain("توقيع الردّ");
    expect(
      mutate((g) => {
        g.response = null;
      }),
    ).toContain("لا ردّ");
    const call = {
      node: "HTTP Google",
      url: "https://www.googleapis.com/customsearch/v1?q=x",
      timeoutMs: 1100,
      credentials: ["Nx Google Search Key"],
      followRedirects: false,
    };
    expect(
      mutate((g) => {
        g.result.httpCalls = [call];
      }),
    ).toBe("");
    expect(
      mutate((g) => {
        g.result.httpCalls = [{ ...call, url: "https://evil.example/x" }];
      }),
    ).toContain("خارج القائمة");
    expect(
      mutate((g) => {
        g.result.httpCalls = [{ ...call, timeoutMs: 300000 }];
      }),
    ).toContain("مهلة نداء");
    expect(
      mutate((g) => {
        g.result.httpCalls = [{ ...call, followRedirects: true }];
      }),
    ).toContain("يتبع التحويلات");
    expect(
      mutate((g) => {
        g.response.headers["x-debug"] = SECRET_SADEED;
      }),
    ).toContain("سرّ ظاهر");
    expect(
      mutate((g) => {
        g.response.body = JSON.stringify({ echoed: SECRET_FNN });
      }),
    ).toContain("سرّ ظاهر");
  });
});

describe("سيناريوهات الرسم: انتهاكات الربط تحمرّ على مسار حقيقي", () => {
  const go = (w: any, over: any = {}) =>
    runSigned(w, { path: "sadeed-research-v1", bodyObj: researchBody(), ...over });
  it("RED: قطع مخرج bad_request ⇒ no_response", async () => {
    const w = workflowByName("sadeed-web-research");
    w.connections["Plan ok?"].main[1] = [];
    const run = await go(w, { bodyObj: researchBody({ mode: "nope" }) });
    expect(invariantProblems(run, "research").join("|")).toContain("انتهاكات");
    expect(run.result.violations).toContain("no_response");
  });
  it("RED: Verify بلا onError وفيه عطل ⇒ فشل بلا ردّ", async () => {
    const w = workflowByName("sadeed-web-research");
    const n = w.nodes.find((x: any) => x.name === "Verify");
    delete n.onError;
    n.parameters.jsCode = 'throw new Error("planted");\n' + n.parameters.jsCode;
    const run = await go(w);
    expect(run.result.failedNodes[0].node).toBe("Verify");
    expect(invariantProblems(run, "research").length).toBeGreaterThan(0);
  });
  it("RED: وصل Sign إلى Respond Fallback أيضًا ⇒ ردّان", async () => {
    const w = workflowByName("sadeed-web-research");
    w.connections["Sign"].main[0].push({ node: "Respond Fallback", type: "main", index: 0 });
    const run = await go(w);
    expect(run.result.violations.join()).toContain("multiple_responses");
  });
  it("RED: فرع تخطّى مزوّدًا ولا اتصال لمخرجه الخاطئ بـ Join ⇒ تعليق بلا ردّ", async () => {
    const w = workflowByName("sadeed-web-research");
    w.connections["Run Google?"].main[1] = [];
    const run = await go(w, { env: { NX_GOOGLE_CX: "" } });
    expect(run.result.stalled).toContain("Join");
    expect(run.result.violations).toContain("no_response");
  });
  it("RED: الردّ غير موقَّع إن غاب الاستيراد crypto أو حُرّف مفتاح التوقيع", async () => {
    const w = workflowByName("sadeed-web-research");
    const run = await go(w, {
      env: { SADEED_N8N_SECRET: "another-secret-another-secret-another-secret" },
    });
    // السرّ في n8n يخالف سرّ العميل: الطلب يُرفض auth_failed، والردّ موقَّع بسرّ n8n فلا يطابق توقيع العميل.
    expect(run.parsed.code).toBe("auth_failed");
    expect(run.verified.ok).toBe(false);
  });
});

describe("fixtures وstub-server وملف stub", () => {
  it("routeFor: كل fixture له مسار وأمثلة المضيفين", () => {
    expect(Object.keys(FIXTURES).length).toBeGreaterThanOrEqual(15);
    expect(routeFor("https://api.github.com/advisories?x=1")).toBe("advisories");
    expect(routeFor("https://api.github.com/search/code?q=x")).toBe("github");
    expect(routeFor("http://127.0.0.1:8787/stub/en.wikipedia.org/w/api.php")).toBe("wikipedia");
    expect(routeFor("https://app.example/api/public/health")).toBe("appHealth");
    expect(routeFor("https://api.osv.dev/v1/vulns/GHSA-1")).toBe("osvById");
    expect(routeFor("https://unknown.example/x")).toBe("unknown");
  });
  it("makeTransport: كائن بلا body يأخذ الردّ الاعتيادي بالكمون المحدّد", async () => {
    const r: any = await makeTransport({ google: { latencyMs: 777 } })({
      url: "https://www.googleapis.com/x",
      method: "GET",
      timeoutMs: 1100,
    });
    expect(r.latencyMs).toBe(777);
    expect(r.body).toEqual(FIXTURES.google);
    const custom: any = await makeTransport({ google: { body: { items: [] } } })({
      url: "https://www.googleapis.com/x",
      method: "GET",
      timeoutMs: 1100,
    });
    expect(custom.body).toEqual({ items: [] });
  });
  it("makeTransport يرمي على سلوك مجهول", async () => {
    await expect(
      makeTransport({ google: "weird" })({
        url: "https://www.googleapis.com/x",
        method: "GET",
        timeoutMs: 1,
      }),
    ).rejects.toThrow(/سلوك نقل/);
  });

  it("خادم stub الحقيقي على HTTP محلي يخدم الـfixtures، وملف stub يعمل ضده كاملًا", async () => {
    const server = createStubServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const port = (server.address() as any).port;
    try {
      const res = await fetch("http://127.0.0.1:" + port + "/stub/api.github.com/advisories?x=1");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(FIXTURES.advisories);
      expect((await fetch("http://127.0.0.1:" + port + "/stub/nowhere.example/x")).status).toBe(
        404,
      );
      expect((await fetch("http://127.0.0.1:" + port + "/elsewhere")).status).toBe(404);

      const transport = async (req: any) => {
        const r = await fetch(req.url.replace("127.0.0.1:8787", "127.0.0.1:" + port), {
          method: req.method,
          body: req.body ? JSON.stringify(req.body) : undefined,
          headers: { "content-type": "application/json" },
        });
        return { status: r.status, body: await r.text(), latencyMs: 5 };
      };
      const stubWf = workflowByName("sadeed-web-research", "stub");
      const { signRequest } = loadCode("sign-response");
      const body = JSON.stringify(researchBody({ mode: "general" }));
      const headers = signRequest({
        secret: SECRET_SADEED,
        path: "sadeed-research-v1",
        body,
        ts: Math.floor(NOW / 1000),
        nonce: "5".repeat(32),
        deadlineMs: 1800,
      });
      const out = await runWorkflow(stubWf, {
        trigger: { type: "webhook", path: "sadeed-research-v1", headers, rawBody: body },
        env: ENV,
        credentials: [],
        transport,
        nowMs: NOW,
      });
      const parsed = JSON.parse(out.responses[0].body);
      expect(out.violations).toEqual([]);
      expect(parsed.code).toBe("ok");
      expect(parsed.providers.map((p: any) => p.id)).toEqual([
        "google",
        "brave",
        "tavily",
        "wikipedia",
        "wikidata",
        "openalex",
      ]);
      expect(parsed.providers.filter((p: any) => p.status === "ok").length).toBe(6);
      expect(UUID).toBe(parsed.requestId);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("سكربت التوقيع scripts/n8n-sign-example.mjs", () => {
  const now = NOW;
  const secret = SECRET_SADEED;
  const V = loadCode("verify-request");
  const verify = (req: any, path: string, over: any = {}) =>
    V.verifyRequest({
      headers: req.headers,
      body: JSON.parse(req.body),
      rawBodyBase64: Buffer.from(req.body).toString("base64"),
      path,
      secret,
      now,
      nonces: {},
      ...over,
    });

  it("طلب البحث الموقَّع يجتاز verify-request الحقيقية (نسختان مستقلتان من الصيغة)", () => {
    const req = buildSignedRequest({
      path: "sadeed-research-v1",
      base: "https://n8n.example.com/",
      secret,
      now,
      nonce: "a".repeat(32),
      requestId: UUID,
    });
    expect(req.url).toBe("https://n8n.example.com/webhook/sadeed-research-v1");
    expect(req.headers["X-Nx-Deadline-Ms"]).toBe("1800");
    expect(verify(req, "sadeed-research-v1").ok).toBe(true);
  });
  it("المسارات الثلاثة بمواعيدها وسرّ كل نطاق", () => {
    const want: Record<string, string> = {
      "sadeed-research-v1": "1800",
      "fnn-research-v1": "6000",
      "fnn-runner-v1": "20000",
    };
    for (const path of Object.keys(want)) {
      const req = buildSignedRequest({ path, secret, now });
      expect(req.headers["X-Nx-Deadline-Ms"]).toBe(want[path]);
      expect(verify(req, path).ok).toBe(true);
    }
    expect(
      buildSignedRequest({ path: "fnn-runner-v1", secret, now }).headers["Idempotency-Key"],
    ).toMatch(/^[0-9a-f]{32}$/);
  });
  it("سرّ بسطر ختامي أو فراغ حوله: يوقّع السكربت بالسرّ المقصوص كالطرفين ويجتاز Verify (خطوة القبول اليدوي في README)", () => {
    const clean = buildSignedRequest({
      path: "sadeed-research-v1",
      secret,
      now,
      nonce: "b".repeat(32),
      requestId: UUID,
    });
    for (const padded of [`${secret}\n`, `${secret}\r\n`, `  ${secret} `, `\n${secret}\n\n`]) {
      const req = buildSignedRequest({
        path: "sadeed-research-v1",
        secret: padded,
        now,
        nonce: "b".repeat(32),
        requestId: UUID,
      });
      expect(req.headers["X-Nx-Sig"], JSON.stringify(padded)).toBe(clean.headers["X-Nx-Sig"]);
      expect(verify(req, "sadeed-research-v1").ok).toBe(true);
    }
    // والطول يُقاس بعد القصّ: 31 حرفًا وسطرٌ ختامي ليست سرًّا صالحًا.
    expect(() =>
      buildSignedRequest({ path: "sadeed-research-v1", secret: `${"x".repeat(31)}\n`, now }),
    ).toThrow(/32/);
  });
  it("RED: --tamper و --skew يُرفضان في n8n", () => {
    const tampered = buildSignedRequest({ path: "sadeed-research-v1", secret, now, tamper: true });
    expect(verify(tampered, "sadeed-research-v1").reason).toBe("bad_signature");
    const skewed = buildSignedRequest({ path: "sadeed-research-v1", secret, now, skew: 60 });
    expect(verify(skewed, "sadeed-research-v1").reason).toBe("skew");
  });
  it("RED: سرّ قصير أو مسار مجهول يرمي، والسرّ لا يظهر في أمر curl", () => {
    expect(() => buildSignedRequest({ path: "sadeed-research-v1", secret: "short", now })).toThrow(
      /32/,
    );
    expect(() => buildSignedRequest({ path: "nope", secret, now })).toThrow();
    const cmd = curlCommand(buildSignedRequest({ path: "sadeed-research-v1", secret, now }));
    expect(cmd).not.toContain(secret);
    expect(cmd).toContain("X-Nx-Sig: v1=");
    expect(
      cmd.startsWith("curl -sS -X POST 'https://n8n.example.com/webhook/sadeed-research-v1'"),
    ).toBe(true);
  });
  it("تحقق الردّ في السكربت يوافق توقيع n8n ويرفض المعدَّل والقديم", async () => {
    const run = await runSigned(workflowByName("sadeed-web-research"), {
      path: "sadeed-research-v1",
      bodyObj: researchBody(),
      nonce: "b".repeat(32),
    });
    const headers = run.response.headers;
    const ok = verifyResponse({
      secret,
      nonce: "b".repeat(32),
      body: run.response.body,
      headers,
      now: NOW + run.result.elapsedMs,
    });
    expect(ok.ok).toBe(true);
    expect(
      verifyResponse({
        secret,
        nonce: "b".repeat(32),
        body: run.response.body + " ",
        headers,
        now: NOW,
      }).ok,
    ).toBe(false);
    expect(
      verifyResponse({ secret, nonce: "c".repeat(32), body: run.response.body, headers, now: NOW })
        .ok,
    ).toBe(false);
    expect(
      verifyResponse({
        secret,
        nonce: "b".repeat(32),
        body: run.response.body,
        headers,
        now: NOW + 40000,
      }).ok,
    ).toBe(false);
    expect(
      verifyResponse({
        secret,
        nonce: "b".repeat(32),
        body: run.response.body,
        headers: {},
        now: NOW,
      }).ok,
    ).toBe(false);
  });
  it("الاستعمال من سطر الأوامر: بلا مسار يخرج 2، وبلا سرّ يفشل بلا طباعته", () => {
    const script = join(ROOT, "scripts", "n8n-sign-example.mjs");
    const bad = spawnSync(process.execPath, [script], {
      encoding: "utf8",
      env: { ...process.env },
    });
    expect(bad.status).toBe(2);
    const env = { ...process.env, SADEED_N8N_SECRET: "" };
    const noSecret = spawnSync(process.execPath, [script, "--path=sadeed-research-v1"], {
      encoding: "utf8",
      env,
    });
    expect(noSecret.status).toBe(1);
    expect(noSecret.stderr).toContain("32");
    const withSecret = spawnSync(
      process.execPath,
      [script, "--path=sadeed-research-v1", "--base=https://n8n.example.com"],
      { encoding: "utf8", env: { ...process.env, SADEED_N8N_SECRET: secret } },
    );
    expect(withSecret.status).toBe(0);
    expect(withSecret.stdout).toContain("curl -sS -X POST");
    expect(withSecret.stdout).not.toContain(secret);
  });
});

describe("مُولِّد المسارات (CLI)", () => {
  const script = join(ROOT, "scripts", "build-n8n-workflows.mjs");
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
  it("يكتب إلى مجلد جانبي دون مسّ README، ثم --check ينجح، ثم يفشل عند التعديل", () => {
    const out = mkdtempSync(join(tmpdir(), "n8n-gen-"));
    const readmeBefore = readFileSync(join(ROOT, "n8n", "README.md"), "utf8");
    const gen = run("--out=" + out);
    expect(gen.status).toBe(0);
    expect(readFileSync(join(ROOT, "n8n", "README.md"), "utf8")).toBe(readmeBefore);
    expect(run("--check", "--out=" + out).status).toBe(0);
    const file = join(out, "sadeed-web-research.json");
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace('"executionTimeout": 10', '"executionTimeout": 11'),
    );
    const red = run("--check", "--out=" + out);
    expect(red.status).toBe(1);
    expect(red.stderr).toContain("sadeed-web-research.json");
    writeFileSync(join(out, "stray.json"), "{}");
    expect(run("--check", "--out=" + out).status).toBe(1);
  });
  it("--check على المتعقَّب الفعلي ينجح", () => {
    const r = run("--check");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("يطابق");
  });
  it("ملف stub يُكتب إلى مجلد منفصل وبلا اعتماد", () => {
    const out = mkdtempSync(join(tmpdir(), "n8n-stub-"));
    expect(run("--profile=stub", "--out=" + out).status).toBe(0);
    const text = readFileSync(join(out, "sadeed-web-research.json"), "utf8");
    expect(text).toContain("http://127.0.0.1:8787/stub/");
    expect(text).not.toContain('"credentials"');
  });
});
