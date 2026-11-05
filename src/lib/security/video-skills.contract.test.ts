/**
 * حارس سكيلز إنتاج الفيديو الثمانية (أمر المالك ٢٠٢٦/١١/٠٥) — المادة ٣٠: انتهاكات مزروعة لكل ضابط.
 *
 * يحرس: القفل (commit واحد لكل مستودع، MIT، غلاف فريد)، مطابقة البصمات للمودَع فعلًا، قائمة السماح
 * (تعليمات فقط، لا سكربتات)، الرخص والنسب، مهارات الغلاف والموجِّه، قاعدة CLAUDE.md، خطّاف
 * UserPromptSubmit وسكربته (يُطلَق على الفيديو لا على «موشن/animation/script» وحدها، لا يحجب، خروج 0)،
 * وخلوّ المودَع من أي سرّ بأنماط check-secrets.
 */
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// سكربتات .mjs بلا تصريح أنواع، كحارس الأسرار وبوابة التفويض: نستورد دوالّها ونختبرها هنا.
// @ts-expect-error — plain .mjs module without a type declaration.
import { SECRET_CONTENT } from "../../../scripts/check-secrets.mjs";
// @ts-expect-error — plain .mjs module without a type declaration.
import * as R from "../../../scripts/toolchain/video-prompt-router.mjs";
// @ts-expect-error — plain .mjs module without a type declaration.
import * as V from "../../../scripts/toolchain/video-skills.mjs";

const ROOT = V.ROOT;
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const lock = V.readLock();
type Spec = (typeof lock.skills)[number];

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

describe("القفل video-skills.lock.json", () => {
  it("ثماني سكيلز بترتيب الفيديو، قسمان، commit واحد وMIT وغلاف فريد لكلٍّ", () => {
    expect(lock.skills).toHaveLength(8);
    expect(lock.skills.map((s: Spec) => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(lock.skills.filter((s: Spec) => s.section === "ideas")).toHaveLength(4);
    expect(lock.skills.filter((s: Spec) => s.section === "motion")).toHaveLength(4);
    const wrappers = new Set<string>();
    for (const s of lock.skills as Spec[]) {
      expect(s.commit, s.id).toMatch(/^[0-9a-f]{40}$/);
      expect(s.repo, s.id).toMatch(/^github:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
      expect(s.license, s.id).toBe("MIT");
      expect(s.copyright, s.id).toMatch(/^Copyright \(c\) 20\d\d /);
      expect(s.wrapper, s.id).toMatch(/^video-[a-z-]+$/);
      expect(wrappers.has(s.wrapper), `غلاف مكرّر ${s.wrapper}`).toBe(false);
      wrappers.add(s.wrapper);
      expect(Object.keys(s.files).length, s.id).toBeGreaterThan(0);
      expect(s.files[s.entry], `${s.id}: المدخل في القفل`).toMatch(/^[0-9a-f]{64}$/);
      expect(s.files.LICENSE, `${s.id}: LICENSE في القفل`).toMatch(/^[0-9a-f]{64}$/);
      expect(s.videoCaption, s.id).toMatch(/[\u0600-\u06FF]/);
    }
  });

  it("الصدق (المادة ٢٧): القفل يعلن أن الصوت لم يُفرَّغ وأن الأسماء من النصّ على الشاشة", () => {
    expect(lock.source.extraction).toMatch(/الصوت لم يُفرَّغ/);
    expect(lock.source.extraction).toMatch(/الشاشة/);
  });

  it("المستبعَد كله شيفرة أو ثنائي: لا ملف تعليمات في قائمة الاستبعاد", () => {
    for (const s of lock.skills as Spec[]) {
      for (const ex of s.excluded as string[]) {
        expect(ex, `${s.id}: ${ex}`).toMatch(
          /\.(py|js|html|ts|tsx|sh)$|\(>|ليس نصًّا|مستبعَد بقرار/,
        );
      }
    }
  });
});

describe("المودَع فعلًا = القفل", () => {
  it("verifyAll على المستودع الحقيقي يمرّ", () => {
    const v = V.verifyAll(lock, ROOT);
    expect(v.problems, v.problems.join("\n")).toEqual([]);
    expect(v.ok).toBe(true);
  });

  it("كل ملف مودَع نصّ UTF-8 بلا NUL وبامتداد مسموح، ولا شيفرة إلا القوالب المعلنة", () => {
    for (const s of lock.skills as Spec[]) {
      const dir = V.vendorDir(s, ROOT);
      for (const full of walkFiles(dir)) {
        const rel = full
          .slice(dir.length + 1)
          .split("\\")
          .join("/");
        expect(V.isAllowed(rel, s, lock.allow), `${s.id}: ${rel}`).toBe(true);
        expect(V.isTextBuffer(readFileSync(full)), `${s.id}: ${rel}`).toBe(true);
        if (/\.(ts|tsx|js|py|sh)$/.test(rel)) {
          const declared = (s.templates as string[]).some((t) =>
            t.endsWith("/") ? rel.startsWith(t) : rel === t,
          );
          expect(declared, `${s.id}: شيفرة غير معلنة قالبًا: ${rel}`).toBe(true);
        }
      }
    }
  });

  it("قائمة السماح ترفض السكربتات والمسارات الخبيثة (انتهاكات مزروعة)", () => {
    const spec = { templates: ["assets/theme.ts", "remotion/"] };
    const allow = lock.allow;
    for (const ok of [
      "SKILL.md",
      "a/b/README.md",
      "hooks.json",
      "LICENSE",
      "notes.txt",
      "assets/theme.ts",
      "remotion/src/x.tsx",
    ]) {
      expect(V.isAllowed(ok, spec, allow), ok).toBe(true);
    }
    for (const bad of [
      "hookscore.py",
      "scripts/a.sh",
      "x.js",
      "x.html",
      "other/theme.ts",
      "assets/theme.ts.bak",
      "../LICENSE",
      "a/../b.md",
      "./x.md",
      "demo.mp4",
      "demo.gif",
      "key.pem",
      ".env",
      "",
    ]) {
      expect(V.isAllowed(bad, spec, allow), bad).toBe(false);
    }
    expect(
      V.isAllowed("assets/theme.ts", { templates: [] }, allow),
      "قالب غير معلن لسكيل آخر",
    ).toBe(false);
  });

  it("الاستبعاد بقرار: مسجَّل بسببه في القفل، ولا ملف منه مودَع، وisExcluded يميّز المجلد عن الملف", () => {
    const spec = { exclude: ["skills/writing/voice-pirate-wires/", "a/b.md"] };
    expect(V.isExcluded("skills/writing/voice-pirate-wires/SKILL.md", spec)).toBe(true);
    expect(
      V.isExcluded("skills/writing/voice-pirate-wires-2/SKILL.md", spec),
      "مجلد شقيق بالبادئة نفسها لا يُستبعد",
    ).toBe(false);
    expect(V.isExcluded("a/b.md", spec)).toBe(true);
    expect(V.isExcluded("a/b.md.bak", spec)).toBe(false);
    expect(V.isExcluded("skills/writing/other/SKILL.md", spec)).toBe(false);
    expect(V.isExcluded("x.md", {})).toBe(false);
    const withDecisions = (lock.skills as Spec[]).filter((s) => (s.exclude as string[]).length > 0);
    expect(withDecisions.map((s) => s.id).sort()).toEqual(["content-os", "video-agent"]);
    for (const s of withDecisions) {
      expect(s.excludeWhy, s.id).toMatch(/[\u0600-\u06FF]/);
      for (const x of s.exclude as string[]) {
        expect(
          (s.excluded as string[]).some((e) => e.startsWith(x) && e.includes("مستبعَد بقرار")),
          `${s.id}: ${x} مسجَّل`,
        ).toBe(true);
        for (const rel of Object.keys(s.files))
          expect(V.isExcluded(rel, s), `${s.id}: ${rel} مودَع رغم الاستبعاد`).toBe(false);
      }
      expect(read(`.claude/skills/${s.wrapper}/SKILL.md`)).toContain("مستبعَد بقرار");
    }
  });

  it("لا CLAUDE.md ولا settings*.json ولا .mcp.json تحت أي vendor/ (ذاكرة/إعداد يُحمَّل آليًّا) — نقض الحارس ٢٠٢٦/١١/٠٥", () => {
    const denied = new Set(lock.allow.deniedBasenames as string[]);
    expect([...denied].sort()).toEqual([
      ".mcp.json",
      "CLAUDE.md",
      "settings.json",
      "settings.local.json",
    ]);
    const spec = { templates: ["remotion/"] };
    for (const auto of [
      "CLAUDE.md",
      "a/b/CLAUDE.md",
      ".claude/settings.json",
      "settings.local.json",
      ".mcp.json",
      "remotion/CLAUDE.md",
    ]) {
      expect(V.isAllowed(auto, spec, lock.allow), `مرفوض ولو حمل امتدادًا مسموحًا: ${auto}`).toBe(
        false,
      );
    }
    expect(
      V.isAllowed("AGENTS.md", spec, lock.allow),
      "AGENTS.md لا يحمّله Claude Code آليًّا",
    ).toBe(true);
    for (const s of lock.skills as Spec[]) {
      const dir = V.vendorDir(s, ROOT);
      for (const full of walkFiles(dir)) {
        const base = full.split(/[\\/]/).pop()!;
        expect(denied.has(base), `${s.id}: ${full.slice(dir.length + 1)}`).toBe(false);
      }
      for (const rel of Object.keys(s.files))
        expect(denied.has(rel.split("/").pop()!), `${s.id}: ${rel} في القفل`).toBe(false);
    }
    const agent = (lock.skills as Spec[]).find((s) => s.id === "video-agent")!;
    expect(agent.exclude).toContain("CLAUDE.md");
    expect((agent.excluded as string[]).some((e) => e.startsWith("CLAUDE.md (مستبعَد بقرار"))).toBe(
      true,
    );
    expect(read(".claude/skills/video-remotion-overlay/SKILL.md")).not.toMatch(
      /vendor\/CLAUDE\.md/,
    );
  });

  it("isTextBuffer: UTF-16 وNUL وثنائي مرفوض", () => {
    expect(V.isTextBuffer(Buffer.from("# ok\n"))).toBe(true);
    expect(V.isTextBuffer(Buffer.from("\xff\xfe# \0b\0a\0d\0", "latin1"))).toBe(false);
    expect(V.isTextBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(V.isTextBuffer(Buffer.from([0xc3, 0x28]))).toBe(false);
  });

  it("verifySkill يحمرّ على كل عبث (انتهاكات مزروعة على نسخة مؤقتة)", () => {
    const spec = (lock.skills as Spec[]).find((s) => s.id === "youtube-script-writer")!;
    const makeRoot = () => {
      const root = mkdtempSync(join(tmpdir(), "sadeed-vskills-"));
      cpSync(V.vendorDir(spec, ROOT), V.vendorDir(spec, root), { recursive: true });
      return root;
    };
    const cases: Array<[string, (root: string) => void, RegExp]> = [
      [
        "تعديل بايت في المدخل",
        (r) => appendFileSync(join(V.vendorDir(spec, r), spec.entry), "\n"),
        /بصمة مختلفة/,
      ],
      [
        "ملف زائد غير مذكور",
        (r) => writeFileSync(join(V.vendorDir(spec, r), "LICENSE.extra.md"), "x"),
        /غير مذكور في القفل/,
      ],
      ["ملف مفقود", (r) => unlinkSync(join(V.vendorDir(spec, r), spec.entry)), /ملف مفقود/],
      [
        "سكربت مدسوس",
        (r) => writeFileSync(join(V.vendorDir(spec, r), "evil.py"), "import os"),
        /غير مذكور في القفل/,
      ],
      [
        "LICENSE ليست MIT",
        (r) => writeFileSync(join(V.vendorDir(spec, r), "LICENSE"), "Proprietary"),
        /ليست MIT|بصمة مختلفة/,
      ],
      [
        "حذف المجلد كله",
        (r) => rmSync(V.vendorDir(spec, r), { recursive: true }),
        /مجلد الإيداع مفقود/,
      ],
    ];
    for (const [why, mutate, re] of cases) {
      const root = makeRoot();
      try {
        expect(V.verifySkill(spec, lock, root).ok, "النسخة السليمة تمرّ").toBe(true);
        mutate(root);
        const v = V.verifySkill(spec, lock, root);
        expect(v.ok, why).toBe(false);
        expect(v.problems.join("\n"), why).toMatch(re);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it.skipIf(process.platform === "win32")("رابط رمزي داخل المودَع مرفوض", () => {
    const spec = (lock.skills as Spec[]).find((s) => s.id === "youtube-script-writer")!;
    const root = mkdtempSync(join(tmpdir(), "sadeed-vskills-"));
    try {
      cpSync(V.vendorDir(spec, ROOT), V.vendorDir(spec, root), { recursive: true });
      symlinkSync("/etc/hostname", join(V.vendorDir(spec, root), "link.md"));
      const v = V.verifySkill(spec, lock, root);
      expect(v.ok).toBe(false);
      expect(v.problems.join("\n")).toMatch(/رابط رمزي/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("لا سرّ بأنماط check-secrets في أي ملف مودَع", () => {
    for (const s of lock.skills as Spec[]) {
      const dir = V.vendorDir(s, ROOT);
      for (const full of walkFiles(dir)) {
        const text = readFileSync(full, "utf8");
        for (const { re, label } of SECRET_CONTENT as Array<{ re: RegExp; label: string }>) {
          expect(re.test(text), `${s.id}: ${label} في ${full.slice(dir.length + 1)}`).toBe(false);
        }
      }
    }
  });
});

describe("مهارات الغلاف والموجِّه", () => {
  it("كل غلاف: اسم الترويسة = القفل، وصف عربي يذكر الأصل والـMIT، يشير إلى المدخل ويعلن الموجِّه وما لم يُودَع", () => {
    for (const s of lock.skills as Spec[]) {
      const text = read(`.claude/skills/${s.wrapper}/SKILL.md`);
      expect(text).toMatch(new RegExp(`^name: ${s.wrapper}$`, "m"));
      expect(text).toMatch(/^description: .*[\u0600-\u06FF]/m);
      expect(text).toContain(s.repo.replace(/^github:/, ""));
      expect(text).toContain("MIT");
      expect(text).toContain(s.commit);
      expect(text).toContain(`vendor/${s.entry}`);
      expect(text).toContain("sadeed-video-production");
      expect(text).toMatch(/ما لم يُودَع|المودَع منه هذا السكيل وحده/);
      expect(text).toMatch(/ما يتغيّر في سَدِيد/);
      expect(text, `${s.wrapper}: قسم المراجعة الأمنية`).toContain("## تنبيهات المراجعة الأمنية");
    }
  });

  it("الموجِّه يذكر الثمانية كلها بترتيبها وقواعد سَدِيد والحدود المعلنة", () => {
    const text = read(".claude/skills/sadeed-video-production/SKILL.md");
    for (const s of lock.skills as Spec[]) {
      expect(text).toContain(s.wrapper);
      expect(text).toContain(s.repo.replace(/^github:/, ""));
    }
    expect(text).toMatch(/^name: sadeed-video-production$/m);
    expect(text).toMatch(/المادة ٢٧/);
    expect(text).toMatch(/صوت سَدِيد/);
    expect(text).toMatch(/الصوت لم يُفرَّغ/);
    expect(text).toMatch(/لم يُشغَّل/);
    expect(text).toMatch(/install-user/);
  });

  it("لا تكرار في أسماء المهارات العليا (.claude/skills/*/SKILL.md)", () => {
    const names = new Map<string, string>();
    for (const dir of readdirSync(join(ROOT, ".claude", "skills"))) {
      const p = join(ROOT, ".claude", "skills", dir, "SKILL.md");
      if (!existsSync(p)) continue;
      const m = /^name:\s*(\S+)/m.exec(readFileSync(p, "utf8"));
      if (!m) continue;
      expect(names.has(m[1]), `اسم مكرّر ${m[1]} في ${dir} و${names.get(m[1])}`).toBe(false);
      names.set(m[1], dir);
    }
    expect(names.get("sadeed-video-production")).toBe("sadeed-video-production");
  });
});

describe("التفعيل الدائم: CLAUDE.md والإعدادات والتجاهل", () => {
  it("CLAUDE.md يحمل القاعدة الملزِمة ويذكر الموجِّه والخطّاف والثمانية", () => {
    const text = read("CLAUDE.md");
    expect(text).toContain("## إنتاج الفيديو — السكيلز الثمانية");
    expect(text).toContain("sadeed-video-production");
    expect(text).toContain("video-prompt-router.mjs");
    for (const s of lock.skills as Spec[]) expect(text).toContain(s.wrapper);
    expect(text).toMatch(/الصوت لم\s+يُفرَّغ/);
  });

  it("settings.json: خطّاف UserPromptSubmit على سكربت الموجِّه بمهلة قصيرة، وسماح لأمرَي verify/doctor", () => {
    const settings = JSON.parse(read(".claude/settings.json"));
    const groups = settings.hooks?.UserPromptSubmit ?? [];
    const hook = groups
      .flatMap(
        (g: { hooks?: Array<{ type: string; command: string; timeout?: number }> }) =>
          g.hooks ?? [],
      )
      .find((h: { command: string }) => h.command.includes("video-prompt-router.mjs"));
    expect(hook).toBeDefined();
    expect(hook.type).toBe("command");
    expect(hook.timeout).toBeLessThanOrEqual(30);
    expect(settings.permissions.allow).toContain(
      "Bash(node scripts/toolchain/video-skills.mjs verify)",
    );
  });

  it("المودَع خارج prettier، وأدوات الطرف الثالث خارج git", () => {
    expect(read(".prettierignore")).toContain(".claude/skills/video-*/vendor/");
    expect(read(".gitignore")).toMatch(/^\.sadeed\/$/m);
    expect(lock.toolkitsRoot.startsWith(".sadeed/")).toBe(true);
  });

  it("الوثائق: SADEED_TOOLCHAIN.md §6 وفهرس sadeed-toolchain يذكران الثمانية", () => {
    const doc = read("docs/tooling/SADEED_TOOLCHAIN.md");
    expect(doc).toContain("## 6. إنتاج الفيديو");
    for (const s of lock.skills as Spec[]) expect(doc).toContain(s.wrapper);
    expect(read(".claude/skills/sadeed-toolchain/SKILL.md")).toContain("sadeed-video-production");
  });
});

describe("خطّاف الموجِّه video-prompt-router.mjs", () => {
  const positives = [
    "اعمل لي فيديو ترويجي لسديد",
    "ابي فديو قصير عن الصيانة",
    "جهّز ريلز للإنستغرام عن البلاغات",
    "اكتب سكريبت فيديو عن الهيئة",
    "اكتب سيناريو الحلقة الأولى",
    "موشن جرافيك لشرح التصاريح",
    "مونتاج اللقطات المرفقة",
    "حلقة يوتيوب عن سديد",
    "تعليق صوتي للفيلم",
    "أضف كابشن متزامن على المقطع المرئي",
    "write a youtube script about permits",
    "make a 15s motion graphics promo",
    "cut a reel from this footage",
    "render the remotion composition",
    "add a lower third over the b-roll",
    "storyboard for the launch film",
    "I need a voice-over for the explainer",
    "generate thumbnails for the video",
  ];
  const negatives = [
    "أضف موشن للبطاقات في الرئيسية",
    "حدّث السكريبت في scripts/x.mjs",
    "اكتب hook في React لجلب البيانات",
    "fix the css animation on hover",
    "write a shell script to deploy",
    "the useEffect hook re-renders twice",
    "update the motion tokens in home-motion.css",
    "أصلح خطأ tsc في الصفحة",
    "اشرح لي جدول maint_orders",
    "run the tests and push",
    "",
  ];

  it("يُطلَق على طلبات الفيديو (عربية وإنجليزية) ولا يُطلَق على عمل الواجهة والكود", () => {
    for (const p of positives) expect(R.matchesVideoRequest(p), `يجب أن يُطلَق: ${p}`).toBe(true);
    for (const n of negatives) expect(R.matchesVideoRequest(n), `يجب ألا يُطلَق: ${n}`).toBe(false);
    expect(R.matchesVideoRequest(undefined as unknown as string)).toBe(false);
  });

  it("المخرج JSON بسياق إضافي يذكر الموجِّه والثمانية، ولا شيء عند عدم التطابق", () => {
    const out = R.buildHookOutput("اعمل فيديو");
    expect(out?.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    const ctx = out!.hookSpecificOutput.additionalContext;
    expect(ctx).toContain("sadeed-video-production");
    for (const s of lock.skills as Spec[]) expect(ctx).toContain(s.wrapper);
    expect(ctx).toMatch(/<video>/);
    expect(ctx.length).toBeLessThan(1200);
    expect(R.buildHookOutput("fix tsc")).toBeNull();
    expect(Object.keys(out!)).toEqual(["hookSpecificOutput"]);
    expect("decision" in out!, "لا يحجب الطلب أبدًا").toBe(false);
  });

  it("كعملية: يقرأ stdin ويخرج 0 دائمًا — JSON على الفيديو، لا شيء على غيره، وصامت على مدخل تالف", () => {
    const run = (input: string) =>
      spawnSync(process.execPath, [join(ROOT, V.HOOK_SCRIPT)], {
        input,
        encoding: "utf8",
        timeout: 10_000,
      });
    const hit = run(
      JSON.stringify({ prompt: "اعمل لي فيديو عن سديد", hook_event_name: "UserPromptSubmit" }),
    );
    expect(hit.status).toBe(0);
    expect(JSON.parse(hit.stdout).hookSpecificOutput.additionalContext).toContain(
      "sadeed-video-production",
    );
    const miss = run(JSON.stringify({ prompt: "fix the tsc error" }));
    expect(miss.status).toBe(0);
    expect(miss.stdout).toBe("");
    for (const bad of ["garbage", "", "{}", '{"prompt": 5}', "[1,2]"]) {
      const r = run(bad);
      expect(r.status, bad).toBe(0);
      expect(r.stdout, bad).toBe("");
      expect(r.stderr, bad).toBe("");
    }
  });

  it("يعمل من مجلد عمل مختلف (الأمر في settings يعتمد CLAUDE_PROJECT_DIR أو النقطة)", () => {
    const tmp = mkdtempSync(join(tmpdir(), "sadeed-hook-cwd-"));
    try {
      mkdirSync(join(tmp, "x"));
      const r = spawnSync(process.execPath, [join(ROOT, V.HOOK_SCRIPT)], {
        input: JSON.stringify({ prompt: "video please" }),
        encoding: "utf8",
        cwd: join(tmp, "x"),
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("sadeed-video-production");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
