/** Configuration evidence is deliberately separate from successful end-to-end execution. */
export type ReadinessInputs = {
  geminiPresent: boolean;
  elevenLabsPresent: boolean;
  ragReindexConfirmed: boolean;
  gate: "verified" | "closed" | "degraded";
};

export function describeReadiness(input: ReadinessInputs) {
  const chatState = !input.geminiPresent
    ? "not_configured"
    : input.gate === "closed"
      ? "blocked"
      : input.gate === "degraded"
        ? "degraded"
        : "configured_unverified";
  return {
    schema_version: 1,
    evidence_scope: "configuration_and_storage_gate",
    chat: { state: chatState, verification: "not_run" },
    rag: {
      state: !input.ragReindexConfirmed
        ? "reindex_not_confirmed"
        : !input.geminiPresent
          ? "embedding_key_missing"
          : "configured_unverified",
      verification: "retrieval_and_tenant_isolation_not_run",
    },
    voice: {
      // The existing /api/sadeed/tts route uses ElevenLabs; a Gemini key does
      // not prove this endpoint can speak. Preserve the audible-voice policy.
      provider: "elevenlabs",
      endpoint: "/api/sadeed/tts",
      state: input.elevenLabsPresent ? "configured_unverified" : "not_configured",
      verification: "audio_generation_and_playback_not_run",
    },
    transcription: {
      state: input.geminiPresent ? "configured_unverified" : "not_configured",
      verification: "not_run",
    },
    fnn: {
      state: "not_verified",
      verification: "authenticated_authorization_and_execution_required",
    },
  } as const;
}
