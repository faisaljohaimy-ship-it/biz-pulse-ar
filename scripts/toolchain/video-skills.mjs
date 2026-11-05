#!/usr/bin/env node
/**
 * سكيلز إنتاج الفيديو الثمانية (أمر المالك ٢٠٢٦/١١/٠٥) — الإيداع المسمَّر والتحقق والتثبيت.
 *
 * القفل `scripts/toolchain/video-skills.lock.json` هو مصدر الحقيقة: لكل سكيل مستودعٌ وcommit واحد
 * ورخصة، وقائمةُ ملفاتٍ مودَعة ببصمة sha256. ما يُودَع ملفات تعليمات فقط (md/json/txt وLICENSE وقوالب
 * معلنة بالاسم)؛ سكربتات الطرف الثالث (py/sh/js) **لا تُودَع** ولا تُنفَّذ من المستودع، وتُجلب عند الحاجة
 * بـ`fetch` إلى مجلد خارج git مسمَّرًا بالـcommit نفسه.
 *
 *   node scripts/toolchain/video-skills.mjs verify                 # بصمات الملفات المودَعة = القفل (البوابة)
 *   node scripts/toolchain/video-skills.mjs doctor                 # الحالة: الإيداع، الخطّاف، الأدوات المحلية
 *   node scripts/toolchain/video-skills.mjs sync --from <dir>      # (صيانة) إعادة الإيداع من استنساخات مسمَّرة
 *   node scripts/toolchain/video-skills.mjs fetch <id|all>         # جلب المستودع كاملًا عند الـcommit (خارج git)
 *   node scripts/toolchain/video-skills.mjs install-user [--dest <dir>] [--with-hook]
 *                                                                   # على جهاز المالك: نسخ المهارات إلى ~/.claude/skills
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { basename, dirname, extname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const LOCK_PATH = join(ROOT, "scripts", "toolchain", "video-skills.lock.json");
export const SKILLS_DIR = join(ROOT, ".claude", "skills");
export const ROUTER_SKILL = "sadeed-video-production";
export const HOOK_SCRIPT = "scripts/toolchain/video-prompt-router.mjs";

export class VideoSkillsError extends Error {}

export function readLock(path = LOCK_PATH) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** المسار المودَع لسكيلٍ ما: داخل مجلد مهارة الغلاف ليبقى كل سكيل مكتفيًا بنفسه عند النسخ. */
export function vendorDir(spec, root = ROOT) {
  return join(root, ".claude", "skills", spec.wrapper, "vendor");
}

export const toPosix = (p) => p.split(sep).join(posix.sep);

export function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

/** هل يُسمح بإيداع هذا الملف؟ تعليمات فقط، أو قالب معلن بالاسم في القفل — ولا ملف يحمّله Claude Code آليًّا (CLAUDE.md · settings*.json · .mcp.json). */
export function isAllowed(rel, spec, allow) {
  const p = toPosix(rel);
  if (p.split("/").some((seg) => seg === "" || seg === "." || seg === "..")) return false;
  if ((allow.deniedBasenames ?? []).includes(posix.basename(p))) return false;
  if ((allow.basenames ?? []).includes(posix.basename(p))) return true;
  if ((allow.extensions ?? []).includes(posix.extname(p).toLowerCase())) return true;
  for (const t of spec.templates ?? []) {
    if (t.endsWith("/") ? p.startsWith(t) : p === t) return true;
  }
  return false;
}

/** مستبعَد بقرار (قائمة `exclude` في القفل): مجلد بشرطة مائلة في آخره أو ملف بعينه — يُسجَّل في `excluded` بسببه. */
export function isExcluded(rel, spec) {
  const p = toPosix(rel);
  return (spec.exclude ?? []).some((x) => (x.endsWith("/") ? p.startsWith(x) : p === x));
}

/** UTF-8 صالح بلا NUL — الثنائيات وملفات UTF-16 لا تُودَع ولو حملت امتدادًا مسموحًا. */
export function isTextBuffer(buf) {
  if (buf.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st = lstatSync(full);
    if (st.isSymbolicLink())
      throw new VideoSkillsError(`رابط رمزي مرفوض: ${toPosix(relative(base, full))}`);
    if (st.isDirectory()) {
      if (name === ".git") continue;
      walk(full, base, out);
    } else if (st.isFile()) out.push(toPosix(relative(base, full)));
  }
  return out;
}

/** خطّة الإيداع لسكيل: الملفات المسموحة (ببصمتها) والمستبعَدة. */
export function planSkill(cloneDir, spec, allow) {
  const included = {};
  const excluded = [];
  let total = 0;
  for (const inc of spec.include) {
    const full = join(cloneDir, inc);
    if (!existsSync(full))
      throw new VideoSkillsError(`${spec.id}: المسار غير موجود في الاستنساخ: ${inc}`);
    const st = lstatSync(full);
    if (st.isSymbolicLink()) throw new VideoSkillsError(`${spec.id}: رابط رمزي مرفوض: ${inc}`);
    const files = st.isDirectory() ? walk(full, cloneDir) : [toPosix(inc)];
    for (const rel of files) {
      if (isExcluded(rel, spec)) {
        excluded.push(`${rel} (مستبعَد بقرار: ${spec.excludeWhy ?? "انظر الغلاف"})`);
        continue;
      }
      if (!isAllowed(rel, spec, allow)) {
        excluded.push(rel);
        continue;
      }
      const buf = readFileSync(join(cloneDir, rel));
      if (buf.length > allow.maxFileBytes) {
        excluded.push(`${rel} (>${allow.maxFileBytes} بايت)`);
        continue;
      }
      if (!isTextBuffer(buf)) {
        excluded.push(`${rel} (ليس نصًّا UTF-8)`);
        continue;
      }
      included[rel] = sha256(buf);
      total += buf.length;
    }
  }
  if (!(spec.entry in included))
    throw new VideoSkillsError(`${spec.id}: ملف المدخل غير مودَع: ${spec.entry}`);
  if (!("LICENSE" in included)) throw new VideoSkillsError(`${spec.id}: LICENSE غير مودَع`);
  if (total > allow.maxSkillBytes)
    throw new VideoSkillsError(`${spec.id}: الحجم ${total} يتجاوز السقف ${allow.maxSkillBytes}`);
  return { included: sortObject(included), excluded: excluded.sort(), bytes: total };
}

function sortObject(o) {
  return Object.fromEntries(
    Object.keys(o)
      .sort()
      .map((k) => [k, o[k]]),
  );
}

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new VideoSkillsError(`git ${args.join(" ")} فشل: ${r.stderr}`);
  return r.stdout.trim();
}

/** التحقق أن الاستنساخ عند الـcommit المسمَّر ونظيف. */
export function assertCloneAtCommit(cloneDir, spec) {
  if (!existsSync(join(cloneDir, ".git")))
    throw new VideoSkillsError(`${spec.id}: ليس استنساخ git: ${cloneDir}`);
  const head = git(["rev-parse", "HEAD"], cloneDir);
  if (head !== spec.commit)
    throw new VideoSkillsError(`${spec.id}: HEAD ${head} ≠ القفل ${spec.commit}`);
  const dirty = git(["status", "--porcelain"], cloneDir);
  if (dirty) throw new VideoSkillsError(`${spec.id}: الاستنساخ معدَّل:\n${dirty}`);
}

/** فحص المودَع فعلًا مقابل القفل: مجموعة الملفات وبصماتها والرخصة والمدخل. */
export function verifySkill(spec, lock, root = ROOT) {
  const problems = [];
  const dir = vendorDir(spec, root);
  if (!existsSync(dir))
    return {
      ok: false,
      problems: [`${spec.id}: مجلد الإيداع مفقود ${toPosix(relative(root, dir))}`],
    };
  let actual;
  try {
    actual = walk(dir);
  } catch (e) {
    return { ok: false, problems: [`${spec.id}: ${e.message}`] };
  }
  const expected = Object.keys(spec.files);
  for (const rel of actual) {
    if (!(rel in spec.files)) problems.push(`${spec.id}: ملف غير مذكور في القفل: ${rel}`);
    else if (!isAllowed(rel, spec, lock.allow))
      problems.push(`${spec.id}: ملف خارج قائمة السماح: ${rel}`);
    else if (isExcluded(rel, spec))
      problems.push(`${spec.id}: ملف مستبعَد بقرار لكنه مودَع: ${rel}`);
  }
  for (const rel of expected) {
    const full = join(dir, rel);
    if (!existsSync(full)) {
      problems.push(`${spec.id}: ملف مفقود: ${rel}`);
      continue;
    }
    const buf = readFileSync(full);
    if (!isTextBuffer(buf)) problems.push(`${spec.id}: ليس نصًّا: ${rel}`);
    if (sha256(buf) !== spec.files[rel]) problems.push(`${spec.id}: بصمة مختلفة: ${rel}`);
  }
  if (!expected.includes(spec.entry))
    problems.push(`${spec.id}: المدخل ${spec.entry} ليس في القفل`);
  if (expected.includes("LICENSE")) {
    const lic = existsSync(join(dir, "LICENSE")) ? readFileSync(join(dir, "LICENSE"), "utf8") : "";
    if (!/MIT License/.test(lic)) problems.push(`${spec.id}: LICENSE ليست MIT كما يعلن القفل`);
    if (spec.copyright && !lic.includes(spec.copyright))
      problems.push(`${spec.id}: سطر الحقوق «${spec.copyright}» غير موجود في LICENSE`);
  } else problems.push(`${spec.id}: LICENSE غير مودَعة`);
  if (!/^[0-9a-f]{40}$/.test(spec.commit)) problems.push(`${spec.id}: commit ليس SHA-1`);
  return { ok: problems.length === 0, problems };
}

export function verifyAll(lock = readLock(), root = ROOT) {
  const problems = [];
  const ids = new Set();
  const wrappers = new Set();
  for (const spec of lock.skills) {
    if (ids.has(spec.id)) problems.push(`معرّف مكرّر: ${spec.id}`);
    if (wrappers.has(spec.wrapper)) problems.push(`غلاف مكرّر: ${spec.wrapper}`);
    ids.add(spec.id);
    wrappers.add(spec.wrapper);
    problems.push(...verifySkill(spec, lock, root).problems);
    const wrapper = join(root, ".claude", "skills", spec.wrapper, "SKILL.md");
    if (!existsSync(wrapper))
      problems.push(`${spec.id}: مهارة الغلاف مفقودة ${toPosix(relative(root, wrapper))}`);
    else {
      const text = readFileSync(wrapper, "utf8");
      if (!text.includes(`vendor/${spec.entry}`))
        problems.push(`${spec.id}: الغلاف لا يشير إلى المدخل vendor/${spec.entry}`);
      if (!new RegExp(`^name:\\s*${spec.wrapper}\\s*$`, "m").test(text))
        problems.push(`${spec.id}: اسم الغلاف في الترويسة ≠ ${spec.wrapper}`);
    }
  }
  const router = join(root, ".claude", "skills", ROUTER_SKILL, "SKILL.md");
  if (!existsSync(router)) problems.push(`المهارة الموجِّهة مفقودة: ${ROUTER_SKILL}`);
  else {
    const text = readFileSync(router, "utf8");
    for (const spec of lock.skills)
      if (!text.includes(spec.wrapper)) problems.push(`الموجِّه لا يذكر ${spec.wrapper}`);
  }
  const settingsPath = join(root, ".claude", "settings.json");
  const settings = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, "utf8")) : {};
  const hooks = settings.hooks?.UserPromptSubmit ?? [];
  const hasHook = hooks.some((g) =>
    (g.hooks ?? []).some(
      (h) => h.type === "command" && String(h.command).includes("video-prompt-router.mjs"),
    ),
  );
  if (!hasHook) problems.push("خطّاف UserPromptSubmit للموجِّه غير مضبوط في .claude/settings.json");
  if (!existsSync(join(root, HOOK_SCRIPT))) problems.push(`سكربت الخطّاف مفقود: ${HOOK_SCRIPT}`);
  return { ok: problems.length === 0, problems };
}

function copyTree(srcDir, files, dstDir) {
  rmSync(dstDir, { recursive: true, force: true });
  for (const rel of files) {
    const dst = join(dstDir, rel);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(join(srcDir, rel), dst);
  }
}

function cmdSync(args) {
  const from = flag(args, "--from");
  if (!from) throw new VideoSkillsError("sync يحتاج --from <مجلد الاستنساخات>");
  const lock = readLock();
  for (const spec of lock.skills) {
    const cloneDir = join(resolve(from), spec.repo.split("/").pop());
    assertCloneAtCommit(cloneDir, spec);
    const plan = planSkill(cloneDir, spec, lock.allow);
    copyTree(cloneDir, Object.keys(plan.included), vendorDir(spec));
    spec.files = plan.included;
    spec.excluded = plan.excluded;
    console.log(
      `✓ ${spec.id}: ${Object.keys(plan.included).length} ملفًا (${plan.bytes} بايت)، مستبعَد ${plan.excluded.length}`,
    );
  }
  writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + "\n");
  console.log(`كُتب القفل ${toPosix(relative(ROOT, LOCK_PATH))}`);
}

function cmdVerify() {
  const v = verifyAll();
  for (const p of v.problems) console.error(`✗ ${p}`);
  if (v.ok) console.log(`✓ سكيلز الفيديو: الإيداع مطابق للقفل (${readLock().skills.length} سكيلز)`);
  process.exit(v.ok ? 0 : 1);
}

function which(cmd) {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], {
    encoding: "utf8",
  });
  return r.status === 0 ? r.stdout.trim().split(/\r?\n/)[0] : null;
}

function cmdDoctor() {
  const lock = readLock();
  const v = verifyAll(lock);
  console.log(`الإيداع: ${v.ok ? "✓ مطابق للقفل" : "✗ " + v.problems.length + " مشكلة"}`);
  for (const p of v.problems) console.log(`  ✗ ${p}`);
  for (const spec of lock.skills) {
    const tk = join(ROOT, lock.toolkitsRoot, spec.id);
    const fetched = existsSync(join(tk, ".git"));
    let at = "";
    if (fetched) {
      const r = spawnSync("git", ["-C", tk, "rev-parse", "HEAD"], { encoding: "utf8" });
      at =
        r.status === 0 && r.stdout.trim() === spec.commit
          ? " عند الـcommit المسمَّر"
          : " ⚠ عند commit مختلف";
    }
    console.log(
      `  ${String(spec.order).padStart(2, "0")} ${spec.wrapper.padEnd(32)} ${spec.repo}@${spec.commit.slice(0, 7)}  الحزمة الكاملة: ${fetched ? "مجلوبة" + at : "غير مجلوبة (تعليمات فقط)"}`,
    );
  }
  for (const t of ["node", "ffmpeg", "ffprobe", "python3", "npx"])
    console.log(`  ${t}: ${which(t) ?? "غير موجود"}`);
  process.exit(v.ok ? 0 : 1);
}

function cmdFetch(args) {
  const lock = readLock();
  const target = args[0];
  if (!target) throw new VideoSkillsError("fetch يحتاج <id|all>");
  const dirFlag = flag(args, "--dir");
  const base = dirFlag ? resolve(dirFlag) : join(ROOT, lock.toolkitsRoot);
  const insideRepo = !relative(ROOT, base).startsWith("..");
  if (insideRepo && !toPosix(relative(ROOT, base)).startsWith(lock.toolkitsRoot)) {
    throw new VideoSkillsError(`لا يُجلب داخل المستودع إلا تحت ${lock.toolkitsRoot} (خارج git)`);
  }
  const specs = lock.skills.filter((s) => target === "all" || s.id === target);
  if (specs.length === 0) throw new VideoSkillsError(`لا سكيل بالمعرّف ${target}`);
  for (const spec of specs) {
    const dst = join(base, spec.id);
    const url = `https://github.com/${spec.repo.replace(/^github:/, "")}.git`;
    if (existsSync(dst)) {
      const head = spawnSync("git", ["-C", dst, "rev-parse", "HEAD"], { encoding: "utf8" });
      if (head.status === 0 && head.stdout.trim() === spec.commit) {
        console.log(`= ${spec.id}: موجود عند الـcommit المسمَّر`);
        continue;
      }
      throw new VideoSkillsError(
        `${spec.id}: المجلد ${dst} موجود عند commit مختلف — احذفه يدويًّا أولًا`,
      );
    }
    mkdirSync(base, { recursive: true });
    git(["clone", "--quiet", "--no-checkout", "--filter=blob:none", url, dst], ROOT);
    git(["-c", "advice.detachedHead=false", "checkout", "--quiet", spec.commit], dst);
    const head = git(["rev-parse", "HEAD"], dst);
    if (head !== spec.commit) {
      rmSync(dst, { recursive: true, force: true });
      throw new VideoSkillsError(`${spec.id}: بعد الجلب HEAD ${head} ≠ ${spec.commit}`);
    }
    console.log(
      `✓ ${spec.id}: جُلب إلى ${toPosix(relative(ROOT, dst)) || dst} عند ${spec.commit.slice(0, 7)} — سكربتاته شيفرة طرف ثالث: اقرأها قبل تشغيلها`,
    );
  }
}

function cmdInstallUser(args) {
  const lock = readLock();
  const v = verifyAll(lock);
  if (!v.ok)
    throw new VideoSkillsError(
      "الإيداع لا يطابق القفل — أصلحه قبل التثبيت:\n" + v.problems.join("\n"),
    );
  const dest = resolve(flag(args, "--dest") ?? join(homedir(), ".claude", "skills"));
  mkdirSync(dest, { recursive: true });
  const names = [ROUTER_SKILL, ...lock.skills.map((s) => s.wrapper)];
  for (const name of names) {
    const src = join(SKILLS_DIR, name);
    const files = walk(src);
    copyTree(src, files, join(dest, name));
    console.log(`✓ ${name} → ${join(dest, name)}`);
  }
  const hookDst = join(dest, ROUTER_SKILL, "hook", basename(HOOK_SCRIPT));
  mkdirSync(dirname(hookDst), { recursive: true });
  copyFileSync(join(ROOT, HOOK_SCRIPT), hookDst);
  console.log(`✓ سكربت الخطّاف → ${hookDst}`);
  if (args.includes("--with-hook")) {
    const settingsPath = join(dirname(dest), "settings.json");
    const settings = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, "utf8")) : {};
    const groups = ((settings.hooks ??= {}).UserPromptSubmit ??= []);
    const already = groups.some((g) =>
      (g.hooks ?? []).some((h) => String(h.command).includes("video-prompt-router.mjs")),
    );
    if (!already) {
      if (existsSync(settingsPath)) copyFileSync(settingsPath, `${settingsPath}.bak-${Date.now()}`);
      groups.push({ hooks: [{ type: "command", command: `node "${hookDst}"`, timeout: 10 }] });
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
      console.log(`✓ أُضيف خطّاف UserPromptSubmit إلى ${settingsPath} (نسخة احتياطية بجانبه)`);
    } else console.log(`= الخطّاف موجود أصلًا في ${settingsPath}`);
  } else {
    console.log(
      `لتفعيل التوجيه الآلي في كل المشاريع أضف إلى ~/.claude/settings.json:\n  "hooks": {"UserPromptSubmit": [{"hooks": [{"type": "command", "command": "node \\"${hookDst}\\"", "timeout": 10}]}]}\n  (أو أعد الأمر مع --with-hook ليُضاف لك)`,
    );
  }
}

function flag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  try {
    switch (cmd) {
      case "verify":
        return cmdVerify();
      case "doctor":
        return cmdDoctor();
      case "sync":
        return cmdSync(rest);
      case "fetch":
        return cmdFetch(rest);
      case "install-user":
        return cmdInstallUser(rest);
      default:
        console.error(
          "الأوامر: verify · doctor · sync --from <dir> · fetch <id|all> [--dir <dir>] · install-user [--dest <dir>] [--with-hook]",
        );
        process.exit(2);
    }
  } catch (e) {
    console.error(`✗ ${e instanceof VideoSkillsError ? e.message : (e?.stack ?? e)}`);
    process.exit(e instanceof VideoSkillsError ? 1 : 3);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
