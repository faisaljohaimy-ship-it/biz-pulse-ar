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
