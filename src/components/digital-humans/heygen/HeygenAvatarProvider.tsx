/**
 * LiveAvatar (official next-generation HeyGen Streaming Avatar) provider —
 * production Digital Human presentation layer for ARIA and every executive
 * specialist. Owns audio + lip-sync end-to-end; the dock simply hands over
 * a `speakTurn` and waits for `onSpeechEnd`.
 *
 * Architecture (provider-independent):
 *   Intelligence + Decision Making  → already exists (askAgent, ARIA agents)
 *   Orchestration                   → AriaDock + agent-listener
 *   Visual Presentation             → THIS provider (LiveAvatar FULL mode)
 *
 * Importing this module registers `heygen` (kept as the provider id for
 * UI continuity) with the avatar provider registry. AriaDock selects it
 * automatically when `/api/heygen/status` reports configured.
 *
 * The LiveAvatar API key never reaches the browser — we exchange a
 * short-lived session token from `/api/heygen/token` instead. Persona
 * swaps tear down the current session and mint a new token bound to the
 * next persona's avatar / voice. Migration follows the official LiveAvatar
 * Web SDK demo at github.com/heygen-com/liveavatar-web-sdk.
 */
import { useEffect, useRef, useState } from "react";
import {
  LiveAvatarSession,
  SessionEvent,
  SessionState,
  AgentEventsEnum,
} from "@heygen/liveavatar-web-sdk";
import {
  registerAvatarProvider,
  type AvatarRenderProps,
} from "@/lib/digital-humans/avatar-provider";
import type { HeygenSession } from "@/lib/digital-humans/heygen-map";
import { supabase } from "@/integrations/supabase/client";

interface TokenRequest {
  personaId: string;
  language: "ar" | "en";
}

async function fetchSession(req: TokenRequest): Promise<HeygenSession> {
  const { data } = await supabase.auth.getSession();
  const bearer = data.session?.access_token;
  const res = await fetch("/api/heygen/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`liveavatar token ${res.status} ${t.slice(0, 200)}`);
  }
  return (await res.json()) as HeygenSession;
}

async function stopRemote(sessionToken: string | undefined) {
  if (!sessionToken) return;
  try {
    await fetch("/api/heygen/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken }),
    });
  } catch {
    /* best-effort */
  }
}

function HeygenRender(props: AvatarRenderProps) {
  const { spec, size = 96, speakTurn, onSpeechEnd, onSpeechError, ar } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const sessionInfoRef = useRef<HeygenSession | null>(null);
  const handledTurnsRef = useRef<Set<string>>(new Set());
  const speakTurnRef = useRef(speakTurn);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onSpeechErrorRef = useRef(onSpeechError);
  const personaKeyRef = useRef<string>("");
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { speakTurnRef.current = speakTurn; }, [speakTurn]);
  useEffect(() => { onSpeechEndRef.current = onSpeechEnd; }, [onSpeechEnd]);
  useEffect(() => { onSpeechErrorRef.current = onSpeechError; }, [onSpeechError]);

  // Boot / re-boot whenever the persona or language changes. LiveAvatar
  // binds a session token to a single avatar_id, so a persona swap
  // requires tearing down and reopening the streaming session.
  useEffect(() => {
    const language: "ar" | "en" = ar ? "ar" : "en";
    const personaKey = `${spec.id}|${language}`;
    if (personaKeyRef.current === personaKey && sessionRef.current) return;
    personaKeyRef.current = personaKey;

    let cancelled = false;
    setReady(false);
    setErr(null);

    // Tear down the previous session first.
    const prev = sessionRef.current;
    const prevInfo = sessionInfoRef.current;
    sessionRef.current = null;
    sessionInfoRef.current = null;
    if (prev) {
      try { prev.removeAllListeners(); } catch { /* noop */ }
      void prev.stop().catch(() => undefined);
    }
    if (prevInfo) void stopRemote(prevInfo.sessionToken);

    (async () => {
      try {
        const info = await fetchSession({ personaId: spec.id, language });
        if (cancelled) {
          void stopRemote(info.sessionToken);
          return;
        }
        sessionInfoRef.current = info;
        const session = new LiveAvatarSession(info.sessionToken, {
          apiUrl: info.apiUrl,
          voiceChat: true,
        });
        sessionRef.current = session;

        session.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
          if (state === SessionState.DISCONNECTED) {
            setReady(false);
          }
        });
        session.on(SessionEvent.SESSION_STREAM_READY, () => {
          if (cancelled || !videoRef.current) return;
          try { session.attach(videoRef.current); } catch (e) {
            console.warn("[liveavatar] attach failed", e);
          }
          setReady(true);
        });
        session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
          const t = speakTurnRef.current;
          if (t && !handledTurnsRef.current.has(t.id)) {
            handledTurnsRef.current.add(t.id);
            onSpeechEndRef.current?.(t.id);
          }
        });

        await session.start();
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "liveavatar boot failed";
        setErr(msg);
        onSpeechErrorRef.current?.("boot", msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [spec.id, ar]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      const s = sessionRef.current;
      const info = sessionInfoRef.current;
      sessionRef.current = null;
      sessionInfoRef.current = null;
      if (s) {
        try { s.removeAllListeners(); } catch { /* noop */ }
        void s.stop().catch(() => undefined);
      }
      if (info) void stopRemote(info.sessionToken);
    };
  }, []);

  // Dispatch a new spoken turn. FULL-mode `repeat()` makes the avatar say
  // the exact text the orchestrator produced (ARIA / specialist response).
  // Audio + lip-sync are handled by LiveAvatar; we resolve the turn from
  // the AVATAR_SPEAK_ENDED event registered above.
  useEffect(() => {
    const session = sessionRef.current;
    if (!session || !speakTurn) return;
    if (handledTurnsRef.current.has(speakTurn.id)) return;
    void (async () => {
      try {
        // Barge-in: cancel any current speech before the new turn.
        try { await session.interrupt(); } catch { /* noop */ }
        await session.repeat(speakTurn.text);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "liveavatar speak failed";
        if (!handledTurnsRef.current.has(speakTurn.id)) {
          handledTurnsRef.current.add(speakTurn.id);
          onSpeechErrorRef.current?.(speakTurn.id, msg);
        }
      }
    })();
  }, [speakTurn]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-cyan-400/30 bg-[#04111f] shrink-0"
      style={{ width: size, height: size }}
      aria-label={spec.name_en}
    >
      <video
        ref={videoRef}
        playsInline
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />
      {!ready && !err && (
        <div className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-[0.2em] text-cyan-300/80 animate-pulse">
          {ar ? "تحضير" : "Booting"}
        </div>
      )}
      {err && (
        <div className="absolute inset-0 grid place-items-center px-2 text-[9px] text-rose-300/80 text-center">
          {err.slice(0, 80)}
        </div>
      )}
    </div>
  );
}

registerAvatarProvider({
  id: "heygen",
  label: "HeyGen LiveAvatar",
  capabilities: {
    realtimeLipSync: true,
    photorealistic: true,
    streamingVideo: true,
    requiresNetwork: true,
  },
  Render: HeygenRender,
});
