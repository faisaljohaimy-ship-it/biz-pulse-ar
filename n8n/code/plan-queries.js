/**
 * plan-queries: يحوّل «الموجز» (كلمات ورموز لا الجملة الخام) إلى طلبات للمزوّدين.
 *
 * نقية: لا شبكة. تُنتج كائن خطّة تقرؤه عقد البوّابة والطلبات. لا تجلب صفحات:
 * المزوّدون يعيدون مقتطفات (snippets) فقط، ولا مسار هنا لتحميل صفحة أو لكشط
 * HTML أي محرّك بحث. كل عنوان يُبنى من ثوابت هذا الملف + نصّ مُرمَّز.
 *
 * وضع regulatory (سَدِيد، المادة ٩: المصادر غير الرسمية للوائح محظورة): جوجل وTavily
 * يُقيَّدان بالنطاقات الرسمية، ولا يُستدعى Brave ولا مزوّد بلا مفتاح (ويكيبيديا وأخواتها
 * مرجعية لا رسمية)، ويُسقط merge-rank أي نتيجة من غير النطاقات الرسمية والحكومية
 * السعودية. القائمة هنا مرجع النقل لا مرجع الحكم: التطبيق يعيد حساب الطبقة من جدوله.
 *
 * المزوّدون بمفتاح يُستدعَون بالتتابع (n8n ينفّذ فروع المخرج الواحد واحدًا بعد آخر، من
 * الأعلى يسارًا)، فالموعد الداخلي لا يُحفظ بمهلة ثابتة بل بميزانية متبقّية: كل بوّابة
 * تحسب ما بقي من الموعد (بعد حجز ذيل للدفعة الأخيرة بلا مفتاح) وتسلّم مهلة النداء
 * (timeoutMs) فتقصر المهلة كلما استُهلك الوقت، ولا يبدأ نداء يقلّ ما بقي له عن
 * الحدّ الأدنى MIN_CALL_MS.
 *
 * التنظيف: الحدود والاقتباس والنقطتان تُزال من الكلمات حتى لا يصير مدخلٌ
 * مثل `site:evil.com` عامل بحث. محتوى الويب غير موثوق، وهذا الملف لا يثق بالموجز
 * أيضًا (الموجز يبنيه التطبيق، لكن الفحص هنا دفاع إضافي).
 */

/** أقل مهلة تستحق بها محاولة نداء. ما دونها يُتخطّى بحالة timeout بزمن صفر. */
const MIN_CALL_MS = 250;
/** ذيل من الموعد الداخلي يُحجز لدفعة المزوّدين بلا مفتاح (سريعة وبلا حصة) بعد المزوّدين بمفتاح. */
const KEYLESS_RESERVE_MS = 350;

const FLAVORS = {
  sadeed: {
    modes: ["general", "regulatory"],
    singles: ["google", "brave", "tavily"],
    timeoutMs: 1100,
    maxInternalMs: 1500,
  },
  fnn: {
    modes: ["docs", "code", "security", "general"],
    singles: ["google", "brave", "tavily", "github", "osv"],
    timeoutMs: 2500,
    maxInternalMs: 5000,
  },
};

const OFFICIAL_REGULATORY_DOMAINS = [
  "hcis.gov.sa",
  "uqn.gov.sa",
  "laws.boe.gov.sa",
  "moi.gov.sa",
  "my.gov.sa",
  "sdaia.gov.sa",
  "nca.gov.sa",
  "zatca.gov.sa",
  "saso.gov.sa",
];

const OFFICIAL_DOCS_DOMAINS = [
  "developer.mozilla.org",
  "nodejs.org",
  "react.dev",
  "typescriptlang.org",
  "tanstack.com",
  "supabase.com",
  "vite.dev",
  "postgresql.org",
  "docs.n8n.io",
  "web.dev",
];

/** المضيفون المسموح بهم في أي طلب يُبنى هنا. الاختبار يفحص هذا بإدخال مخالفة. */
const ALLOWED_HOSTS = [
  "www.googleapis.com",
  "api.search.brave.com",
  "api.tavily.com",
  "api.github.com",
  "api.osv.dev",
  "api.openalex.org",
  "www.wikidata.org",
  "developer.mozilla.org",
  "registry.npmjs.org",
  "services.nvd.nist.gov",
  "ar.wikipedia.org",
  "en.wikipedia.org",
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NPM_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const ADVISORY_CODE_RE = /^(CVE-[0-9]{4}-[0-9]{4,}|GHSA(-[a-z0-9]{4}){3})$/i;
const OPERATOR_WORDS = /^(OR|AND|NOT)$/;

function flavorOf(name) {
  return Object.prototype.hasOwnProperty.call(FLAVORS, name) ? FLAVORS[name] : null;
}

/** يبقي الحروف والأرقام والمسافة وبعض الرموز الآمنة؛ يحيّد عوامل البحث. */
function sanitizeTerm(text) {
  const kept = String(text)
    .normalize("NFKC")
    // تشكيل العربية (الحركات وألف الخنجر) والتطويل: يُحذف فيبقى الجذر الكامل للبحث.
    .replace(/[\u0640\u064b-\u065f\u0670]/g, "")
    // محدّدات الصيغة غير المرئية (Mn) لا تدخل استعلامًا.
    .replace(/[\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu, "")
    // \p{M} تبقي علامات الحروف في اللغات الأخرى (الديفاناغاري وغيرها) فلا تتفتت الكلمة.
    .replace(/[^\p{L}\p{N}\p{M}\s._+#@/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  // الشرطة في أول الكلمة عامل استبعاد عند محرّكات البحث (-كلمة)؛ الشرطة داخلها (SEC-12) تبقى.
  return kept
    .split(" ")
    .map((word) => word.replace(/^-+/, ""))
    .filter((word) => word.length > 0)
    .map((word) => (OPERATOR_WORDS.test(word) ? word.toLowerCase() : word))
    .join(" ");
}

// الطول بنقاط الرمز لا بوحدات UTF-16: مخطط التطبيق (zod 4) يعدّ نقاط الرمز، فكلمة من 40 نقطة فوق BMP
// (80 وحدة) يقبلها التطبيق ويجب أن يقبلها هذا الفحص (`bad_terms` كان يرفضها).
function isStringArray(value, maxItems, maxLength) {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every(
      (item) =>
        typeof item === "string" &&
        item.length <= maxLength * 2 &&
        Array.from(item).length <= maxLength,
    )
  );
}

/** تحقق من بنية الطلب (جسم العقد). يعيد {ok, request} أو {ok:false, reason}. */
function validateRequest(body, flavor) {
  const spec = flavorOf(flavor);
  if (!spec) return { ok: false, reason: "bad_flavor" };
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, reason: "not_object" };
  }
  if (body.v !== 1) return { ok: false, reason: "bad_version" };
  if (typeof body.requestId !== "string" || !UUID_RE.test(body.requestId)) {
    return { ok: false, reason: "bad_request_id" };
  }
  if (spec.modes.indexOf(body.mode) === -1) return { ok: false, reason: "bad_mode" };
  const brief = body.brief;
  if (!brief || typeof brief !== "object") return { ok: false, reason: "bad_brief" };
  if (!isStringArray(brief.terms, 6, 40)) return { ok: false, reason: "bad_terms" };
  if (!isStringArray(brief.codes === undefined ? [] : brief.codes, 4, 24)) {
    return { ok: false, reason: "bad_codes" };
  }
  if (brief.lang !== "ar" && brief.lang !== "en") return { ok: false, reason: "bad_lang" };
  const maxResults = body.maxResults === undefined ? 5 : body.maxResults;
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 6) {
    return { ok: false, reason: "bad_max_results" };
  }
  const freshness = body.freshness === undefined ? "any" : body.freshness;
  if (["any", "month", "year"].indexOf(freshness) === -1) {
    return { ok: false, reason: "bad_freshness" };
  }
  return {
    ok: true,
    request: {
      requestId: body.requestId,
      mode: body.mode,
      terms: brief.terms,
      codes: brief.codes || [],
      lang: brief.lang,
      maxResults,
      freshness,
    },
  };
}

/**
 * @param {string} flavor
 * @param {number|null|undefined} deadlineMs X-Nx-Deadline-Ms
 * @param {boolean} [hasKeyless] هل توجد دفعة بلا مفتاح تُحجز لها مدّة
 * gateMs: آخر لحظة (منذ t0) يجوز فيها بدء نداء بمفتاح؛ keylessGateMs: للدفعة الأخيرة.
 */
function deadlines(flavor, deadlineMs, hasKeyless) {
  const spec = flavorOf(flavor);
  let internal = spec.maxInternalMs;
  if (typeof deadlineMs === "number" && isFinite(deadlineMs)) {
    internal = Math.min(spec.maxInternalMs, Math.max(600, deadlineMs - 300));
  }
  const reserve = hasKeyless ? KEYLESS_RESERVE_MS : 0;
  return {
    internalDeadlineMs: internal,
    keylessReserveMs: reserve,
    gateMs: Math.max(internal - reserve - MIN_CALL_MS, 0),
    keylessGateMs: Math.max(internal - MIN_CALL_MS, 0),
  };
}

/**
 * مهلة النداء الممكنة الآن: ما تبقّى من الموعد الداخلي (بعد الحجز) محصورًا بمهلة المزوّد.
 * يعيد 0 إن قلّ المتبقي عن MIN_CALL_MS أو كان الوقت غير صالح (يفشل مغلقًا: لا نداء).
 */
function callBudget(plan, reserveMs, now) {
  const left = plan.internalDeadlineMs - reserveMs - (now - plan.t0);
  if (typeof left !== "number" || !isFinite(left) || left < MIN_CALL_MS) return 0;
  return Math.min(plan.timeoutMs, Math.floor(left));
}

function cleanBody(object) {
  const out = {};
  for (const key of Object.keys(object)) {
    if (object[key] !== undefined) out[key] = object[key];
  }
  return out;
}

function sinceDate(now, days) {
  return new Date(now - days * 86400000).toISOString().slice(0, 10);
}

function queryString(pairs) {
  return pairs.map((pair) => pair[0] + "=" + encodeURIComponent(pair[1])).join("&");
}

function siteClause(domains) {
  return "(" + domains.map((domain) => "site:" + domain).join(" OR ") + ")";
}

/**
 * @param {object} input
 * @param {string} input.flavor sadeed | fnn
 * @param {*} input.body جسم الطلب المحلَّل
 * @param {{googleCx?: string}} [input.env] إعدادات غير سرية
 * @param {number} input.now الوقت بالميللي ثانية
 * @param {number|null} [input.deadlineMs] X-Nx-Deadline-Ms
 * @param {string} [input.stubBase] أساس خادم الاختبار (ملف stub فقط؛ فارغ في الإنتاج)
 */
function planQueries(input) {
  const flavor = input && input.flavor;
  const valid = validateRequest(input && input.body, flavor);
  if (!valid.ok) return { ok: false, code: "bad_request", reason: valid.reason };
  const spec = flavorOf(flavor);
  const req = valid.request;
  const now = typeof input.now === "number" ? input.now : Date.now();
  const env = (input && input.env) || {};

  const terms = req.terms.map(sanitizeTerm).filter((term) => term.length > 0);
  const codes = req.codes.map(sanitizeTerm).filter((code) => code.length > 0);
  if (terms.length === 0 && codes.length === 0) {
    return { ok: false, code: "bad_request", reason: "empty_brief" };
  }
  const plain = terms.concat(codes).join(" ").slice(0, 200).trim();
  const quoted = terms
    .concat(codes.map((code) => '"' + code + '"'))
    .join(" ")
    .slice(0, 220)
    .trim();

  const n = req.maxResults;
  const q = encodeURIComponent(plain);
  const mode = req.mode;
  // ملف stub يوجّه كل مضيف إلى خادم الاختبار المحلي: stubBase ثم / ثم المضيف.
  const stubBase = typeof input.stubBase === "string" ? input.stubBase.replace(/\/+$/, "") : "";
  const at = (hostName) => (stubBase ? stubBase + "/" + hostName : "https://" + hostName);

  const restrictDomains =
    mode === "regulatory"
      ? OFFICIAL_REGULATORY_DOMAINS
      : mode === "docs"
        ? OFFICIAL_DOCS_DOMAINS
        : null;
  const keyedModes = {
    google: ["general", "regulatory", "docs", "code"],
    // Brave لا يُستدعى في regulatory: لا نعتمد دعمه لعوامل site: و OR، وغير المقيَّد غير رسمي (المادة ٩).
    brave: ["general", "docs", "code"],
    tavily: ["general", "regulatory", "docs", "code"],
    github: ["code"],
    osv: ["security"],
  };

  const providers = {};
  for (const id of spec.singles) {
    providers[id] = { run: false, reason: "not_in_mode", req: null };
  }
  const enable = (id, request, reason) => {
    if (!providers[id]) return;
    providers[id] = { run: reason === undefined, reason: reason || "", req: request };
  };

  if (providers.google && keyedModes.google.indexOf(mode) !== -1) {
    const cx = typeof env.googleCx === "string" ? env.googleCx.trim() : "";
    const query = {
      q: restrictDomains ? quoted + " " + siteClause(restrictDomains) : quoted,
      cx: cx,
      num: Math.min(n, 10),
      safe: "active",
      lr: req.lang === "ar" ? "lang_ar" : "lang_en",
    };
    if (req.freshness === "month") query.dateRestrict = "m1";
    if (req.freshness === "year") query.dateRestrict = "y1";
    enable("google", { query }, cx ? undefined : "not_configured");
  }
  if (providers.brave && keyedModes.brave.indexOf(mode) !== -1) {
    const query = {
      q: quoted,
      count: Math.min(n, 20),
      search_lang: req.lang,
      safesearch: "moderate",
      result_filter: "web",
      text_decorations: "false",
    };
    if (req.freshness === "month") query.freshness = "pm";
    if (req.freshness === "year") query.freshness = "py";
    enable("brave", { query, headers: { Accept: "application/json" } });
  }
  if (providers.tavily && keyedModes.tavily.indexOf(mode) !== -1) {
    const body = cleanBody({
      query: quoted,
      max_results: Math.min(n, 10),
      search_depth: "basic",
      topic: "general",
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      include_domains: restrictDomains || undefined,
      time_range: req.freshness === "any" ? undefined : req.freshness,
    });
    enable("tavily", { body });
  }
  if (providers.github && keyedModes.github.indexOf(mode) !== -1) {
    enable("github", {
      query: { q: plain, per_page: Math.min(n, 10) },
      headers: {
        Accept: "application/vnd.github.text-match+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "nx-n8n-research",
      },
    });
  }
  if (providers.osv && keyedModes.osv.indexOf(mode) !== -1) {
    const pkg = terms.map((t) => t.toLowerCase()).find((t) => NPM_NAME_RE.test(t));
    if (pkg) enable("osv", { body: { package: { name: pkg, ecosystem: "npm" } } });
    else providers.osv = { run: false, reason: "no_package_term", req: null };
  }

  const keyless = [];
  const wanted = {
    general: ["wikipedia", "wikidata", "openalex"],
    regulatory: [],
    docs: ["mdn"],
    code: [],
    security: ["npm", "nvd"],
  };
  const keylessIds = (wanted[mode] || []).slice();
  if (flavor === "fnn" && mode === "general") keylessIds.splice(0, keylessIds.length, "wikipedia");
  for (const id of keylessIds) {
    if (id === "wikipedia") {
      keyless.push({
        id,
        method: "GET",
        lang: req.lang,
        url:
          at(req.lang + ".wikipedia.org") +
          "/w/api.php?" +
          queryString([
            ["action", "query"],
            ["list", "search"],
            ["srsearch", plain],
            ["srlimit", String(n)],
            ["srprop", "snippet|timestamp"],
            ["format", "json"],
            ["formatversion", "2"],
            ["utf8", "1"],
          ]),
      });
    } else if (id === "wikidata") {
      keyless.push({
        id,
        method: "GET",
        lang: req.lang,
        url:
          at("www.wikidata.org") +
          "/w/api.php?" +
          queryString([
            ["action", "wbsearchentities"],
            ["search", plain],
            ["language", req.lang],
            ["uselang", req.lang],
            ["type", "item"],
            ["limit", String(n)],
            ["format", "json"],
          ]),
      });
    } else if (id === "openalex") {
      const pairs = [
        ["search", plain],
        ["per-page", String(n)],
        ["select", "id,display_name,doi,publication_date,primary_location"],
      ];
      if (req.freshness === "month") {
        pairs.push(["filter", "from_publication_date:" + sinceDate(now, 31)]);
      }
      if (req.freshness === "year") {
        pairs.push(["filter", "from_publication_date:" + sinceDate(now, 366)]);
      }
      keyless.push({
        id,
        method: "GET",
        lang: req.lang,
        url: at("api.openalex.org") + "/works?" + queryString(pairs),
      });
    } else if (id === "mdn") {
      keyless.push({
        id,
        method: "GET",
        lang: req.lang,
        url: at("developer.mozilla.org") + "/api/v1/search?q=" + q + "&locale=en-US&size=" + n,
      });
    } else if (id === "npm") {
      keyless.push({
        id,
        method: "GET",
        lang: req.lang,
        url: at("registry.npmjs.org") + "/-/v1/search?text=" + q + "&size=" + n,
      });
    } else if (id === "nvd") {
      const cve = codes.find((code) => /^CVE-[0-9]{4}-[0-9]{4,}$/i.test(code));
      keyless.push({
        id,
        method: "GET",
        lang: req.lang,
        url:
          at("services.nvd.nist.gov") +
          "/rest/json/cves/2.0?" +
          (cve
            ? "cveId=" + encodeURIComponent(cve.toUpperCase())
            : "keywordSearch=" + q + "&resultsPerPage=" + n),
      });
    }
  }
  if (mode === "security") {
    const advisory = codes.find((code) => ADVISORY_CODE_RE.test(code));
    if (advisory) {
      keyless.push({
        id: "osv",
        method: "GET",
        lang: req.lang,
        url: at("api.osv.dev") + "/v1/vulns/" + encodeURIComponent(advisory),
      });
    }
  }

  const times = deadlines(flavor, input.deadlineMs, keyless.length > 0);
  return {
    ok: true,
    flavor,
    requestId: req.requestId,
    mode,
    lang: req.lang,
    maxResults: n,
    freshness: req.freshness,
    queryText: plain,
    timeoutMs: spec.timeoutMs,
    internalDeadlineMs: times.internalDeadlineMs,
    keylessReserveMs: times.keylessReserveMs,
    gateMs: times.gateMs,
    keylessGateMs: times.keylessGateMs,
    t0: now,
    providers,
    keyless,
  };
}

/**
 * بوّابة مزوّد بمفتاح: هل يبدأ نداؤه الآن، وبأي مهلة؟ المهلة (timeoutMs) هي ما تبقّى من الموعد
 * الداخلي بعد حجز ذيل الدفعة الأخيرة، محصورًا بمهلة المزوّد، فمجموع الأزمنة لا يتجاوز الموعد.
 */
function gateProvider(input) {
  const plan = input.plan;
  const entry = plan && plan.providers && plan.providers[input.id];
  if (!entry) return { run: false, reason: "not_in_mode" };
  if (!entry.run) return { run: false, reason: entry.reason || "not_in_mode" };
  const timeoutMs = callBudget(plan, plan.keylessReserveMs || 0, input.now);
  if (timeoutMs === 0) return { run: false, reason: "deadline" };
  return { run: true, reason: "", timeoutMs };
}

/** بوّابة دفعة المزوّدين بلا مفتاح: آخر ما يُنفَّذ، فتأخذ كل ما تبقّى من الموعد الداخلي. */
function gateKeyless(input) {
  const plan = input.plan;
  if (!plan || !Array.isArray(plan.keyless) || plan.keyless.length === 0) {
    return { run: false, reason: "not_in_mode" };
  }
  const timeoutMs = callBudget(plan, 0, input.now);
  if (timeoutMs === 0) return { run: false, reason: "deadline" };
  return { run: true, reason: "", timeoutMs };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    FLAVORS,
    OFFICIAL_REGULATORY_DOMAINS,
    OFFICIAL_DOCS_DOMAINS,
    ALLOWED_HOSTS,
    planQueries,
    validateRequest,
    sanitizeTerm,
    gateProvider,
    gateKeyless,
    deadlines,
    MIN_CALL_MS,
    KEYLESS_RESERVE_MS,
  };
}
