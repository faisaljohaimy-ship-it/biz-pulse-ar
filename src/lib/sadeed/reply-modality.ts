import { applySadeedPronunciation } from "./pronunciation";

/**
 * SADEED reply-channel contract.
 *
 * **جولة V5 (مراجعة العميل).** كانت القاعدة: لا نطق إلا في «المخاطبة».
 * والملاحظة الحرفية: المستخدم يفتح المساعد ويكتب فيقرأ ردًّا صامتًا، ولا
 * يعرف أن للنظام صوتًا أصلًا — فالميزة موجودة ومحجوبة خلف مفتاحٍ لا يراه.
 * القاعدة الجديدة: **سَدِيد ينطق كل ردّ افتراضيًّا** — صوتًا كان أم كتابةً،
 * في كل المحادثات — ما لم يكن الكتم مفعّلًا.
 *
 * والكتم هو المفتاح الوحيد الذي يُسكِت: حالةٌ واحدة في `voice-mute` يملكها
 * زرٌّ ظاهر ودائم، محفوظة بين الجلسات. فمن لا يريد صوتًا يكتم مرّة واحدة
 * ولا يعود يُفاجأ؛ ومن لم يكتم يسمع. لا فرع ثالث.
 */
export function shouldSpeakSadeedReply({
  muted = false,
}: {
  conversationMode?: boolean;
  fromVoice?: boolean;
  /** حالة `isSadeedVoiceMuted()` لحظةَ الإرسال. */
  muted?: boolean;
}): boolean {
  return muted !== true;
}

/** Convert a model reply into safe, natural speech without leaking visual
 * markup into ElevenLabs. This is a final client-side guard; the server also
 * asks the model for spoken prose when replyMode="voice". Article 22 §5:
 * Latin acronyms and directive codes are spoken as correct Arabic (SEC-18 →
 * «سِك ثمانية عشر», PTW → «تصريح العمل») instead of letter-spelled. */
export function toSadeedSpeechText(value: string): string {
  const cleaned = value
    // Never narrate fenced code: partial tilde openers and CR-only line breaks
    // must also be omitted before they reach voice synthesis.
    // Only a standalone same-character line can close the fence; inline markers cannot.
    // Only line-start Markdown fence openers remove content; inline triple
    // markers (e.g. `label`) are part of the spoken prose.
    .replace(/(^|[\r\n])[ \t]{0,3}((`|~)\3{2,})[^]*?(?:[\r\n][ \t]{0,3}\2\3*(?![ \t]*\S)|$)/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Narrate link labels, not destination URLs, anchors, or screen paths.
    .replace(/\[([^\]]+)\]\((https?:\/\/|mailto:|tel:|\/|#|\.{1,2}\/)[^)]*\)/gi, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\[(DOC|KB):[^\]]+\]/gi, " ")
    .replace(/\[\d+(\s*[-,]\s*\d+)*\]/g, " ")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]\s|\d+[.)]\s)/gm, "")
    // GFM column-alignment rows are visual delimiters, not spoken content.
    // Remove them before dropping pipes, or "--- :---:" is read aloud.
    // Require 3+ dashes per column; keep literal "-" and ":" data cells.
    .replace(/^[ \t|]*:?---+:?([ \t]*\|[ \t]*:?---+:?)*[ \t|]*$/gm, " ")
    .replace(/[*_~`|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return applySadeedPronunciation(cleaned);
}
