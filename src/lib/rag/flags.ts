/**
 * RAG feature flag — NOT_GLOBAL gateway (session constant).
 *
 * The retrieval surface ships DARK: it renders only when the environment
 * explicitly opts in via VITE_RAG_RETRIEVAL_ENABLED=true|1. Default is OFF
 * everywhere — production stays untouched until the operator flips the env
 * var per environment (Vercel env settings), which is auditable and
 * reversible without a deploy of code.
 *
 * Rejected alternative: a client-side toggle (localStorage / URL param) —
 * not auditable, and would let any visitor enable an auth-gated surface the
 * operator hasn't approved for that environment.
 */

export const RAG_FLAG_NAME = "VITE_RAG_RETRIEVAL_ENABLED";

/** Pure, unit-tested: only the explicit strings "true" / "1" enable. */
export function parseRagFlag(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1";
}

/** Reads the ambient Vite env. Never throws; absent env = OFF. */
export function isRagRetrievalEnabled(): boolean {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return parseRagFlag(env?.[RAG_FLAG_NAME]);
}
