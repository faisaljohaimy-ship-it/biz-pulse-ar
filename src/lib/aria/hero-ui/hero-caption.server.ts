import type { HeroCaptionDirective, HeroLanguage } from "./types";
import { assertCaption } from "./contracts";

export interface CaptionInput {
  readonly text: string;
  readonly language: HeroLanguage;
  readonly streaming?: boolean;
  readonly visible?: boolean;
  readonly fadeMs?: number;
}

export function computeCaption(input: CaptionInput): HeroCaptionDirective {
  const text = (input.text ?? "").replace(/\s+/g, " ").trim();
  const c: HeroCaptionDirective = {
    visible: input.visible !== false && text.length > 0,
    language: input.language,
    dir: input.language === "ar" ? "rtl" : "ltr",
    text,
    streaming: input.streaming ?? false,
    fadeMs: Math.min(480, Math.max(120, input.fadeMs ?? 220)),
  };
  assertCaption(c);
  return c;
}
