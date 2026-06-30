/**
 * HeyGen Streaming Avatar provider — enterprise-grade Digital Human
 * presentation layer. Owns audio + lip-sync end-to-end; the dock simply
 * hands over a `speakTurn` and waits for `onSpeechEnd`.
 *
 * Architecture (provider-independent):
 *   Intelligence + Decision Making  → already exists (askAgent, ARIA)
 *   Orchestration                   → AriaDock + agent-listener
 *   Visual Presentation             → THIS provider (HeyGen)
 *
 * Importing this module registers `heygen` with the avatar provider
 * registry. AriaDock selects it automatically when
 * `/api/heygen/status` reports the integration is configured.
 *
 * The HeyGen API key never reaches the browser — we exchange a short-lived
 * session token from `/api/heygen/token` instead.
 */
import { useEffect, useRef, useState } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
  registerAvatarProvider,
  type AvatarRenderProps,
} from "@/lib/digital-humans/avatar-provider";
import {
  HEYGEN_DEFAULT_AVATAR_ID,
  type HeygenSession,
} from "@/lib/digital-humans/heygen-map";
import { supabase } from "@/integrations/supabase/client";

let cachedSession: Promise<HeygenSession> | null = null;
async function fetchSession(): Promise<HeygenSession> {
  if (cachedSession) return cachedSession;
  cachedSession = (async () => {
    const { data } = await supabase.auth.getSession();
    const bearer = data.session?.access_token;
    const res = await fetch("/api/heygen/token", {
      method: "POST",
      headers: bearer ? { authorization: `Bearer ${bearer}` } : undefined,
    });
    if (!res.ok) {
      cachedSession = null;
      const t = await res.text().catch(() => "");
      throw new Error(`heygen token ${res.status} ${t.slice(0, 200)}`);
    }
    return (await res.json()) as HeygenSession;
  })();
  return cachedSession;
}

function HeygenRender(props: AvatarRenderProps) {
  const { spec, size = 96, speakTurn, onSpeechEnd, onSpeechError, ar } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const currentAvatarIdRef = useRef<string | null>(null);
  const sessionInfoRef = useRef<HeygenSession | null>(null);
  const handledTurnsRef = useRef<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Boot HeyGen once. Subsequent persona switches go through `interrupt + new avatar`.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await fetchSession();
        if (cancelled) return;
        sessionInfoRef.current = session;
        const avatar = new StreamingAvatar({ token: session.token });
        avatarRef.current = avatar;
        avatar.on(StreamingEvents.STREAM_READY, (evt) => {
          if (cancelled || !videoRef.current) return;
          const stream = (evt as unknown as { detail?: MediaStream }).detail;
          if (stream) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play().catch(() => {/* user-gesture autoplay handled by UI */});
          }
          setReady(true);
        });
        avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          const t = speakTurnRef.current;
          if (t && !handledTurnsRef.current.has(t.id)) {
            handledTurnsRef.current.add(t.id);
            onSpeechEndRef.current?.(t.id);
          }
        });
        avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
          setReady(false);
        });
        const target = session.avatars[spec.id]?.avatarId ?? session.defaultAvatarId ?? HEYGEN_DEFAULT_AVATAR_ID;
        currentAvatarIdRef.current = target;
        await avatar.createStartAvatar({
          avatarName: target,
          quality: AvatarQuality.Medium,
          voice: {
            voiceId: session.avatars[spec.id]?.voiceId,
            rate: 1.05,
            emotion: VoiceEmotion.SERIOUS,
          },
          language: ar ? "ar" : "en",
          disableIdleTimeout: false,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "heygen boot failed";
        setErr(msg);
        onSpeechErrorRef.current?.("boot", msg);
      }
    })();
    return () => {
      cancelled = true;
      const a = avatarRef.current;
      avatarRef.current = null;
      if (a) void a.stopAvatar().catch(() => undefined);
    };
    // Boot once; persona swap is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep refs in sync so the AVATAR_STOP_TALKING handler resolves the right turn.
  const speakTurnRef = useRef(speakTurn);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onSpeechErrorRef = useRef(onSpeechError);
  useEffect(() => { speakTurnRef.current = speakTurn; }, [speakTurn]);
  useEffect(() => { onSpeechEndRef.current = onSpeechEnd; }, [onSpeechEnd]);
  useEffect(() => { onSpeechErrorRef.current = onSpeechError; }, [onSpeechError]);

  // Persona switch — interrupt current speech and swap the running avatar
  // when the dock selects a different specialist. HeyGen requires a new
  // session for a different avatarId.
  useEffect(() => {
    const avatar = avatarRef.current;
    const session = sessionInfoRef.current;
    if (!avatar || !session) return;
    const targetId = session.avatars[spec.id]?.avatarId ?? session.defaultAvatarId ?? HEYGEN_DEFAULT_AVATAR_ID;
    if (targetId === currentAvatarIdRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        await avatar.interrupt().catch(() => undefined);
        await avatar.stopAvatar().catch(() => undefined);
        if (cancelled) return;
        await avatar.createStartAvatar({
          avatarName: targetId,
          quality: AvatarQuality.Medium,
          voice: {
            voiceId: session.avatars[spec.id]?.voiceId,
            rate: 1.05,
            emotion: VoiceEmotion.SERIOUS,
          },
          language: ar ? "ar" : "en",
        });
        currentAvatarIdRef.current = targetId;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "heygen swap failed";
        setErr(msg);
        onSpeechErrorRef.current?.("swap", msg);
      }
    })();
    return () => { cancelled = true; };
  }, [spec.id, ar]);

  // Dispatch a new spoken turn to HeyGen. `onSpeechEnd` fires from the
  // AVATAR_STOP_TALKING event handler above.
  useEffect(() => {
    const avatar = avatarRef.current;
    if (!avatar || !speakTurn) return;
    if (handledTurnsRef.current.has(speakTurn.id)) return;
    void (async () => {
      try {
        await avatar.speak({
          text: speakTurn.text,
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.SYNC,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "heygen speak failed";
        if (!handledTurnsRef.current.has(speakTurn.id)) {
          handledTurnsRef.current.add(speakTurn.id);
          onSpeechErrorRef.current?.(speakTurn.id, msg);
        }
      }
    })();
  }, [speakTurn]);

  // Visual frame around the video stream.
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
        muted={false}
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
  label: "HeyGen Streaming Avatar",
  capabilities: {
    realtimeLipSync: true,
    photorealistic: true,
    streamingVideo: true,
    requiresNetwork: true,
  },
  Render: HeygenRender,
});
