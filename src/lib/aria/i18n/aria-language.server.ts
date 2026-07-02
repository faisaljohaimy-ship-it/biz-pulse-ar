// Directive builder — resolves final ARIA language for a request.
import type { AriaLanguageDirective, Lang } from "./types";
import { directionOf, voiceHintOf, normalizeLang } from "./language.server";
import { detectLocale } from "./locale-detection.server";
import { resolvePreference } from "./preference.server";

export interface ResolveInput {
  readonly requestId: string;
  readonly userId?: string;
  readonly explicit?: string | null;
  readonly userText?: string;
}

export function greetingKey(now = new Date()): AriaLanguageDirective["greetingKey"] {
  const h = now.getHours();
  if (h < 12) return "greet.morning";
  if (h < 17) return "greet.afternoon";
  return "greet.evening";
}

export function resolveAriaLanguage(input: ResolveInput): AriaLanguageDirective {
  let lang: Lang;
  if (input.explicit) {
    lang = normalizeLang(input.explicit);
  } else if (input.userText && input.userText.trim()) {
    lang = detectLocale(input.userText).lang;
  } else if (input.userId) {
    lang = resolvePreference(input.userId);
  } else {
    lang = "en";
  }
  return {
    requestId: input.requestId,
    lang,
    direction: directionOf(lang),
    voiceHint: voiceHintOf(lang),
    greetingKey: greetingKey(),
  };
}
