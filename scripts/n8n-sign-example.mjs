#!/usr/bin/env node
/**
 * مثال توقيع طلب n8n (عقد v1): يبني طلبًا موقَّعًا ويطبع أمر curl، وبـ`--send` يرسله
 * ويتحقق من توقيع الردّ. بلا اعتماديات. السرّ يُقرأ من البيئة ولا يُطبع أبدًا.
 *
 *   export SADEED_N8N_SECRET='<32 حرفًا فأكثر>'
 *   node scripts/n8n-sign-example.mjs --path=sadeed-research-v1 --base=https://n8n.example.com
 *   node scripts/n8n-sign-example.mjs --path=fnn-research-v1 --mode=docs --send --base=...
 *   node scripts/n8n-sign-example.mjs --path=fnn-runner-v1 --workflow=canary_run_now --send --base=...
 *
 * خيارات الاختبار السلبي (يلزم أن يعود الردّ 200 بـ code=auth_failed):
 *   --tamper     يعدّل المتن بعد التوقيع
 *   --skew=60    يُزيح الطابع الزمني بالثواني
 *
 * هذه نسخة مستقلة من صيغة التوقيع، تُقارَن في الاختبار بمتجهات ذهبية حُسبت بـopenssl.
 */
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

export const PATHS = {
  "sadeed-research-v1": {
    secretEnv: "SADEED_N8N_SECRET",
    kind: "research",
    flavor: "sadeed",
    deadlineMs: 1800,
  },
  "fnn-research-v1": {
    secretEnv: "FINN_N8N_SECRET",
    kind: "research",
    flavor: "fnn",
    deadlineMs: 6000,
  },
  "fnn-runner-v1": {
    secretEnv: "FINN_N8N_SECRET",
    kind: "runner",
    flavor: "fnn",
    deadlineMs: 20000,
  },
};

const sha256hex = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const hmacHex = (secret, text) => createHmac("sha256", secret).update(text, "utf8").digest("hex");

/** يبني {url, headers, body} موقَّعًا. كل مدخل زمني/عشوائي قابل للحقن للاختبار. */
export function buildSignedRequest(options) {
  const spec = PATHS[options.path];
  if (!spec) throw new Error("مسار غير معروف: " + options.path);
  const secret = options.secret;
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("السرّ غائب أو أقصر من 32 حرفًا");
  }
  const now = options.now === undefined ? Date.now() : options.now;
  const ts = Math.floor(now / 1000) + (Number(options.skew) || 0);
  const nonce = options.nonce || randomBytes(16).toString("hex");
  const requestId = options.requestId || randomUUID();

  const payload =
    spec.kind === "runner"
      ? { v: 1, requestId, workflow: options.workflow || "canary_run_now", params: {} }
      : {
          v: 1,
          requestId,
          mode: options.mode || (spec.flavor === "sadeed" ? "general" : "docs"),
          brief: {
            terms: options.terms || ["permit", "hot work"],
            codes: [],
            lang: options.lang || "en",
          },
          maxResults: 5,
          freshness: "any",
        };
  const body = JSON.stringify(payload);
  const signature =
    "v1=" +
    hmacHex(secret, "nx-n8n:v1|" + ts + "|" + nonce + "|" + options.path + "|" + sha256hex(body));
  const headers = {
    "Content-Type": "application/json",
    "X-Nx-Key-Id": "v1",
    "X-Nx-Ts": String(ts),
    "X-Nx-Nonce": nonce,
    "X-Nx-Deadline-Ms": String(options.deadlineMs || spec.deadlineMs),
    "X-Nx-Sig": signature,
  };
  if (spec.kind === "runner")
    headers["Idempotency-Key"] = options.idemKey || randomBytes(16).toString("hex");
  const sentBody = options.tamper ? body.replace('"v":1', '"v":2') : body;
  const base = String(options.base || "https://n8n.example.com").replace(/\/+$/, "");
  return { url: base + "/webhook/" + options.path, headers, body: sentBody, nonce, ts };
}

/** يتحقق من ترويسات الردّ والمتن. يعيد {ok, reason}. */
export function verifyResponse({ secret, nonce, body, headers, now }) {
  const respTs = headers["x-nx-resp-ts"];
  const sig = headers["x-nx-resp-sig"];
  if (!respTs || !sig) return { ok: false, reason: "ترويسات التوقيع غائبة" };
  if (Math.abs(now - Number(respTs) * 1000) > 30000)
    return { ok: false, reason: "انحراف الطابع الزمني" };
  const expected =
    "v1=" + hmacHex(secret, "nx-n8n:v1:resp|" + respTs + "|" + nonce + "|" + sha256hex(body));
  return expected === sig ? { ok: true, reason: "" } : { ok: false, reason: "التوقيع لا يطابق" };
}

export function curlCommand(request) {
  const headers = Object.entries(request.headers)
    .map(([k, v]) => "  -H '" + k + ": " + v + "' \\\n")
    .join("");
  return (
    "curl -sS -X POST '" + request.url + "' \\\n" + headers + "  --data '" + request.body + "'"
  );
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) out[m[1]] = m[2] === undefined ? true : m[2];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const spec = PATHS[args.path];
  if (!spec) {
    console.error("استعمل --path=" + Object.keys(PATHS).join(" | "));
    process.exit(2);
  }
  const secretEnv = typeof args["secret-env"] === "string" ? args["secret-env"] : spec.secretEnv;
  const secret = process.env[secretEnv] || "";
  const request = buildSignedRequest({
    path: args.path,
    base: args.base,
    secret,
    mode: args.mode,
    workflow: args.workflow,
    skew: args.skew,
    tamper: Boolean(args.tamper),
  });
  if (!args.send) {
    console.log(curlCommand(request));
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: request.body,
      redirect: "error",
      signal: controller.signal,
    });
    const text = (await res.text()).slice(0, 32768);
    const headers = Object.fromEntries(res.headers.entries());
    const check = verifyResponse({
      secret,
      nonce: request.nonce,
      body: text,
      headers,
      now: Date.now(),
    });
    console.log("حالة HTTP: " + res.status);
    console.log("توقيع الردّ: " + (check.ok ? "سليم" : "غير سليم (" + check.reason + ")"));
    console.log(text);
  } finally {
    clearTimeout(timer);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("فشل: " + (error && error.message ? error.message : String(error)));
    process.exit(1);
  });
}
