// Verification — end-to-end sanity check for the frozen identity.
import { AvatarIdentitySchema } from "./contracts";
import { getAriaIdentity } from "./identity.server";

export interface IdentityVerification {
  readonly ok: boolean;
  readonly locked: boolean;
  readonly issues: readonly string[];
  readonly identity_id: string;
  readonly version: string;
}

export function verifyIdentity(): IdentityVerification {
  const id = getAriaIdentity();
  const parsed = AvatarIdentitySchema.safeParse(id);
  const issues: string[] = [];
  if (!parsed.success) {
    for (const i of parsed.error.issues) {
      issues.push(`${i.path.join(".") || "root"}: ${i.message}`);
    }
  }
  if (!id.locked) issues.push("identity is not locked");
  if (!id.reference_asset.startsWith("src/assets/")) {
    issues.push("reference asset must live under src/assets/");
  }
  if (id.forbidden.length < 5) issues.push("forbidden list too short");
  const hasWelcoming = id.gestures.some((g) => g.id === "welcoming_hand");
  if (!hasWelcoming) issues.push("welcoming_hand gesture missing");
  return {
    ok: issues.length === 0,
    locked: id.locked,
    issues,
    identity_id: id.id,
    version: id.version,
  };
}
