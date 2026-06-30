/**
 * Gateway voice listener — provider-independent STT loop using the
 * browser's MediaRecorder API and Lovable AI Gateway transcription
 * (`/api/voice-stt`). No ElevenLabs dependency.
 *
 * Mode: VAD-style auto-commit. We continuously monitor microphone RMS
 * via an AnalyserNode; when the user has been silent for ~900ms after
 * speaking for ≥300ms, we stop the recorder, ship the chunk to STT,
 * await transcript, then immediately resume listening for the next
 * utterance. Stops cleanly when `stop()` is called.
 *
 * Returns a hook with the same surface shape as `useAgentListener` so
 * AriaDock can swap providers without UI changes.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { ARIA, type DigitalHumanSpec } from "./registry";

const isArabic = (s: string) => /[\u0600-\u06FF]/.test(s);

type WindowAria = {
  speak?: (t: { id?: string; text_ar: string; text_en: string; speaker?: DigitalHumanSpec }) => void;
  stop?: () => void;
};

type AriaAskResponse = {
  text_ar?: string;
  text_en?: string;
  error?: string;
};

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const m of candidates) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* ignore */ }
  }
  return undefined;
}

export function useGatewayListener() {
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [partial, setPartial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const speakerRef = useRef<DigitalHumanSpec>(ARIA);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopFlagRef = useRef(false);
  const busyRef = useRef(false);
  const rafRef = useRef(0);

  const teardown = useCallback(() => {
    stopFlagRef.current = true;
    cancelAnimationFrame(rafRef.current);
    try { recorderRef.current?.state !== "inactive" && recorderRef.current?.stop(); } catch { /* noop */ }
    recorderRef.current = null;
    chunksRef.current = [];
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    streamRef.current = null;
    try { void ctxRef.current?.close(); } catch { /* noop */ }
    ctxRef.current = null;
    analyserRef.current = null;
    setListening(false);
    setPartial("");
  }, []);

  const handleTranscript = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) return;
    if (busyRef.current) return;
    busyRef.current = true;
    setThinking(true);
    setPartial(q);
    setError(null);
    try {
      const sp = speakerRef.current;
      const lang = isArabic(q) ? "ar" : "en";
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 45_000);
      const r = await fetch("/api/public/aria-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `[Voice question to ${sp.name_en} / ${sp.name_ar}] ${q}`,
          lang,
        }),
        signal: ctrl.signal,
      });
      window.clearTimeout(timer);
      const res = (await r.json().catch(() => ({}))) as AriaAskResponse;
      if (!r.ok) throw new Error(res.error || `ask_${r.status}`);
      const textAr = (res.text_ar || res.text_en || "").trim();
      const textEn = (res.text_en || res.text_ar || "").trim();
      if (!textAr && !textEn) throw new Error("empty_answer");
      const w = window as unknown as { aria?: WindowAria };
      w.aria?.speak?.({
        id: `gw-ask-${sp.id}-${Date.now()}`,
        text_ar: textAr,
        text_en: textEn,
        speaker: sp,
      });
    } catch (e) {
      const arMsg = "سمعت سؤالك، لكن تعذّر توليد الرد الآن. أعد المحاولة أو اكتب السؤال في الخانة النصية.";
      const enMsg = "I heard your question, but the answer engine did not complete. Please retry or type the question.";
      setError(isArabic(q) ? arMsg : enMsg);
      const w = window as unknown as { aria?: WindowAria };
      w.aria?.speak?.({
        id: `gw-ask-error-${Date.now()}`,
        text_ar: arMsg,
        text_en: enMsg,
        speaker: speakerRef.current,
      });
    } finally {
      busyRef.current = false;
      setThinking(false);
      setPartial("");
    }
  }, []);

  const startSegment = useCallback(() => {
    if (stopFlagRef.current) return;
    const stream = streamRef.current;
    const mime = pickMimeType();
    if (!stream || !mime) return;
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "recorder_failed");
      teardown();
      return;
    }
    recorderRef.current = rec;
    chunksRef.current = [];
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunksRef.current.push(ev.data); };
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];
      if (blob.size < 2000) {
        // too short — likely noise; loop back
        if (!stopFlagRef.current) startSegment();
        return;
      }
      const fd = new FormData();
      fd.append("audio", blob, `turn-${Date.now()}.webm`);
      try {
        const r = await authenticatedFetch("/api/voice-stt", { method: "POST", body: fd });
        if (!r.ok) throw new Error(`stt ${r.status}`);
        const j = (await r.json()) as { text?: string };
        if (j.text) await handleTranscript(j.text);
      } catch (e) {
        setError(e instanceof Error ? e.message : "stt_failed");
      }
      if (!stopFlagRef.current) startSegment();
    };
    rec.start();

    // VAD loop — RMS over time domain to detect end-of-utterance.
    const analyser = analyserRef.current!;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const startedAt = performance.now();
    let lastVoiceAt = startedAt;
    let voicedMs = 0;
    let prev = startedAt;
    const SILENCE_HANG_MS = 900;
    const MIN_VOICED_MS = 300;
    const MAX_SEGMENT_MS = 15_000;
    const tick = (t: number) => {
      if (stopFlagRef.current || recorderRef.current?.state !== "recording") return;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      const elapsed = t - startedAt;
      const dt = t - prev;
      prev = t;
      if (rms > 0.04) {
        lastVoiceAt = t;
        voicedMs += dt;
        setPartial("…");
      }
      const silent = t - lastVoiceAt;
      if ((voicedMs >= MIN_VOICED_MS && silent >= SILENCE_HANG_MS) || elapsed >= MAX_SEGMENT_MS) {
        try { recorderRef.current?.stop(); } catch { /* noop */ }
        setPartial("");
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [handleTranscript, teardown]);

  const start = useCallback(async (speaker?: DigitalHumanSpec) => {
    if (listening) return;
    setError(null);
    speakerRef.current = speaker ?? ARIA;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("الميكروفون غير مدعوم في هذه البيئة · Microphone unavailable here");
      return;
    }
    // Detect iframes that do NOT carry an `allow="microphone"` permission.
    // getUserMedia silently rejects with NotAllowedError in that case; we
    // surface a useful message instead of the raw browser string.
    let iframeBlocked = false;
    try {
      if (typeof window !== "undefined" && window.self !== window.top) {
        const fp = (document as unknown as { featurePolicy?: { allowsFeature: (f: string) => boolean } }).featurePolicy;
        if (fp && typeof fp.allowsFeature === "function" && !fp.allowsFeature("microphone")) {
          iframeBlocked = true;
        }
      }
    } catch { /* cross-origin — assume allowed and let getUserMedia decide */ }
    if (iframeBlocked) {
      setError("الميكروفون معطّل داخل هذا الإطار — افتح الموقع في نافذة مستقلة · Mic is blocked in this embedded frame — open the site in its own tab.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const Ctor: typeof AudioContext = (window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      }).AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.7;
      src.connect(analyser);
      analyserRef.current = analyser;
      stopFlagRef.current = false;
      // Silence any in-flight narration so the user is heard.
      (window as unknown as { aria?: WindowAria }).aria?.stop?.();
      setListening(true);
      startSegment();
    } catch (e) {
      const name = (e as { name?: string })?.name ?? "";
      let msg: string;
      if (name === "NotAllowedError" || name === "SecurityError") {
        msg = "صلاحية الميكروفون مرفوضة — فعّلها من إعدادات المتصفح · Microphone permission denied — enable it in browser settings.";
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        msg = "لم يتم العثور على ميكروفون متصل · No microphone detected on this device.";
      } else if (name === "NotReadableError") {
        msg = "الميكروفون مشغول بتطبيق آخر · Microphone is in use by another app.";
      } else {
        msg = e instanceof Error && e.message ? e.message : "mic_unavailable";
      }
      setError(msg);
      teardown();
    }
  }, [listening, startSegment, teardown]);


  const stop = useCallback(() => { teardown(); }, [teardown]);
  const toggle = useCallback((speaker?: DigitalHumanSpec) => {
    if (listening) stop(); else void start(speaker);
  }, [listening, start, stop]);

  useEffect(() => () => { teardown(); }, [teardown]);

  return { listening, partial, thinking, error, start, stop, toggle, activeSpeaker: speakerRef.current };
}
