// Reference asset resolver. Points every consumer to the canonical file.
import { getFinnIdentity } from "./identity.server";

export interface ReferenceAsset {
  readonly path: string;
  readonly hash: string;
  readonly usage: readonly string[];
}

export function getReferenceAsset(): ReferenceAsset {
  const id = getFinnIdentity();
  return {
    path: id.reference_asset,
    hash: id.reference_hash,
    usage: [
      "landing hero",
      "assistant dock",
      "mission control bridge",
      "OG/social preview base",
      "documentation avatars",
    ],
  };
}
