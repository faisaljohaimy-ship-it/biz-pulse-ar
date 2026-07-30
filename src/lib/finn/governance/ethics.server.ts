/**
 * Ethics gate — checks universal principles.
 * Simple rule-based: block obvious harms; never fabricate reasoning.
 */
import type { EthicsCheck, ProposedAction } from "./types";

const PRINCIPLES = ["no_harm", "transparency", "accountability", "human_dignity", "no_deception"];

const HARM_KEYWORDS = ["harm", "deceive", "manipulate", "exploit", "punish"];

export function checkEthics(action: ProposedAction): EthicsCheck {
  const text = `${action.summary} ${action.target ?? ""}`.toLowerCase();
  for (const kw of HARM_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        ok: false,
        principles: PRINCIPLES,
        reason: `action text contains restricted term: ${kw}`,
      };
    }
  }
  return { ok: true, principles: PRINCIPLES };
}
