/**
 * AriaStatusStrip — always-visible live status row for the executive dock.
 *
 * Shows: Connected · State (Listening/Thinking/Speaking/Idle) · Queue depth
 *        · Latency (ms, measured against a public health ping every 15s)
 *        · Voice (On/Muted).
 *
 * Pure presentational — all signals come in via props so it stays cheap
 * to test and easy to mock. The latency probe lives here so the strip is
 * self-contained when dropped into any host.
 */
import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff, Mic, Brain, Radio, Volume2, VolumeX, Activity, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DigitalHumanState } from "@/lib/digital-humans/registry";

interface Props {
  state: DigitalHumanState;
  voiceOn: boolean;
  queueDepth: number;
  /** True when the agent listener is in `listening` mode. */
  listening: boolean;
  /** True when the agent listener is `thinking`. */
  thinking: boolean;
  ar?: boolean;
  /** Optional override for tests. */
  pingEndpoint?: string;
  className?: string;
}

type Conn = "online" | "offline";

function fmtMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function AriaStatusStrip({
  state,
  voiceOn,
  queueDepth,
  listening,
  thinking,
  ar,
  pingEndpoint = "/api/public/health",
  className,
}: Props) {
  const [conn, setConn] = useState<Conn>("online");
  const [latency, setLatency] = useState<number | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    const on = () => setConn("online");
    const off = () => setConn("offline");
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      aliveRef.current = false;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Latency probe every 15s — fire and forget.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const ping = async () => {
      const t0 = performance.now();
      try {
        const r = await fetch(pingEndpoint, { method: "GET", cache: "no-store" });
        const dt = performance.now() - t0;
        if (!aliveRef.current) return;
        setLatency(dt);
        setConn(r.status < 500 ? "online" : "offline");
      } catch {
        if (!aliveRef.current) return;
        setLatency(null);
        setConn("offline");
      }
    };
    void ping();
    timer = setInterval(ping, 15_000);
    return () => { if (timer) clearInterval(timer); };
  }, [pingEndpoint]);

  // Visible state label
  const isSpeaking = state === "speaking";
  const stateLabel = ar
    ? listening ? "أستمع" : thinking || state === "thinking" ? "أفكّر" : isSpeaking ? "أتحدّث" : "جاهزة"
    : listening ? "Listening" : thinking || state === "thinking" ? "Thinking" : isSpeaking ? "Speaking" : "Ready";

  const StateIcon = listening ? Mic : (thinking || state === "thinking") ? Brain : isSpeaking ? Radio : Activity;
  const stateTone = listening
    ? "text-cyan-300"
    : thinking || state === "thinking"
      ? "text-violet-300"
      : isSpeaking
        ? "text-sky-300"
        : "text-emerald-300";

  const live = listening || thinking || isSpeaking;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={ar ? "حالة آريا الحيّة" : "ARIA live status"}
      className={cn(
        "flex items-center gap-2 sm:gap-3 rounded-lg border border-cyan-400/20 bg-[#061A2E]/60 px-2 py-1.5 text-[10px] sm:text-[11px]",
        className,
      )}
    >
      {/* Connection */}
      <span className={cn("inline-flex items-center gap-1", conn === "online" ? "text-emerald-300" : "text-rose-300")}>
        {conn === "online" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        <span className="hidden sm:inline">{conn === "online" ? (ar ? "متصلة" : "Connected") : (ar ? "منقطعة" : "Offline")}</span>
        <span className="sr-only">
          {conn === "online" ? (ar ? "الاتصال متاح" : "Connection online") : (ar ? "الاتصال مفقود" : "Connection offline")}
        </span>
      </span>

      <span aria-hidden className="text-white/15">·</span>

      {/* State with subtle pulse when live */}
      <span className={cn("inline-flex items-center gap-1 font-medium", stateTone)}>
        <span className="relative inline-flex h-3 w-3 items-center justify-center">
          <StateIcon className="h-3 w-3" />
          {live && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, currentColor 0%, transparent 70%)",
                opacity: 0.45,
                animation: "aria-status-pulse 1.4s ease-in-out infinite",
              }}
            />
          )}
        </span>
        {stateLabel}
      </span>

      <span aria-hidden className="text-white/15">·</span>

      {/* Queue depth */}
      <span
        className="inline-flex items-center gap-1 text-white/70"
        aria-label={ar ? `عدد الرسائل في الطابور ${queueDepth}` : `Queue depth ${queueDepth}`}
      >
        <ListOrdered className="h-3 w-3" />
        <span className="tabular-nums">{queueDepth}</span>
      </span>

      <span aria-hidden className="text-white/15">·</span>

      {/* Latency */}
      <span
        className={cn(
          "inline-flex items-center gap-1 tabular-nums",
          latency == null ? "text-white/40" : latency < 400 ? "text-emerald-300/80" : latency < 1200 ? "text-amber-300/80" : "text-rose-300/80",
        )}
        aria-label={ar ? `زمن الاستجابة ${fmtMs(latency)}` : `Latency ${fmtMs(latency)}`}
      >
        <Activity className="h-3 w-3" aria-hidden />
        {fmtMs(latency)}
      </span>

      <span aria-hidden className="text-white/15">·</span>

      {/* Voice */}
      <span
        className={cn("inline-flex items-center gap-1", voiceOn ? "text-cyan-200" : "text-white/45")}
        aria-label={voiceOn ? (ar ? "الصوت مفعّل" : "Voice on") : (ar ? "الصوت مكتوم" : "Voice muted")}
      >
        {voiceOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
        <span className="hidden sm:inline">{voiceOn ? (ar ? "صوت" : "Voice") : (ar ? "كتم" : "Muted")}</span>
      </span>

      <style>{`
        @keyframes aria-status-pulse { 0%,100% { transform: scale(1); opacity:.35 } 50% { transform: scale(1.6); opacity:.7 } }
        @media (prefers-reduced-motion: reduce) {
          [role="status"][aria-label*="ARIA"] *, [role="status"][aria-label*="آريا"] * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
