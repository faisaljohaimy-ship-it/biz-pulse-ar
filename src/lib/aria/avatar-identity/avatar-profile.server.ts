// Avatar profile — projection of the identity for renderer consumers.
import { getAriaIdentity } from "./identity.server";
import type { ColorSwatch, FaceSignature, LightingRule } from "./types";

export interface AvatarProfile {
  readonly id: string;
  readonly display_name_en: string;
  readonly display_name_ar: string;
  readonly reference_asset: string;
  readonly face: FaceSignature;
  readonly palette: readonly ColorSwatch[];
  readonly lighting: readonly LightingRule[];
}

export function getAvatarProfile(): AvatarProfile {
  const id = getAriaIdentity();
  return {
    id: id.id,
    display_name_en: id.display_name.en,
    display_name_ar: id.display_name.ar,
    reference_asset: id.reference_asset,
    face: id.face,
    palette: id.palette,
    lighting: id.lighting,
  };
}
