// Human-readable style guide derived from the frozen identity.
import { getAriaIdentity } from "./identity.server";
import type { AvatarIdentity } from "./types";

export interface StyleGuide {
  readonly identity: AvatarIdentity["id"];
  readonly summary_en: string;
  readonly summary_ar: string;
  readonly do: readonly string[];
  readonly dont: readonly string[];
  readonly palette: readonly { name: string; hex: string; role: string }[];
}

export function getStyleGuide(): StyleGuide {
  const id = getAriaIdentity();
  return {
    identity: id.id,
    summary_en:
      "ARIA is a premium executive AI presence. Same face, same holographic cyan glow, same warm confident expression, same welcoming pose. Never a different woman.",
    summary_ar:
      "آريا حضور تنفيذي راقٍ. نفس الوجه، ونفس التوهج الهولوغرافي السماوي، ونفس الابتسامة الواثقة، ونفس الوضعية الترحيبية. لا تُستبدل بامرأة أخرى.",
    do: [
      "Use the canonical reference asset for every hero surface.",
      "Preserve cyan rim + warm key lighting.",
      "Keep welcoming open hand as the default pose.",
      "Maintain executive onyx attire.",
      "Render at reference quality on landing surfaces.",
    ],
    dont: [...id.forbidden],
    palette: id.palette.map((c) => ({ name: c.name, hex: c.hex, role: c.role })),
  };
}
