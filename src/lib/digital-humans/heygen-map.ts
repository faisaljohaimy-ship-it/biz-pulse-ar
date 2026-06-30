/**
 * HeyGen Interactive Avatar persona map — single source of truth for which
 * HeyGen `avatar_id` / `voice_id` represents each Digital Human persona.
 *
 * Uses the official HeyGen Streaming Avatar SDK
 * (https://github.com/HeyGen-Official/StreamingAvatarSDK) at @heygen/streaming-avatar 2.1.1.
 * Per HeyGen's official migration guide, v1/v2 streaming endpoints remain
 * fully supported through October 31, 2026; this SDK is the current
 * officially recommended path for Interactive Avatar.
 *
 * IDs live in backend env (`HEYGEN_AVATAR_<HUMAN_ID>` / `HEYGEN_VOICE_<HUMAN_ID>`)
 * so the frontend never sees secrets. HeyGen-only — no other providers.
 */
import { DIGITAL_HUMANS } from "./registry";

export type HeygenPersonaMap = Record<string, { avatarId: string; voiceId?: string }>;

export const HEYGEN_PERSONA_IDS: readonly string[] = DIGITAL_HUMANS.map(h => h.id);

/**
 * HeyGen public Interactive Avatar default — Anna_public_3_20240108, a
 * free public avatar from labs.heygen.com that ships in the official demo.
 */
export const HEYGEN_DEFAULT_AVATAR_ID = "Anna_public_3_20240108";

/** Default voice id — empty lets HeyGen pick the avatar's native voice. */
export const HEYGEN_DEFAULT_VOICE_ID = "";

export const HEYGEN_API_URL = "https://api.heygen.com";

/** Returned by /api/heygen/token. Token is short-lived (one-time use). */
export interface HeygenSession {
  /** Short-lived access token to bootstrap the browser SDK. */
  sessionToken: string;
  personaId: string;
  avatarId: string;
  voiceId?: string;
  language: "ar" | "en";
}
