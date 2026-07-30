import type { VoiceCue, ShowcasePhase, ShowcaseLanguage } from "./types";
import { assertVoiceCue } from "./contracts";

export interface VoiceDirectorInput {
  readonly phase: ShowcasePhase;
  readonly text: string;
  readonly language: ShowcaseLanguage;
}

export function directVoice(input: VoiceDirectorInput): VoiceCue {
  const pace: VoiceCue["pace"] =
    input.phase === "intro" || input.phase === "welcome"
      ? "slow"
      : input.phase === "qa"
        ? "normal"
        : "normal";
  const emphasis: VoiceCue["emphasis"] =
    input.phase === "welcome" ? "warm" : input.phase === "story" ? "confident" : "calm";
  const cue: VoiceCue = {
    text: input.text.trim(),
    language: input.language,
    pace,
    emphasis,
  };
  assertVoiceCue(cue);
  return cue;
}
