/**
 * LiveAvatar persona map — single source of truth for which LiveAvatar
 * `avatar_id` / `voice_id` represents each Digital Human persona.
 *
 * LiveAvatar (https://liveavatar.com) is the official next-generation
 * HeyGen Streaming Avatar platform. IDs live in backend env
 * (`LIVEAVATAR_AVATAR_<HUMAN_ID>` / `LIVEAVATAR_VOICE_<HUMAN_ID>`, or
 * legacy `HEYGEN_AVATAR_*` / `HEYGEN_VOICE_*` for compat) so the
 * frontend never sees secrets.
 *
 * Pure client-safe types and the list of expected persona IDs.
 */
import { DIGITAL_HUMANS } from "./registry";

export type HeygenPersonaMap = Record<string, { avatarId: string; voiceId?: string }>;

export const HEYGEN_PERSONA_IDS: readonly string[] = DIGITAL_HUMANS.map(h => h.id);

/**
 * LiveAvatar public default — Wayne, the public showcase avatar exposed
 * in the official @heygen/liveavatar-web-sdk demo. Works without any
 * extra account setup.
 */
export const HEYGEN_DEFAULT_AVATAR_ID = "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a";

/** Public Wayne voice that pairs with the default avatar. */
export const HEYGEN_DEFAULT_VOICE_ID = "c2527536-6d1f-4412-a643-53a3497dada9";

export const LIVEAVATAR_API_URL = "https://api.liveavatar.com";

/** Returned by /api/heygen/token. Token is bound to a single avatar/persona. */
export interface HeygenSession {
  sessionToken: string;
  sessionId: string;
  personaId: string;
  avatarId: string;
  voiceId?: string;
  language: "ar" | "en";
  apiUrl: string;
}
