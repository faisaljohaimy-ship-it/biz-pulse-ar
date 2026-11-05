#!/usr/bin/env node
/**
 * خطّاف UserPromptSubmit — موجِّه إنتاج الفيديو (أمر المالك ٢٠٢٦/١١/٠٥: «اعمل بها دائمًا في أي طلب لإنتاج فيديو»).
 *
 * يقرأ الطلب من stdin (JSON يحمل `prompt`)، فإن ذكر الفيديو أضاف سياقًا قصيرًا يُلزم بتحميل المهارة
 * الموجِّهة `sadeed-video-production` ثم السكيل المناسب من الثمانية. لا يحجب الطلب أبدًا ولا يعدّله
 * (خروج 0 دائمًا، ولا مخرج حين لا تطابق)، ولا شبكة ولا كتابة على القرص. يُشغَّل من `.claude/settings.json`.
 */
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/**
 * كلمات الفيديو القوية فقط (عربية وإنجليزية). «موشن» و«animation» و«script» و«hook» وحدها **لا** تُطلقه:
 * تكثر في عمل الواجهة والكود (home-motion.css · سكربتات البناء · hooks في React) وتوليدها ضجيجًا أسوأ من غياب التذكير.
 */
export const VIDEO_TRIGGERS = [
  // عربية — الفيديو والمقطع والمونتاج والمنصّات
  /فيديو|فديو|ڤيديو|فيدو/u,
  /مقطع(?:ًا|ا|ين)?\s*(?:مرئي|فيديو|يوتيوب|ترويجي|تعريفي|دعائي|قصير)/u,
  /موشن\s*(?:جرافيك|غرافيك|قرافيك|جرافك|ديزاين|دزاين)/u,
  /مونتاج|مونتير/u,
  /ريلز|ريل\s|شورتس|تيك\s?توك|يوتيوب|يوتوب/u,
  /فيلم|أفلام|افلام/u,
  /(?:سكريبت|اسكريبت|إسكريبت|سيناريو)\s*(?:ال)?(?:فيديو|فديو|حلقة|مقطع|يوتيوب|ريل)/u,
  /(?:تعليق|تعليقًا|تعليقا)\s*صوتي|فويس\s?أوفر|فويس\s?اوفر/u,
  /كابشن|ترجمة\s*(?:ال)?(?:فيديو|مقطع)|لوَر\s?ثيرد|لور\s?ثيرد/u,
  /بي\s?رول|لقطات\s*(?:مساندة|تغطية)/u,
  /إنتاج\s*مرئي|انتاج\s*مرئي|محتوى\s*مرئي/u,
  // إنجليزية
  /\bvideos?\b/i,
  /\bmotion[\s-]*(?:graphics?|design)\b/i,
  /\breels?\b/i,
  /\bshorts\b/i,
  /\byoutube\b/i,
  /\btiktok\b/i,
  /\bremotion\b/i,
  /\bb[\s-]?roll\b/i,
  /\blower[\s-]?thirds?\b/i,
  /\bstoryboard\b/i,
  /\bshowreel\b/i,
  /\bexplainer\b/i,
  /\bscreencast\b/i,
  /\bvoice[\s-]?over\b/i,
  /\bkinetic\s+(?:text|captions?|type)\b/i,
  /\bthumbnails?\b/i,
  /\bffmpeg\b/i,
  /\b(?:promo|launch|brand|product)\s+film\b/i,
  /\bfilm\b/i,
];

export function matchesVideoRequest(text) {
  if (typeof text !== "string" || text.length === 0) return false;
  const t = text.normalize("NFC");
  return VIDEO_TRIGGERS.some((re) => re.test(t));
}

export const ROUTER_CONTEXT = [
  "[sadeed-video-production] الطلب يذكر الفيديو. إن كان إنتاجَ مقطعٍ أو تحريره أو كتابة سكريبته أو موشن جرافيك له",
  "(لا إصلاحَ عنصر <video> في الواجهة)، فالقاعدة الملزِمة في CLAUDE.md «إنتاج الفيديو — السكيلز الثمانية»:",
  "حمّل المهارة `sadeed-video-production` أولًا، ثم السكيل المناسب من الثمانية —",
  "الأفكار والسكريبت: `video-youtube-agent` · `video-claude-youtube` · `video-script-writer` · `video-content-os`؛",
  "الموشن والإخراج: `video-claude-motion` · `video-motion-design-code` · `video-remotion-motion-graphics` · `video-remotion-overlay`.",
  "الدستور يسود: عربي أولًا، صوت سَدِيد الذكوري لأي تعليق صوتي للمنتج، لا رقم مختلَق على الشاشة (المادة ٢٧)، ولا بيانات حقيقية ولا وسائط ثقيلة في git.",
].join(" ");

/** مخرج الخطّاف: JSON بسياق إضافي، أو لا شيء. */
export function buildHookOutput(prompt) {
  if (!matchesVideoRequest(prompt)) return null;
  return {
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: ROUTER_CONTEXT },
  };
}

async function readStdin(limit = 1 << 20) {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > limit) break;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  try {
    const raw = await readStdin();
    let prompt = "";
    try {
      const data = JSON.parse(raw);
      prompt = typeof data?.prompt === "string" ? data.prompt : "";
    } catch {
      prompt = "";
    }
    const out = buildHookOutput(prompt);
    if (out) process.stdout.write(JSON.stringify(out));
  } catch {
    // الخطّاف لا يعطّل الطلب أبدًا
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
