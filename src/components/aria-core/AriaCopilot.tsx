/**
 * AriaCopilot — the ONE ARIA UI. Renders both the floating launcher and
 * the dockable copilot panel. Consumes the singleton `useChat` from the
 * `<AriaProvider>` so state persists across every route change.
 *
 * Panel layout (Objective 1): ARIA fills the entire panel as a cinematic
 * background layer (video → still, object-contain top-center, full figure
 * always visible). Chat floats above her with backdrop blur and readability
 * scrims. Mobile: near-fullscreen. Desktop: fixed width, full height.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, RefreshCcw, Send, Sparkles, X } from "lucide-react";
import { useAriaChat } from "@/lib/aria-core/provider";
import { useAriaStore } from "@/lib/aria-core/store";
import { pingChat } from "@/lib/aria-core/services/aria-service";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExecutiveCard } from "./ExecutiveCard";

const EMPTY_STATE_AR = "لا توجد بيانات مباشرة حاليًا";
const ERROR_MASK_AR =
  "تعذّر إكمال الطلب حاليًا. تم تسجيل المحاولة وستُعاد المعالجة تلقائيًا.";
const CONNECTION_ERROR_AR = "تعذّر الاتصال — أعد المحاولة";
const THINKING_AR = "آريا تفكّر…";

const GREETING_SRC = "/aria-greeting.mp4";
const STILL_SRC = "/aria.png";
const VOICE_OK_KEY = "aria-panel-voice-ok";

function sanitiseAssistantText(raw: string): string {
  if (!raw) return "";
  let t = raw;
  t = t.replace(/```json[\s\S]*?```/gi, "").replace(/```[\s\S]*?```/g, (m) =>
    /error|stack|trace|traceback/i.test(m) ? "" : m,
  );
  t = t.replace(/\b(openai|anthropic|google|xai|mistral|gpt-\d[\w.-]*|claude-\d[\w.-]*|gemini[\w.-]*|grok[\w.-]*)\b/gi, "");
  t = t.replace(/\bat\s+[\w$.<>]+\s*\([^)]*:\d+:\d+\)/g, "");
  t = t.replace(/\berror:\s*[^\n]{0,200}/gi, ERROR_MASK_AR);
  return t.trim();
}

/** Full-panel ARIA backdrop — greeting video every panel-open, then still.
 *  Attempts audible playback; falls back to a tap-to-listen chip when the
 *  browser blocks unmuted autoplay. Hard-stops on panel close. */
function AriaPanelBackdrop({ active }: { active: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mode, setMode] = useState<"video" | "still">("still");
  const [needsTap, setNeedsTap] = useState(false);

  // Panel-open: (re)start greeting every time. prefers-reduced-motion → still.
  useEffect(() => {
    if (!active) {
      // Panel closed → hard stop
      const v = videoRef.current;
      if (v) { try { v.pause(); v.currentTime = 0; } catch { /* noop */ } }
      setMode("still");
      setNeedsTap(false);
      return;
    }
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(reduced ? "still" : "video");
  }, [active]);

  useEffect(() => {
    if (mode !== "video" || !active) return;
    const v = videoRef.current;
    if (!v) return;
    const toStill = () => setMode("still");
    v.addEventListener("ended", toStill);
    v.addEventListener("error", toStill);
    const timeout = setTimeout(() => {
      if (v.readyState < 2) toStill();
    }, 4000);

    // Try audible first if user previously approved; else muted autoplay
    // and offer a tap chip to enable sound.
    const voiceOk = (() => {
      try { return localStorage.getItem(VOICE_OK_KEY) === "1"; } catch { return false; }
    })();
    v.muted = !voiceOk;
    v.volume = 1;
    v.play()
      .then(() => { if (!v.muted) setNeedsTap(false); else setNeedsTap(true); })
      .catch(() => {
        // Autoplay blocked entirely — fall back to muted play + chip.
        v.muted = true;
        v.play().then(() => setNeedsTap(true)).catch(toStill);
      });

    return () => {
      v.removeEventListener("ended", toStill);
      v.removeEventListener("error", toStill);
      clearTimeout(timeout);
    };
  }, [mode, active]);

  const enableVoice = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    v.play().then(() => {
      try { localStorage.setItem(VOICE_OK_KEY, "1"); } catch { /* noop */ }
      setNeedsTap(false);
    }).catch(() => { /* leave chip visible */ });
  };

  return (
    <div
      aria-hidden={!needsTap}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ background: "#04070F" }}
    >
      {/* Cyan radial glow behind her */}
      <div
        className="absolute left-1/2 top-[38%] h-[70%] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(56,225,255,0.18) 0%, rgba(0,212,255,0.08) 45%, transparent 75%)",
          filter: "blur(24px)",
        }}
      />
      {/* ARIA figure — full height, contained, top-anchored so face is always visible */}
      {mode === "video" ? (
        <video
          ref={videoRef}
          src={GREETING_SRC}
          poster={STILL_SRC}
          playsInline
          autoPlay
          preload="auto"
          className="absolute inset-0 h-full w-full opacity-95"
          style={{ objectFit: "contain", objectPosition: "center top" }}
          onError={() => setMode("still")}
        />
      ) : (
        <img
          src={STILL_SRC}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full opacity-90 select-none"
          style={{ objectFit: "contain", objectPosition: "center top" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}
      {/* Readability scrims */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(4,7,15,0.60) 0%, rgba(4,7,15,0.30) 40%, rgba(4,7,15,0.75) 78%, rgba(4,7,15,0.94) 100%)",
        }}
      />
      {/* Tap-to-listen chip — pointer-events on ONLY when needed */}
      {needsTap && mode === "video" && (
        <button
          type="button"
          onClick={enableVoice}
          className="pointer-events-auto absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-cyan-400/40 bg-black/60 px-4 py-1.5 text-xs text-cyan-200 backdrop-blur-md hover:bg-black/80"
        >
          🔊 اضغط للاستماع
        </button>
      )}
    </div>
  );
}

export function AriaCopilot() {
  const { chat, composerRef } = useAriaChat();
  const mode = useAriaStore((s) => s.mode);
  const voice = useAriaStore((s) => s.voice);
  const voiceEnabled = useAriaStore((s) => s.voiceEnabled);
  const pageContext = useAriaStore((s) => s.pageContext);
  const setMode = useAriaStore((s) => s.setMode);
  const setVoiceEnabled = useAriaStore((s) => s.setVoiceEnabled);

  const [draft, setDraft] = useState("");
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isOpen = mode !== "collapsed";
  const isBusy = chat.status === "submitted" || chat.status === "streaming";
  const hasError = chat.status === "error" || !!chat.error;

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat.messages, isOpen, isBusy, hasError]);

  const submit = (textOverride?: string) => {
    const text = (textOverride ?? draft).trim();
    if (!text || isBusy) return;
    setDraft("");
    setLastUserText(text);
    void chat.sendMessage({ text });
  };

  const retry = () => {
    if (lastUserText) submit(lastUserText);
  };

  const statusLabel = useMemo(() => {
    switch (voice) {
      case "processing":
        return THINKING_AR;
      case "speaking":
        return "ARIA is speaking…";
      case "listening":
        return "Listening…";
      default:
        return pageContext ? `Context · ${pageContext.label}` : "Ready";
    }
  }, [voice, pageContext]);

  return (
    <>
      {/* Launcher FAB — hidden while docked */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setMode("docked")}
          aria-label="Open ARIA"
          className={cn(
            "fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center",
            "rounded-full border border-primary/40 bg-card/80 text-primary shadow-lg backdrop-blur-xl",
            "transition-all hover:scale-105 hover:border-primary hover:shadow-primary/30",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
          )}
        >
          <Sparkles className="h-6 w-6" aria-hidden />
          <span
            className={cn(
              "absolute inset-0 rounded-full",
              isBusy && "animate-pulse ring-2 ring-primary/50",
            )}
            aria-hidden
          />
        </button>
      )}

      {/* Dock */}
      {isOpen && (
        <aside
          role="complementary"
          aria-label="ARIA executive copilot"
          dir="rtl"
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden border border-primary/25",
            "shadow-2xl",
            // Mobile: near-fullscreen. Desktop (sm+): docked, full height.
            "inset-x-2 top-14 bottom-2 rounded-3xl",
            "sm:inset-auto sm:end-6 sm:top-6 sm:bottom-6 sm:w-[min(96vw,420px)] sm:rounded-2xl",
          )}
          style={{
            boxShadow:
              "0 20px 60px -20px hsl(var(--primary) / 0.4), 0 0 0 1px hsl(var(--primary) / 0.1)",
          }}
        >
          {/* LAYER 0 — ARIA cinematic backdrop */}
          <AriaPanelBackdrop active={isOpen} />

          {/* LAYER 2 — Header */}
          <header className="relative z-10 flex items-center gap-3 border-b border-primary/15 bg-background/30 px-4 py-3 backdrop-blur-sm">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" aria-hidden />
              <span
                className={cn(
                  "absolute inset-0 rounded-full ring-1 ring-primary/40",
                  isBusy && "animate-ping",
                )}
                aria-hidden
              />
            </div>
            <div className="flex flex-1 flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">ARIA</span>
              <span className="text-[11px] text-muted-foreground">{statusLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              aria-pressed={voiceEnabled}
              aria-label={voiceEnabled ? "Mute ARIA voice" : "Enable ARIA voice"}
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              {voiceEnabled ? <Mic className="h-4 w-4" aria-hidden /> : <MicOff className="h-4 w-4" aria-hidden />}
            </button>
            <button
              type="button"
              onClick={() => setMode("collapsed")}
              aria-label="Close ARIA"
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          {/* LAYER 3 — Messages (transparent so backdrop shows through) */}
          <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-4">
            <ul className="space-y-3">
              {chat.messages.map((m) => {
                const raw = m.parts
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("");
                const mine = m.role === "user";
                const text = mine ? raw : sanitiseAssistantText(raw);
                if (!text) return null;
                return (
                  <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-md backdrop-blur-md",
                        mine
                          ? "bg-primary/90 text-primary-foreground"
                          : "bg-background/60 text-foreground ring-1 ring-primary/20",
                      )}
                    >
                      <div className="prose prose-sm prose-invert max-w-none break-words">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                      </div>
                    </div>
                  </li>
                );
              })}
              {isBusy && (
                <li className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-background/60 px-3 py-2 backdrop-blur-md ring-1 ring-primary/20">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">{THINKING_AR}</span>
                  </div>
                </li>
              )}
              {hasError && !isBusy && (
                <li className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl bg-destructive/15 px-3 py-2 text-sm text-destructive-foreground ring-1 ring-destructive/50 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <span>{CONNECTION_ERROR_AR}</span>
                      <button
                        type="button"
                        onClick={retry}
                        className="inline-flex items-center gap-1 rounded-md bg-destructive/80 px-2 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive"
                      >
                        <RefreshCcw className="h-3 w-3" /> إعادة المحاولة
                      </button>
                    </div>
                  </div>
                </li>
              )}
              {!isBusy && !hasError && chat.messages.length === 0 && (
                <li className="rounded-xl border border-dashed border-primary/20 bg-background/40 px-3 py-6 text-center text-xs text-muted-foreground backdrop-blur-md">
                  {EMPTY_STATE_AR}
                </li>
              )}
            </ul>
          </div>

          <div className="relative z-10">
            <ExecutiveCard />
          </div>

          {/* LAYER 4 — Composer, pinned bottom + safe-area */}
          <form
            className="relative z-10 flex items-end gap-2 border-t border-primary/15 bg-background/40 p-3 backdrop-blur-md"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <textarea
              ref={composerRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="اسأل آريا…"
              aria-label="Ask ARIA"
              className={cn(
                "min-h-[38px] max-h-32 flex-1 resize-none rounded-lg border border-primary/20",
                "bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
              )}
            />
            <button
              type="submit"
              disabled={isBusy || !draft.trim()}
              aria-label="Send"
              className={cn(
                "grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground",
                "transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
