/**
 * ARIA reply-channel contract.
 *
 * Speech is reserved for an actual voice turn captured while Conversation
 * Mode is active. Keyboard/file turns remain visual so opening the copilot or
 * typing never causes surprise audio.
 */
export function shouldSpeakAriaReply({
  conversationMode,
  fromVoice,
}: {
  conversationMode: boolean;
  fromVoice?: boolean;
}): boolean {
  return conversationMode && fromVoice === true;
}

/** Convert a model reply into safe, natural speech without leaking visual
 * markup into Gemini TTS. This is a final client-side guard; the server also
 * asks the model for spoken prose when replyMode="voice". */
export function toAriaSpeechText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|mailto:|tel:)[^)]*\)/gi, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\[(?:DOC|KB):[^\]]+\]/gi, " ")
    .replace(/\[(?:\d+(?:\s*[-,]\s*\d+)*)\]/g, " ")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]\s|\d+[.)]\s)/gm, "")
    .replace(/[*_~`|]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}
