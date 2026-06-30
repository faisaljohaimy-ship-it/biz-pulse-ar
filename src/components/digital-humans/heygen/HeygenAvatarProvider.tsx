/**
 * HeyGen Interactive Avatar provider — production Digital Human presentation
 * layer for ARIA and every executive specialist. Owns audio + lip-sync
 * end-to-end; the dock simply hands over a `speakTurn` and waits for
 * `onSpeechEnd`.
 *
 * Uses the official `@heygen/streaming-avatar` SDK (v2.1.1). Per the
 * official HeyGen v3 migration guide, v1/v2 streaming endpoints remain
 * fully supported through October 31, 2026, and this SDK is the current
 * officially recommended path for Interactive Avatar.
 *
 * Architecture (provider-independent):
 *   Intelligence + Decision Making  → already exists (askAgent, ARIA agents)
 *   Orchestration                   → AriaDock + agent-listener
 *   Visual Presentation             → THIS provider (HeyGen streaming video)
 *
 * Importing this module registers `heygen` with the avatar provider registry.
 * AriaDock selects it automatically when `/api/heygen/status` reports
 * configured. The HeyGen API key never reaches the browser — we exchange a
 * short-lived session token from `/api/heygen/token` instead.
 */
import { useEffect, useRef, useState } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceChatTransport,
} from "@heygen/streaming-avatar";
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
    throw new Error(`heygen token ${res.status} ${t.slice(0, 200)}`);
  }
  return (await res.json()) as HeygenSession;
}

function HeygenRender(props: AvatarRenderProps) {
  const { spec, size = 96, speakTurn, onSpeechEnd, onSpeechError, ar } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const handledTurnsRef = useRef<Set<string>>(new Set());
  const pendingTurnRef = useRef<string | null>(null);
  const speakTurnRef = useRef(speakTurn);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onSpeechErrorRef = useRef(onSpeechError);
  const personaKeyRef = useRef<string>("");
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { speakTurnRef.current = speakTurn; }, [speakTurn]);
  useEffect(() => { onSpeechEndRef.current = onSpeechEnd; }, [onSpeechEnd]);
  useEffect(() => { onSpeechErrorRef.current = onSpeechError; }, [onSpeechError]);

  // Boot / re-boot whenever the persona or language changes. HeyGen binds
  // a session token to a single avatar_id, so a persona swap requires
  // tearing down the current streaming session and creating a new one.
  useEffect(() => {
    const language: "ar" | "en" = ar ? "ar" : "en";
    const personaKey = `${spec.id}|${language}`;
    if (personaKeyRef.current === personaKey && avatarRef.current) return;
    personaKeyRef.current = personaKey;

    let cancelled = false;
    setReady(false);
    setErr(null);

    // Tear down the previous session first.
    const prev = avatarRef.current;
    avatarRef.current = null;
    if (prev) {
      try { prev.stopAvatar(); } catch { /* noop */ }
    }

    (async () => {
      try {
        const info = await fetchSession({ personaId: spec.id, language });
        if (cancelled) return;
        const avatar = new StreamingAvatar({ token: info.sessionToken });
        avatarRef.current = avatar;

        avatar.on(StreamingEvents.STREAM_READY, (event: { detail: MediaStream }) => {
          if (cancelled || !videoRef.current) return;
          videoRef.current.srcObject = event.detail;
          videoRef.current.play().catch(() => undefined);
          setReady(true);
        });
        avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
          setReady(false);
        });
        avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          const turnId = pendingTurnRef.current;
          if (turnId && !handledTurnsRef.current.has(turnId)) {
            handledTurnsRef.current.add(turnId);
            pendingTurnRef.current = null;
            onSpeechEndRef.current?.(turnId);
          }
        });

        await avatar.createStartAvatar({
          quality: AvatarQuality.Low,
          avatarName: info.avatarId,
          ...(info.voiceId ? { voice: { voiceId: info.voiceId } } : {}),
          language,
          voiceChatTransport: VoiceChatTransport.WEBSOCKET,
          activityIdleTimeout: 300,
        });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "heygen boot failed";
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
      const a = avatarRef.current;
      avatarRef.current = null;
      if (a) {
        try { a.stopAvatar(); } catch { /* noop */ }
      }
    };
  }, []);

  // Dispatch a new spoken turn. REPEAT task makes the avatar say the
  // exact text the orchestrator produced (ARIA / specialist response).
  // Audio + lip-sync are handled by HeyGen; we resolve the turn from the
  // AVATAR_STOP_TALKING event registered above.
  useEffect(() => {
    const avatar = avatarRef.current;
    if (!avatar || !speakTurn) return;
    if (handledTurnsRef.current.has(speakTurn.id)) return;
    void (async () => {
      try {
        // Barge-in: cancel any current speech before the new turn.
        try { await avatar.interrupt(); } catch { /* noop */ }
        pendingTurnRef.current = speakTurn.id;
        await avatar.speak({
          text: speakTurn.text,
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.SYNC,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "heygen speak failed";
        if (!handledTurnsRef.current.has(speakTurn.id)) {
          handledTurnsRef.current.add(speakTurn.id);
          pendingTurnRef.current = null;
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
        <div className="absolute inset-0 grid place-items-center px-2 text-[10px] text-cyan-200/80 text-center">
          {ar ? "البث المرئي غير متاح حالياً" : "Live avatar unavailable"}
        </div>
      )}
    </div>
  );
}

registerAvatarProvider({
  id: "heygen",
  label: "HeyGen Streaming Avatar",
  capabilities: {
    realtimeLipSync: true,
    photorealistic: true,
    streamingVideo: true,
    requiresNetwork: true,
  },
  Render: HeygenRender,
});
