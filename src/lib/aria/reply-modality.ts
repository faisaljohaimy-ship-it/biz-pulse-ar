/**
 * ARIA reply-channel contract.
 *
 * Rule: when Conversation Mode ("المخاطبة") is ON, every ARIA reply is
 * spoken — voice turn OR typed turn — so mobile users who type still hear
 * ARIA speak. When Conversation Mode is OFF, replies stay silent (visual
 * only), so opening the copilot or typing never causes surprise audio.
 */
export function shouldSpeakAriaReply({
  conversationMode,
  fromVoice: _fromVoice,
}: {
  conversationMode: boolean;
  fromVoice?: boolean;
}): boolean {
  return conversationMode === true;
}

/** Convert a model reply into safe, natural speech without leaking visual
 * markup into ElevenLabs. This is a final client-side guard; the server also
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
