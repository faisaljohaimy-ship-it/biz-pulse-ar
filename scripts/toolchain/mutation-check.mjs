#!/usr/bin/env node
/**
 * فحص الطفرات لبوابة التفويض (المادة ٣٠): يُضعف ضابطًا واحدًا في `delegate.mjs` مؤقتًا ثم يشغّل اختبار
 * العقد، ويجب أن يحمرّ. طفرة «نجت» = ضابط بلا اختبار يحميه. يستعيد الملف الأصلي دائمًا (finally +
 * معالجات الإشارات) ويتحقق من تطابقه بايتًا في النهاية.
 *
 *   node scripts/toolchain/mutation-check.mjs            # يشغّل كل الطفرات (~5 دقائق)
 *   node scripts/toolchain/mutation-check.mjs --applicable   # يتحقق أن كل نمط يطابق الشيفرة الحالية فقط
 *
 * يخرج بـ0 إن قُتلت كل الطفرات عدا «المكافئة المعلنة» (ضابط ثانٍ يغطيها)، وبـ1 غير ذلك، وبـ2 إن تعذّر
 * التشغيل نفسه (الاختبار لا ينجح على الملف الأصلي، أو فشل إطلاق vitest، أو انتهت المهلة).
 *
 * تنبيهان: ① الطفرات تُنشَر فوق `delegate.mjs` المتعقَّب في مكانه طوال الدقائق؛ لا تشغّله على شجرة
 * يستعملها غيرك في الوقت نفسه، ولا يلتقط `SIGKILL` (فإن قُتل بها فشغّل `git checkout -- scripts/toolchain/delegate.mjs`).
 * ② القائمة منتقاة بيد البشر لا شاملة: طفرة قُتلت = ضابط محميّ باختبار، وليس كل ضابط في الملف ممثَّلًا هنا.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TARGET = join(ROOT, "scripts", "toolchain", "delegate.mjs");
const TEST = "src/lib/security/toolchain-delegate.contract.test.ts";

/** [الاسم، النصّ الأصلي (يظهر مرة واحدة)، البديل، مكافئة معلنة؟] */
export const MUTATIONS = [
  [
    "run: بلا verifyInstallation",
    "const verified = verifyInstallation(prefix, tool, gitEnv);",
    "const verified = { sha256: sha256Hex(readFileSync(bin)) };",
  ],
  [
    "run: بلا إعادة بصمة الثنائي قبل الإطلاق",
    "if (sha256Hex(readFileSync(bin)) !== verified.sha256) {",
    "if (false) {",
  ],
  [
    "export: بلا مسح محتوى الملفات",
    "for (const h of [...scanSecrets(e.path, text, { values }), ...scanPii(text)]) {",
    "for (const h of []) {",
  ],
  [
    "export: بلا مسح أسماء الملفات",
    'for (const h of [...scanSecrets("name", e.path, { values }), ...scanPii(e.path)]) {',
    "for (const h of []) {",
  ],
  ["export: بلا رفض NUL (UTF-16/ثنائي)", "if (buf.includes(0)) {", "if (false) {"],
  [
    "export: بلا فحص نوع الإدخال/الوضع (رابط/gitlink)",
    'if (e.type !== "blob" || (e.mode !== "100644" && e.mode !== "100755")) {',
    "if (false) {",
  ],
  [
    "run: كتابة رقعة مرفوضة",
    "if (verdict.ok && !verdict.empty && safeWrite(base, patch))",
    "if (!verdict.empty && safeWrite(base, patch))",
  ],
  [
    "run: بلا تنقيح المفتاح من سجلّ الأحداث",
    "safeWrite(`${base}.events.jsonl`, redact(run.stdout, values));",
    "safeWrite(`${base}.events.jsonl`, run.stdout);",
  ],
  [
    "run: بلا فحص --out",
    "assertSafeOutPath(String(opts.out), { repoRoot })",
    "resolve(String(opts.out))",
  ],
  [
    "run: بلا wx في الكتابة",
    'writeFileSync(path, data, { flag: "wx" });',
    "writeFileSync(path, data);",
  ],
  [
    "config: بلا تحقّق إعداد المزوّد",
    "if (providerConfig) cfg.provider = validateProviderConfig(providerConfig);",
    "if (providerConfig) cfg.provider = providerConfig;",
  ],
  [
    "run: ollama بلا --provider-config",
    'if (spec.provider === "ollama" && !providerConfig)',
    "if (false)",
  ],
  [
    "run: cloudOk دائمًا",
    'assertProviderAllowed(model, { cloudOk: opts["cloud-ok"] === true })',
    "assertProviderAllowed(model, { cloudOk: true })",
  ],
  [
    "run: وراثة كل بيئة العملية",
    "env: { ...env, OPENCODE_CONFIG: cfgPath },",
    "env: { ...process.env, OPENCODE_CONFIG: cfgPath },",
  ],
  [
    "run: بلا values في فحص الرقعة",
    "const verdict = checkPatch(patch, { names, values });",
    "const verdict = checkPatch(patch, { names });",
  ],
  [
    "run: بلا assertWorkDirIsolated",
    "assertWorkDirIsolated(work, { repoRoot, env: buildGitEnv(process.env, { home: tmpdir() }) });",
    "/* off */",
  ],
  ["run: بلا سقف اكتشاف git", "env.GIT_CEILING_DIRECTORIES = work;", ""],
  [
    "run: بلا نسخ قالب الإعداد",
    'cpSync(join(prefix, CONFIG_TEMPLATE_DIR), join(home, ".config", "opencode"), {',
    "void ({",
  ],
  ["run: بلا قتل عند المهلة", "killGroup();\n    }, timeoutMs);", "}, timeoutMs);"],
  ["run: بلا معالجات الإشارات", "for (const [n, h] of handlers) process.on(n, h);", ""],
  [
    "run: git داخل مجلد الوكيل (بلا --git-dir)",
    '"--git-dir", gitDir, "--work-tree", exportDir, ',
    "",
  ],
  ["run: بلا رفض --prefix", "if (opts.prefix !== undefined) {", "if (false) {"],
  [
    "verify: بلا مطابقة بايتية لثنائي حزمة المنصّة",
    "if (!platformBinaryHashes(prefix, lockJson).has(sha256)) {",
    "if (false) {",
  ],
  [
    "verify: بلا فحص السجلّ",
    "if (record.version !== tool.version || record.binarySha256 !== sha256) {",
    "if (false) {",
  ],
  [
    "verify: بلا verifyInstalledLock",
    "const verdict = verifyInstalledLock(lockJson, tool);",
    "const verdict = { ok: true, problems: [] };",
  ],
  [
    "verify: بلا رفض مجلد التثبيت الرمزي",
    'if (lstatSync(prefix).isSymbolicLink()) throw new DelegateError("مجلد التثبيت رابط رمزي — مرفوض");',
    "",
  ],
  [
    "verify: بلا فحص إصدار القالب",
    'if (pkg.version !== tool.version) throw new Error("version");',
    "",
  ],
  [
    "verify: بلا فحص --version",
    "if (got !== tool.version) throw new DelegateError(`--version أعاد «${got}» لا ${tool.version}`);",
    "",
  ],
  ["git: بلا core.fsmonitor=false", '"core.fsmonitor=false"', '"core.quotepath=false"'],
  [
    "git: بلا core.hooksPath (خطّافات مستودع الأساس)",
    "`core.hooksPath=${NULL_DEVICE}`,",
    '"core.pager=cat",',
  ],
  ["git: بلا --no-ext-diff", ', "--no-ext-diff"', ""],
  ["git: بلا --no-textconv", ', "--no-textconv"', ""],
  [
    "patch: الترشيح القديم بالبادئة +++ (P1)",
    'else if (inHunk && l.startsWith("+")) addedLines.push(l.slice(1));',
    'else if (l.startsWith("+") && !l.startsWith("+++")) addedLines.push(l.slice(1));',
  ],
  [
    "model: بلا فحص Anthropic لكل مقطع",
    "if (segments.some((seg) => /^anthropic(?:$|[:@-])/i.test(seg))) {",
    "if (false) {",
  ],
  ["env: PATH نسبي يبقى", '.filter((d) => d !== "" && isAbsolute(d))', ".filter(() => true)"],
  // مكافئات معلنة: ضابط ثانٍ يغطّيها فلا يُميّزها السلوك الطرفي
  [
    "patch: بلا تمرير names (تقاطع احتياطي؛ يغطّيه اختبار الوحدة)",
    "const verdict = checkPatch(patch, { names, values });",
    "const verdict = checkPatch(patch, { values });",
    true,
  ],
];

const original = readFileSync(TARGET, "utf8");
const restore = () => writeFileSync(TARGET, original);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    restore();
    process.exit(130);
  });
}

function apply(old, replacement) {
  const n = original.split(old).length - 1;
  if (n !== 1) return null;
  return original.replace(old, () => replacement);
}

const applicableOnly = process.argv.includes("--applicable");
const rows = [];

function runTest() {
  return spawnSync("npx", ["vitest", "run", TEST], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 600_000,
  });
}

// أساس: قبل أي طفرة يجب أن ينجح الاختبار على الملف الأصلي، وإلا فكل «قتل» لاحق إنذار كاذب
// (وُجد أن `PATH=/nonexistent` كان يعطي «35 من 35 مقتولة» وخروج 0 دون أن يعمل الاختبار أصلًا).
if (!applicableOnly) {
  const base = runTest();
  if (base.error || base.status !== 0) {
    console.error(
      `✗ الاختبار لا ينجح على الملف الأصلي (status=${base.status}, error=${base.error?.message ?? "-"}) — الفحص مُجهَض`,
    );
    process.exit(2);
  }
}
try {
  for (const [name, old, replacement, equivalent] of MUTATIONS) {
    const mutated = apply(old, replacement);
    if (mutated === null) {
      rows.push({ name, status: "NOT-APPLIED", equivalent: !!equivalent });
      continue;
    }
    if (applicableOnly) {
      rows.push({ name, status: "APPLICABLE", equivalent: !!equivalent });
      continue;
    }
    writeFileSync(TARGET, mutated);
    const r = runTest();
    restore();
    // فشل التشغيل نفسه (لا إطلاق/مهلة/إشارة) ليس «قتلًا»: لا يدلّ على أن الاختبار رفض الطفرة
    const status = r.error || r.status === null ? "ERROR" : r.status === 0 ? "SURVIVED" : "KILLED";
    rows.push({ name, status, equivalent: !!equivalent });
  }
} finally {
  restore();
}
if (readFileSync(TARGET, "utf8") !== original) {
  console.error("✗ فشلت استعادة delegate.mjs — راجع git diff");
  process.exit(2);
}
let bad = 0;
for (const r of rows) {
  const flag =
    r.status === "KILLED" || r.status === "APPLICABLE"
      ? "✓"
      : r.equivalent && r.status === "SURVIVED"
        ? "≈"
        : "✗";
  if (flag === "✗") bad += 1;
  console.log(`${flag} ${r.status.padEnd(11)} ${r.name}${r.equivalent ? "  (مكافئة معلنة)" : ""}`);
}
if (rows.some((r) => r.status === "ERROR")) {
  console.error("✗ فشل تشغيل الاختبار في بعض الطفرات (ERROR) — النتيجة غير صالحة");
  process.exit(2);
}
const killed = rows.filter((r) => r.status === "KILLED").length;
console.log(
  `\n${killed} مقتولة من ${rows.length} (المكافئة المعلنة: ${rows.filter((r) => r.equivalent).length})، غير مقبولة: ${bad}`,
);
process.exit(bad === 0 ? 0 : 1);
