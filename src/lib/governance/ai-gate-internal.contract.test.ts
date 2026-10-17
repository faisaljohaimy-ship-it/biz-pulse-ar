/**
 * البوّابة الداخلية — حارس العقد (المرحلة ب-٢ من مهمّة الجاهزية، ٢٠٢٦/١٠/١٧).
 *
 * `ai-quota.contract.test.ts` يحرس مسارات HTTP تحت `src/routes/api`. لكن ستّة
 * مواضع تصل Gemini من غير مسار HTTP: دوال خادم (TanStack `createServerFn`)
 * يستدعيها الزائر، ومشغّل الوكلاء، وتحليل البلاغ، والمحرّك التنفيذي، وأداة
 * MCP. لم يكن عليها مفتاح إيقاف ولا سقف يومي. المحروس هنا: كل موضعٍ يستدعي
 * `generateText(` في `src/lib` يسبقه نداء بوّابة، والقائمة تُشتقّ من الشيفرة.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const read = (p: string) => readFileSync(p, "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, "");

/** كل وحدة مكتبة تستدعي نموذجًا — ونوع بوّابتها. */
const INTERNAL_SPENDERS: ReadonlyArray<readonly [string, "quota" | "kill-switch"]> = [
  // زائرٌ يستدعيها: مفتاح الإيقاف والسقفان اليوميان معًا.
  ["src/lib/exec/predictive.functions.ts", "quota"],
  ["src/lib/exec/conversation.functions.ts", "quota"],
  ["src/lib/exec/briefing.functions.ts", "quota"],
  ["src/lib/exec/agent-runtime.server.ts", "quota"],
  ["src/lib/oms-sadeed.server.ts", "quota"],
  ["src/lib/mcp/tools/ask-sadeed.ts", "quota"],
  // خلف مسار HTTP محروس أصلًا: دفاعٌ ثانٍ بمفتاح الإيقاف.
  ["src/lib/sadeed/executive-brain/brain.server.ts", "kill-switch"],
  ["src/lib/sadeed/presence/explanation.server.ts", "kill-switch"],
  ["src/lib/sadeed/tts-diacritize.server.ts", "kill-switch"],
  ["src/lib/sadeed/gemini-transcription.server.ts", "kill-switch"],
  // التضمين نداءٌ مدفوع أيضًا (RAG/المعرفة): مفتاح الإيقاف قبل كل دفعة.
  ["src/lib/sadeed/gemini-embeddings.server.ts", "kill-switch"],
];

const GATE_CALL = /assertAiQuota\(|assertAiEnabled\(|aiDisabledResponse\(/;

describe("① كل وحدة مكتبة تستدعي نموذجًا تمرّ بالبوّابة قبل النداء", () => {
  it.each(INTERNAL_SPENDERS)("%s — بوّابة %s", (path, kind) => {
    const src = strip(read(path));
    const gateAt = src.search(GATE_CALL);
    expect(gateAt, `${path} بلا بوّابة`).toBeGreaterThan(-1);
    if (kind === "quota") {
      expect(src, `${path} بلا سقف يومي`).toMatch(/assertAiQuota\(|enforceAiQuota\(/);
      expect(src).toMatch(/surface:\s*"chat"/);
      expect(src, `${path} بلا مهلة على بوّابة الحصّة`).toMatch(/deadlineMs:\s*2_000/);
    }
    // البوّابة تسبق أوّل نداء مزوّد في الملفّ.
    const callAt = Math.min(
      ...[src.indexOf("generateText("), src.indexOf("await fetch("), src.indexOf("await httpJson")]
        .filter((i) => i > -1)
        .concat([Number.MAX_SAFE_INTEGER]),
    );
    expect(callAt, `${path} بلا نداء مزوّد؟`).toBeLessThan(Number.MAX_SAFE_INTEGER);
    expect(gateAt, `${path} يفحص البوّابة بعد نداء المزوّد`).toBeLessThan(callAt);
  });

  it("ولا وحدة تستدعي النموذج خارج هذه القائمة", () => {
    const found = execSync(
      "grep -rlE 'generateText\\(|generativelanguage\\.googleapis\\.com' src/lib --include=*.ts || true",
      { encoding: "utf8" },
    )
      .split("\n")
      .filter((f) => f && !f.includes(".test."));
    const guarded = new Set(INTERNAL_SPENDERS.map(([p]) => p));
    // `voice-provider.server.ts` سجلّ ثوابت (عناوين النقاط) بلا نداء — يُستثنى
    // بشرطٍ يُقاس: لا `fetch(` ولا `generateText(` فيه.
    const constantsOnly = new Set(["src/lib/sadeed/live-voice/voice-provider.server.ts"]);
    for (const f of found) {
      if (constantsOnly.has(f)) {
        expect(strip(read(f))).not.toMatch(/fetch\(|generateText\(/);
        continue;
      }
      expect(guarded.has(f), `${f} يستدعي نموذجًا ولا بوّابة عليه`).toBe(true);
    }
    expect(found.length, "القائمة المشتقّة فارغة — النمط تقادم").toBeGreaterThanOrEqual(8);
  });
});

describe("② البوّابة ترمي، والمستدعي يسقط إلى بديله لا إلى النموذج", () => {
  it("دوال العرض الثلاث تفحص الحصّة داخل `try` الذي يملك البديل الحتميّ", () => {
    for (const path of [
      "src/lib/exec/predictive.functions.ts",
      "src/lib/exec/conversation.functions.ts",
      "src/lib/exec/briefing.functions.ts",
    ]) {
      const src = strip(read(path));
      const gateAt = src.indexOf("await assertAiQuota(");
      const tryBefore = src.lastIndexOf("try {", gateAt);
      const catchAfter = src.indexOf("} catch (err) {", gateAt);
      expect(tryBefore, `${path}: البوّابة خارج try`).toBeGreaterThan(-1);
      expect(catchAfter, `${path}: لا catch ببديل بعد البوّابة`).toBeGreaterThan(gateAt);
      // والهوية: المستخدم إن وُجد، وإلا دلو زوّار مسمّى لهذه النافذة.
      expect(src).toMatch(/context\.userId \?\? "guest:[a-z]+"/);
    }
  });

  it("مشغّل الوكلاء يسجّل التشغيل الممنوع فاشلًا برمزه ويعود بصفر خطوات", () => {
    const src = strip(read("src/lib/exec/agent-runtime.server.ts"));
    const gateAt = src.indexOf("await assertAiQuota(");
    const loopAt = src.indexOf("await generateText(");
    expect(gateAt).toBeGreaterThan(-1);
    expect(gateAt).toBeLessThan(loopAt);
    expect(src.slice(gateAt, loopAt)).toMatch(/failRun\([\s\S]*SADEED AI gate/);
    expect(src.slice(gateAt, loopAt)).toMatch(/status:\s*"failed"/);
    expect(src.slice(gateAt, loopAt)).toMatch(/steps:\s*0/);
  });

  it("`assertAiQuota` تعيد استعمال `enforceAiQuota` نفسها — دلاءٌ واحدة لا نسخة ثانية", () => {
    const quota = strip(read("src/lib/governance/ai-quota.server.ts"));
    const fnAt = quota.indexOf("export async function assertAiQuota(");
    expect(fnAt).toBeGreaterThan(-1);
    expect(quota.slice(fnAt)).toMatch(/await enforceAiQuota\(opts\)/);
    expect(quota.slice(fnAt)).toMatch(/throw new AiGateError\(/);
    // ويفشل مغلقًا: جسمٌ غير مفهوم يبقى «غير متاح» وهو منع.
    expect(quota.slice(fnAt)).toMatch(/"quota_unavailable"/);
  });
});
