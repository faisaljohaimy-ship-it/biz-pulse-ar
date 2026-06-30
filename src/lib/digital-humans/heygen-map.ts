/**
 * HeyGen persona map — single source of truth for which HeyGen
 * `avatar_id` / `voice_id` represents each Digital Human persona.
 *
 * The actual IDs live in backend env (`HEYGEN_AVATAR_<HUMAN_ID>` and
 * `HEYGEN_VOICE_<HUMAN_ID>`) so the frontend never sees secrets and
 * customers can swap avatars without a deploy. The token endpoint
 * (`/api/heygen/token`) reads env, builds the final map server-side
 * and returns it alongside the short-lived session token.
 *
 * Pure client-safe types and the list of expected persona IDs.
 */
import { DIGITAL_HUMANS } from "./registry";

export type HeygenPersonaMap = Record<string, { avatarId: string; voiceId?: string }>;

export const HEYGEN_PERSONA_IDS: readonly string[] = DIGITAL_HUMANS.map(h => h.id);

/** HeyGen public default — works on every Enterprise account. */
export const HEYGEN_DEFAULT_AVATAR_ID = "Anna_public_3_20240108";

export interface HeygenSession {
  token: string;
  avatars: HeygenPersonaMap;
  defaultAvatarId: string;
  serverUrl?: string;
}
