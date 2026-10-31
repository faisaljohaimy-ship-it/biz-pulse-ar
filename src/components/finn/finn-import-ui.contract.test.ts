// @vitest-environment node
/**
 * حارس «إرفاق ملف في فِن» — ما يُكتب سطرًا ولا يكسره tsc ولا اختبارٌ سلوكي (المادة ٣٠: كل كاشفٍ يُجرَّب
 * أولًا على انتهاكٍ مزروع، ويُشغَّل على المصدر الحقيقي ثانيًا).
 *
 * ثلاثة ثوابت من أمر المالك ٢٠٢٦/١٠/٣١، لا يُقبل لأيٍّ منها استثناءٌ صامت:
 *  ① **النموذج لا يرى الملف.** ملفات الاستيراد معزولة عن ناقل المحادثة وحالتها وموجِّهها في الاتجاهين،
 *    و`submit` في `FinnChat` لا يذكر الاستيراد. جسم `/api/finn/chat` يبقى `{messages}`.
 *  ② **لا تحليل جداول في العميل ولا سجلّ.** لا `FileReader`/`arrayBuffer()`/`text()` ولا مكتبة جداول ولا
 *    `console` في أيٍّ من ملفات الإرفاق؛ والعميل يستعمل ثوابت العقد لا حروفًا مكرَّرة.
 *  ③ **بطاقة الرئيسية نصّيةٌ بلا إرفاق**، والمساحتان الكاملتان وحدهما تمرّران `allowImport`، والنصوص التي كانت
 *    تقول «لا شيء يُكتب في القاعدة» صارت تذكر الاستثناء الوحيد بصدق.
 *  ④ **ميزانية CSS:** كل صنفٍ في بطاقة الاستيراد والمشبك موجودٌ أصلًا في مصدرٍ آخر (فلا يكبر ملف CSS).
 */
import { existsSync, globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FINN_BANNER_AR, FINN_COPY } from "@/lib/finn-agent/copy";
import { FINN_HOME_CAPABILITIES } from "@/lib/finn-agent/home-access";

const read = (p: string) => readFileSync(p, "utf8");
const strip = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** ملفات تحمل الاستيراد (عميلٌ وحالةٌ وبطاقة). */
const IMPORT_SIDE = [
  "src/lib/finn-import/client.ts",
  "src/components/finn/use-finn-import.ts",
  "src/components/finn/FinnImportCard.tsx",
] as const;
/** ناقل المحادثة وحالتها وموجِّهها — لا تعرف الاستيراد أبدًا. */
const CHAT_SIDE = [
  "src/components/finn/use-finn-chat.ts",
  "src/lib/finn-agent/client.ts",
  "src/lib/finn-agent/messages.ts",
  "src/lib/finn-agent/stream-protocol.ts",
  "src/lib/finn-agent/prompt.ts",
  "src/lib/finn-agent/tool-names.ts",
] as const;

const specifiers = (code: string): string[] => [
  ...[...code.matchAll(/\bfrom\s*["']([^"']+)["']/g)].map((m) => m[1]),
  ...[...code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]),
];

/**
 * ملفات الاستيراد لا تلمس الشبكة إلا عبر `postFinnImport` ← `authenticatedFetch` ← نقطة الاستيراد وحدها.
 * `fetch`/`XMLHttpRequest`/`sendBeacon`… المباشر يتجاوز اختبار «عدّاد authenticatedFetch المحاكى»، فيمرّ
 * نداءٌ إلى `/api/finn/chat` بنصّ اسم الملف دون أن يحمرّ شيء (قِيس: مُضعَّف M14c نجا من كل الاختبارات).
 * الشرط الخلفي `(?<![-\w$/])` يُخرج `authenticatedFetch` و`"@/lib/auth-fetch"` من الالتقاط.
 */
const RAW_NETWORK =
  /(?<![-\w$/])fetch\b(?!-)|\bXMLHttpRequest\b|\bsendBeacon\b|\bWebSocket\b|\bEventSource\b/;
/** نقطة المحادثة وثابتها (`FINN_IDENTITY.apiRoute`) وأي مسار `/api/finn/*` حرفيّ في ملفات الاستيراد. */
const CHAT_ENDPOINT = /api\/finn|finn-agent\/identity|\bapiRoute\b|\bFINN_IDENTITY\b/;

/** عزل الاتجاهين. فارغةٌ = سليمة. */
function isolationViolations(sources: Readonly<Record<string, string>>): string[] {
  const out: string[] = [];
  for (const [file, src] of Object.entries(sources)) {
    const code = strip(src);
    if ((CHAT_SIDE as readonly string[]).includes(file)) {
      if (specifiers(code).some((s) => /finn-import/.test(s)))
        out.push(`${file}: يستورد finn-import`);
      if (/FINN_IMPORT|\/api\/finn\/import|\bFormData\b/.test(code)) {
        out.push(`${file}: يذكر الاستيراد أو multipart`);
      }
    } else {
      for (const s of specifiers(code)) {
        if (
          /use-finn-chat|finn-agent\/(client|messages|stream-protocol|prompt)\b|engine|\.server/.test(
            s,
          )
        ) {
          out.push(`${file}: يستورد ${s}`);
        }
      }
      if (RAW_NETWORK.test(code)) out.push(`${file}: شبكة مباشرة (fetch/XHR/sendBeacon…)`);
      if (CHAT_ENDPOINT.test(code)) out.push(`${file}: يذكر نقطة المحادثة أو مسار /api/finn`);
    }
  }
  return out;
}

/** جسم `submit` في FinnChat: لا يذكر الاستيراد، و`useFinnChat()` بلا وسائط. */
function chatSubmitProblems(chat: string): string[] {
  const code = strip(chat);
  const out: string[] = [];
  const at = code.indexOf("const submit = () => {");
  const end = at < 0 ? -1 : code.indexOf("\n  };", at);
  if (at < 0 || end < 0) return ["submit غير موجود"];
  if (/import|file|preview/i.test(code.slice(at, end))) out.push("submit يذكر الاستيراد");
  if (!/useFinnChat\(\)/.test(code)) out.push("useFinnChat يستقبل وسائط");
  return out;
}

/** تحليل الجداول والسجلّ ممنوعان في العميل. */
const CLIENT_PARSE =
  /\bFileReader\b|\.arrayBuffer\(|\.text\(\)|\.stream\(\)|\bXLSX\b|from\s*["'](?:xlsx|@e965\/xlsx|papaparse|exceljs)["']|import\(\s*["'](?:xlsx|@e965\/xlsx|papaparse|exceljs)["']\s*\)/;
const LOGGING = /\bconsole\s*\./;
/** حقول العقد حروفًا مكرَّرة بدل ثوابته. */
const HARDCODED_CONTRACT = /["']\/api\/finn\/import["']|append\(\s*["'](?:file|action|token)["']/;

function clientPrivacyViolations(file: string, src: string): string[] {
  const code = strip(src);
  const out: string[] = [];
  if (CLIENT_PARSE.test(code)) out.push(`${file}: تحليل ملف/جداول في العميل`);
  if (LOGGING.test(code)) out.push(`${file}: console`);
  if (HARDCODED_CONTRACT.test(code)) out.push(`${file}: حرفٌ مكرَّر من العقد`);
  return out;
}

/** من يمرّر `allowImport`؟ المساحتان الكاملتان نعم، بطاقة الرئيسية لا، والافتراضي false. */
function wiringProblems(files: {
  workspace: string;
  route: string;
  home: string;
  chat: string;
}): string[] {
  const out: string[] = [];
  if (!/<FinnChat\b[^>]*\ballowImport\b/.test(strip(files.workspace)))
    out.push("/fnn بلا allowImport");
  if (!/<FinnChat\b[^>]*\ballowImport\b/.test(strip(files.route)))
    out.push("/finn بلا allowImport");
  if (/allowImport/.test(strip(files.home))) out.push("بطاقة الرئيسية تمرّر allowImport");
  if (!/allowImport\s*=\s*false/.test(strip(files.chat))) out.push("الافتراضي ليس false");
  return out;
}

/** تذييل مساحة العمل لا يدّعي «لا كتابة في القاعدة» مطلقًا؛ يذكر الاستثناء بالعربية والإنجليزية. */
function workspaceCopyProblems(src: string): string[] {
  const code = strip(src);
  const footer = /<footer className="fnn-footer">([\s\S]*?)<\/footer>/.exec(code)?.[1] ?? "";
  const out: string[] = [];
  if (!footer) return ["التذييل غير موجود"];
  if (!/مكتبة المعرفة/.test(footer) || !/تأكيدك/.test(footer)) out.push("العربية بلا الاستثناء");
  if (!/knowledge library/i.test(footer) || !/confirmation/i.test(footer)) {
    out.push("الإنجليزية بلا الاستثناء");
  }
  if (/مساعدة نصية فقط/.test(footer) || /Text assistance only/.test(footer)) {
    out.push("ادّعاء «نصية فقط» المطلق");
  }
  return out;
}

/** أصناف Tailwind (رموز مفصولة بمسافة) من قيم className المكتوبة. */
function classTokens(src: string): string[] {
  const out = new Set<string>();
  for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const text = (m[1] ?? m[2] ?? "").replace(/\$\{[^}]*\}/g, " ");
    for (const t of text.split(/\s+/)) if (t) out.add(t);
  }
  // سلاسل الأصناف داخل التعبيرات الشرطية (فروع الألوان).
  for (const m of src.matchAll(/"([^"\n]*(?:var\(--|rounded)[^"\n]*)"/g)) {
    for (const t of m[1].split(/\s+/)) if (t) out.add(t);
  }
  return [...out];
}

describe("① النموذج لا يرى الملف — العزل في الاتجاهين", () => {
  const SOURCES = Object.fromEntries(
    [...IMPORT_SIDE, ...CHAT_SIDE].map((f) => [f, read(f)] as const),
  );

  it("ملفات الاستيراد وملفات المحادثة موجودة، والعزل سليم", () => {
    for (const f of [...IMPORT_SIDE, ...CHAT_SIDE]) expect(existsSync(f), f).toBe(true);
    expect(isolationViolations(SOURCES)).toEqual([]);
    // أرضية (المادة ٣٠): الكاشف يرى استيراداتٍ فعلًا في الطرفين.
    expect(specifiers(strip(SOURCES["src/components/finn/use-finn-import.ts"]))).toContain(
      "@/lib/finn-import/client",
    );
    expect(specifiers(strip(SOURCES["src/components/finn/use-finn-chat.ts"]))).toContain(
      "@/lib/finn-agent/client",
    );
  });

  it("مزروع: المحادثة تستورد الاستيراد، أو الاستيراد يستورد ناقل المحادثة ⇒ يحمرّ", () => {
    const base = { ...SOURCES };
    const chatLeak = {
      ...base,
      "src/components/finn/use-finn-chat.ts": `import { postFinnImport } from "@/lib/finn-import/client";\n${base["src/components/finn/use-finn-chat.ts"]}`,
    };
    expect(isolationViolations(chatLeak)).toEqual([
      "src/components/finn/use-finn-chat.ts: يستورد finn-import",
    ]);
    const formLeak = {
      ...base,
      "src/lib/finn-agent/client.ts": `${base["src/lib/finn-agent/client.ts"]}\nconst f = new FormData();`,
    };
    expect(isolationViolations(formLeak)).toEqual([
      "src/lib/finn-agent/client.ts: يذكر الاستيراد أو multipart",
    ]);
    const hookLeak = {
      ...base,
      "src/components/finn/use-finn-import.ts": `import { streamFinnReply } from "@/lib/finn-agent/client";\n${base["src/components/finn/use-finn-import.ts"]}`,
    };
    expect(isolationViolations(hookLeak)).toEqual([
      "src/components/finn/use-finn-import.ts: يستورد @/lib/finn-agent/client",
    ]);
    const serverLeak = {
      ...base,
      "src/lib/finn-import/client.ts": `import { x } from "@/lib/finn-import/ingest.server";\n${base["src/lib/finn-import/client.ts"]}`,
    };
    expect(isolationViolations(serverLeak)).toEqual([
      "src/lib/finn-import/client.ts: يستورد @/lib/finn-import/ingest.server",
    ]);
    // والذكر في تعليقٍ لا يُدان.
    expect(
      isolationViolations({
        ...base,
        "src/lib/finn-agent/client.ts": `// FormData غير مستعمل هنا\n${base["src/lib/finn-agent/client.ts"]}`,
      }),
    ).toEqual([]);
  });

  it("مزروع: نداء شبكة مباشر أو نقطة المحادثة داخل ملفات الاستيراد ⇒ يحمرّ (M14c)", () => {
    const hook = "src/components/finn/use-finn-import.ts";
    const cases: Array<[label: string, file: string, extra: string, expected: string[]]> = [
      [
        "fetch إلى نقطة المحادثة من الخطّاف (الانتهاك الذي نجا)",
        hook,
        "void fetch('/api/finn/chat',{method:'POST',body:JSON.stringify({messages:[{role:'user',content:name}]})});",
        [
          `${hook}: شبكة مباشرة (fetch/XHR/sendBeacon…)`,
          `${hook}: يذكر نقطة المحادثة أو مسار /api/finn`,
        ],
      ],
      [
        "fetch عبر globalThis",
        hook,
        "void globalThis.fetch(url);",
        [`${hook}: شبكة مباشرة (fetch/XHR/sendBeacon…)`],
      ],
      [
        "fetch بلا استدعاء (مرجع)",
        hook,
        "const f = window.fetch;",
        [`${hook}: شبكة مباشرة (fetch/XHR/sendBeacon…)`],
      ],
      [
        "XMLHttpRequest",
        hook,
        "const x = new XMLHttpRequest();",
        [`${hook}: شبكة مباشرة (fetch/XHR/sendBeacon…)`],
      ],
      [
        "sendBeacon",
        hook,
        "navigator.sendBeacon(url, name);",
        [`${hook}: شبكة مباشرة (fetch/XHR/sendBeacon…)`],
      ],
      [
        "ثابت نقطة المحادثة بلا نداء مباشر",
        "src/lib/finn-import/client.ts",
        "const route = FINN_IDENTITY.apiRoute;",
        ["src/lib/finn-import/client.ts: يذكر نقطة المحادثة أو مسار /api/finn"],
      ],
      [
        "استيراد هوية فِن (حامل apiRoute)",
        "src/components/finn/FinnImportCard.tsx",
        'import { FINN_IDENTITY } from "@/lib/finn-agent/identity";',
        ["src/components/finn/FinnImportCard.tsx: يذكر نقطة المحادثة أو مسار /api/finn"],
      ],
      [
        "مسار /api/finn/* آخر",
        hook,
        'const u = "/api/finn/tools";',
        [`${hook}: يذكر نقطة المحادثة أو مسار /api/finn`],
      ],
    ];
    for (const [label, file, extra, expected] of cases) {
      expect(
        isolationViolations({ ...SOURCES, [file]: `${SOURCES[file]}\n${extra}` }),
        label,
      ).toEqual(expected);
    }
    // والمشروع بحاله لا يدين: `authenticatedFetch` و«auth-fetch» ليسا شبكةً مباشرة، والتعليقات لا تُدان.
    expect(SOURCES["src/lib/finn-import/client.ts"]).toContain("authenticatedFetch");
    expect(
      isolationViolations({
        ...SOURCES,
        [hook]: `// لا fetch ولا /api/finn/chat هنا\n${SOURCES[hook]}`,
      }),
    ).toEqual([]);
  });

  it("FinnChat: submit لا يذكر الاستيراد، وuseFinnChat بلا وسائط — ومزروع: يحمرّ", () => {
    const chat = read("src/components/finn/FinnChat.tsx");
    expect(chatSubmitProblems(chat)).toEqual([]);
    expect(chat).toContain("importer.reset()");
    const planted = chat.replace(
      "void send(text);",
      "void send(`${text} ${importer.state.phase}`);",
    );
    expect(chatSubmitProblems(planted)).toEqual(["submit يذكر الاستيراد"]);
    expect(chatSubmitProblems(chat.replace("useFinnChat()", "useFinnChat(importer)"))).toEqual([
      "useFinnChat يستقبل وسائط",
    ]);
  });
});

describe("② لا تحليل جداول ولا سجلّ ولا حروف مكرَّرة من العقد في العميل", () => {
  it.each([
    ...IMPORT_SIDE,
    "src/components/finn/FinnComposer.tsx",
    "src/components/finn/FinnChat.tsx",
  ])("%s", (f) => {
    expect(clientPrivacyViolations(f, read(f))).toEqual([]);
  });

  it("مزروع: كلٌّ من القراءة والتحليل والسجلّ والحرف المكرَّر يحمرّ", () => {
    const base = read("src/lib/finn-import/client.ts");
    const f = "client.ts";
    const planted = (extra: string) => clientPrivacyViolations(f, `${base}\n${extra}`);
    expect(planted("const r = new FileReader();")).toEqual([`${f}: تحليل ملف/جداول في العميل`]);
    expect(planted("const b = await file.arrayBuffer();")).toEqual([
      `${f}: تحليل ملف/جداول في العميل`,
    ]);
    expect(planted("const t = await file.text();")).toEqual([`${f}: تحليل ملف/جداول في العميل`]);
    expect(planted('const X = await import("xlsx");')).toEqual([`${f}: تحليل ملف/جداول في العميل`]);
    expect(planted('import * as XLSX from "xlsx";')).toEqual([`${f}: تحليل ملف/جداول في العميل`]);
    expect(planted("console.info(file.name);")).toEqual([`${f}: console`]);
    expect(planted('form.append("token", t);')).toEqual([`${f}: حرفٌ مكرَّر من العقد`]);
    expect(planted('fetch("/api/finn/import");')).toEqual([`${f}: حرفٌ مكرَّر من العقد`]);
    // والذكر في تعليقٍ (كوثيقة هذا الملف نفسه) لا يُدان.
    expect(planted("// لا FileReader ولا console هنا")).toEqual([]);
  });

  it("العميل يستعمل ثوابت العقد: نقطة النهاية والحقول والامتدادات والحدود", () => {
    const code = strip(read("src/lib/finn-import/client.ts"));
    for (const name of [
      "FINN_IMPORT_ENDPOINT",
      "FINN_IMPORT_FIELDS",
      "FINN_IMPORT_EXTENSIONS",
      "FINN_IMPORT_LIMITS",
    ]) {
      expect(code, name).toContain(name);
    }
    expect(code).toMatch(/from "\.\/contract"/);
  });
});

describe("③ من يملك المشبك، وصدق النصوص", () => {
  const FILES = {
    workspace: read("src/components/finn/FnnWorkspace.tsx"),
    route: read("src/routes/_authenticated/finn.tsx"),
    home: read("src/components/finn/HomeFinnCard.tsx"),
    chat: read("src/components/finn/FinnChat.tsx"),
  };

  it("المساحتان الكاملتان تمرّران allowImport، والرئيسية لا، والافتراضي false", () => {
    expect(wiringProblems(FILES)).toEqual([]);
  });

  it("مزروع: الرئيسية تمرّر allowImport، أو مساحةٌ تُسقطه، أو الافتراضي true ⇒ يحمرّ", () => {
    expect(
      wiringProblems({
        ...FILES,
        home: FILES.home.replace('variant="inline"', 'variant="inline" allowImport'),
      }),
    ).toEqual(["بطاقة الرئيسية تمرّر allowImport"]);
    expect(
      wiringProblems({ ...FILES, workspace: FILES.workspace.replace(" allowImport />", " />") }),
    ).toEqual(["/fnn بلا allowImport"]);
    expect(
      wiringProblems({ ...FILES, route: FILES.route.replace(" allowImport />", " />") }),
    ).toEqual(["/finn بلا allowImport"]);
    expect(
      wiringProblems({
        ...FILES,
        chat: FILES.chat.replace("allowImport = false", "allowImport = true"),
      }),
    ).toEqual(["الافتراضي ليس false"]);
    // والذكر في تعليقٍ في الرئيسية لا يُدان.
    expect(wiringProblems({ ...FILES, home: `// لا allowImport هنا\n${FILES.home}` })).toEqual([]);
  });

  it("الشريط الحرفيّ باقٍ كما هو؛ وتلميحه يذكر الاستثناء ويُبقي ما يصدق على النموذج", () => {
    expect(FINN_BANNER_AR).toBe("يقترح ولا ينفّذ — راجع قبل أي تنفيذ");
    expect(FINN_COPY.bannerHint).toContain("لا يشغّل ولا يكتب في المستودع أو القاعدة");
    expect(FINN_COPY.bannerHint).toContain("مكتبة المعرفة");
    expect(FINN_COPY.bannerHint).toContain("بتأكيدك أنت");
  });

  it("تذييل المساحة الكاملة يذكر الاستثناء بلغتين ولا يدّعي «نصية فقط» مطلقًا — ومزروع: القديم يُدان", () => {
    expect(workspaceCopyProblems(FILES.workspace)).toEqual([]);
    const old = FILES.workspace
      .replace(/المحادثة نصّية: لا تنفيذ ذاتي[^"]*"/, 'مساعدة نصية فقط: لا تنفيذ ذاتي أو نشر."')
      .replace(
        /The chat is text-only:[^"]*"/,
        'Text assistance only: this chat does not execute."',
      );
    expect(workspaceCopyProblems(old)).toEqual(
      expect.arrayContaining([
        "العربية بلا الاستثناء",
        "الإنجليزية بلا الاستثناء",
        "ادّعاء «نصية فقط» المطلق",
      ]),
    );
  });

  it("بطاقة الرئيسية تبقى صادقة: قدراتها نصّية، وعبارتها «لا تنفيذ…» كما كانت، ولا ذكر للإرفاق", () => {
    expect(FILES.home).toContain(
      "القدرات نصية: لا تنفيذ أو نشر أو تعديل مستودع أو قاعدة بيانات من هذه المحادثة.",
    );
    expect(FILES.home).toContain('data-finn-execution="advisory"');
    expect(FINN_HOME_CAPABILITIES.map((c) => c.ar)).toEqual([
      "كتابة الكود ومراجعته",
      "تحليل الأخطاء المقدّمة",
      "تصميم خطط الأتمتة",
    ]);
    expect(JSON.stringify(FINN_HOME_CAPABILITIES)).not.toMatch(/ملف|إرفاق|مكتبة/);
    expect(strip(FILES.home)).not.toMatch(/FinnImport|finn-import|Paperclip/);
  });
});

describe("④ ميزانية CSS — كل صنفٍ في الإرفاق موجودٌ أصلًا في مصدرٍ آخر", () => {
  const ALL = globSync("src/**/*.{ts,tsx,css}").filter(
    (f) => !/finn-import-ui(\.contract)?\.test\.tsx?$/.test(f),
  );
  const OWN = new Set<string>([
    "src/components/finn/FinnImportCard.tsx",
    "src/components/finn/FinnComposer.tsx",
  ]);
  /** رموز كل ملفات src ما عدا ملفَي الإرفاق نفسيهما واختباراته. */
  const known = new Set<string>();
  for (const f of ALL) {
    if (OWN.has(f)) continue;
    for (const t of read(f).split(/[\s"'`{}]+/)) if (t) known.add(t);
  }
  const unseen = (src: string) => classTokens(src).filter((t) => !known.has(t));

  it("لا صنف جديد في بطاقة الاستيراد ولا في مشبك الكتابة", () => {
    const card = read("src/components/finn/FinnImportCard.tsx");
    const clip =
      /<button\s+ref=\{attach\.buttonRef\}[\s\S]*?<\/button>/.exec(
        read("src/components/finn/FinnComposer.tsx"),
      )?.[0] ?? "";
    expect(clip, "المشبك غائب").not.toBe("");
    expect(classTokens(card).length).toBeGreaterThan(20); // أرضية: الكاشف يرى الأصناف
    expect(classTokens(clip).length).toBeGreaterThan(8);
    expect(unseen(card)).toEqual([]);
    expect(unseen(clip)).toEqual([]);
  });

  it("مزروع: صنفٌ جديد (قيمة اعتباطية أو لون) في البطاقة أو المشبك ⇒ يُلتقط", () => {
    const card = read("src/components/finn/FinnImportCard.tsx");
    const planted = card.replace("flex max-h-56 min-h-0", "flex max-h-[137px] w-[211px] min-h-0");
    expect(unseen(planted)).toEqual(["max-h-[137px]", "w-[211px]"]);
    expect(unseen(card.replace("px-3 py-2", "px-3 py-[9px]"))).toEqual(["py-[9px]"]);
  });
});
