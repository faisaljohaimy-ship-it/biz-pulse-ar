/**
 * AriaTourController — Executive Voice Tour layer.
 *
 * Additive-only. Walks an ordered list of section anchors, applies a soft
 * emerald ring, and narrates via ARIA voice (public TTS endpoint). One
 * global audio instance via AriaAudioBus (owner "tour-tts"). Any other ARIA
 * audio source preempts and ends the tour instantly.
 *
 * Dual-field pattern: `display` is UI text, `tts` is fully diacritized text
 * sent to the voice pipeline.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipForward, X } from "lucide-react";
import { AriaAudioBus } from "@/lib/aria/audio-bus";

export type TourLang = "ar" | "en";

export interface TourStop {
  readonly id: string;
  readonly anchorId: string;
  readonly display: string;
  readonly tts: string;
}

interface Props {
  readonly open: boolean;
  readonly lang: TourLang;
  readonly stops: readonly TourStop[];
  readonly onClose: () => void;
}

const HIGHLIGHT_CLASS = "aria-tour-ring";
const SCROLL_OFFSET = 96; // sticky header safe zone
const PREFETCH_HEADROOM_MS = 600;

const audioCache = new Map<string, string>(); // tts text → object URL

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

async function fetchClip(text: string): Promise<string | null> {
  const cached = audioCache.get(text);
  if (cached) return cached;
  try {
    const res = await fetch("/api/public/aria-tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("audio/")) return null;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    audioCache.set(text, url);
    return url;
  } catch {
    return null;
  }
}

function scrollToAnchor(id: string, reduced: boolean): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById(id);
  if (!el) return null;
  const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
  window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  return el;
}

function applyRing(el: HTMLElement | null, reduced: boolean) {
  if (!el) return;
  el.classList.add(HIGHLIGHT_CLASS);
  if (reduced) el.classList.add("aria-tour-ring--static");
}
function clearRing(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove(HIGHLIGHT_CLASS);
  el.classList.remove("aria-tour-ring--static");
}
function clearAllRings() {
  if (typeof document === "undefined") return;
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((n) => {
    n.classList.remove(HIGHLIGHT_CLASS);
    n.classList.remove("aria-tour-ring--static");
  });
}

export function AriaTourController({ open, lang, stops, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeElRef = useRef<HTMLElement | null>(null);
  const abortRef = useRef<{ token: number }>({ token: 0 });
  const reduced = useMemo(prefersReducedMotion, [open]);
  const ar = lang === "ar";

  const stopAudio = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      try { a.pause(); } catch { /* noop */ }
      audioRef.current = null;
    }
  }, []);

  const endTour = useCallback(() => {
    abortRef.current.token += 1;
    stopAudio();
    AriaAudioBus.release("tour-tts");
    clearRing(activeElRef.current);
    clearAllRings();
    activeElRef.current = null;
    setPaused(false);
    setIndex(0);
    onClose();
  }, [onClose, stopAudio]);

  // Kill the tour if any other ARIA source takes the bus (chat, greeting).
  useEffect(() => {
    if (!open) return;
    const unsub = AriaAudioBus.subscribe((e) => {
      if (e.kind === "start" && e.source !== "tour-tts") {
        endTour();
      }
    });
    const onAriaOpen = () => endTour();
    const onHide = () => endTour();
    window.addEventListener("aria:open", onAriaOpen);
    window.addEventListener("pagehide", onHide);
    return () => {
      unsub();
      window.removeEventListener("aria:open", onAriaOpen);
      window.removeEventListener("pagehide", onHide);
    };
  }, [open, endTour]);

  // Cleanup on unmount / close.
  useEffect(() => {
    if (!open) {
      stopAudio();
      clearAllRings();
    }
    return () => { stopAudio(); clearAllRings(); };
  }, [open, stopAudio]);

  // Advance through stops.
  useEffect(() => {
    if (!open) return;
    if (index >= stops.length) { endTour(); return; }

    const token = ++abortRef.current.token;
    const stop = stops[index];

    // Preempt any other audio and take ownership.
    AriaAudioBus.unlock();
    const granted = AriaAudioBus.acquire("tour-tts", () => {
      // Preempted from outside — end.
      abortRef.current.token += 1;
      stopAudio();
      clearRing(activeElRef.current);
    });
    if (!granted) { endTour(); return; }

    // Scroll + highlight
    clearRing(activeElRef.current);
    const el = scrollToAnchor(stop.anchorId, reduced);
    activeElRef.current = el;
    applyRing(el, reduced);

    let cancelled = false;
    void (async () => {
      const url = await fetchClip(stop.tts);
      if (cancelled || token !== abortRef.current.token) return;

      const audio = new Audio(url ?? undefined);
      audioRef.current = audio;
      audio.onended = () => {
        if (token !== abortRef.current.token) return;
        AriaAudioBus.notifyStopped("tour-tts");
        setIndex((i) => i + 1);
      };
      audio.onerror = () => {
        if (token !== abortRef.current.token) return;
        AriaAudioBus.notifyStopped("tour-tts");
        setIndex((i) => i + 1);
      };
      audio.onplaying = () => AriaAudioBus.notifyPlaying("tour-tts", audio);

      if (paused || !url) {
        // If paused before starting or no clip returned, still advance after
        // a short delay so the tour doesn't stall.
        if (!url) {
          window.setTimeout(() => {
            if (token === abortRef.current.token) setIndex((i) => i + 1);
          }, 2500);
        }
        return;
      }
      try { await audio.play(); } catch { /* autoplay may fail */ }

      // Prefetch next clip while this one plays.
      const next = stops[index + 1];
      if (next) {
        window.setTimeout(() => { void fetchClip(next.tts); }, PREFETCH_HEADROOM_MS);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, stops, reduced]);

  // Pause/resume without restarting audio.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (paused) { try { a.pause(); } catch { /* noop */ } }
    else { void a.play().catch(() => { /* noop */ }); }
  }, [paused]);

  if (!open) return null;

  const current = stops[index];
  const label = {
    pause: ar ? "إيقاف مؤقت" : "Pause",
    resume: ar ? "متابعة" : "Resume",
    next: ar ? "التالي" : "Next",
    end: ar ? "إنهاء الجولة" : "End tour",
    counter: ar ? `${index + 1} من ${stops.length}` : `${index + 1} of ${stops.length}`,
  };

  return (
    <>
      {/* Ring style (scoped, additive) */}
      <style>{`
        .${HIGHLIGHT_CLASS} {
          position: relative;
          transition: box-shadow 420ms ease, outline-color 420ms ease;
          outline: 2px solid rgba(52, 211, 153, 0.55);
          outline-offset: 6px;
          box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.14), 0 0 46px rgba(16, 185, 129, 0.28);
          border-radius: 18px;
          animation: aria-tour-pulse 2600ms ease-in-out infinite;
        }
        .${HIGHLIGHT_CLASS}--static { animation: none !important; }
        @keyframes aria-tour-pulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.12), 0 0 40px rgba(16, 185, 129, 0.22); }
          50%      { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.20), 0 0 62px rgba(16, 185, 129, 0.38); }
        }
        @media (prefers-reduced-motion: reduce) {
          .${HIGHLIGHT_CLASS} { animation: none !important; }
        }
      `}</style>

      {/* Floating pill — bottom center, thumb-reachable on mobile */}
      <div
        role="toolbar"
        aria-label={ar ? "تحكم الجولة الصوتية" : "Voice tour controls"}
        dir={ar ? "rtl" : "ltr"}
        className="fixed inset-x-0 z-[70] flex justify-center px-3"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="pointer-events-auto flex max-w-[92vw] items-center gap-2 rounded-full border border-emerald-400/40 bg-[#04111f]/95 px-3 py-2 text-white shadow-[0_10px_40px_rgba(16,185,129,0.25)] backdrop-blur-xl">
          <span className="hidden max-w-[38ch] truncate text-xs text-white/75 sm:inline">
            {current?.display}
          </span>
          <span className="mx-1 hidden text-[10px] uppercase tracking-[0.2em] text-emerald-300/80 sm:inline">
            {label.counter}
          </span>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            aria-label={paused ? label.resume : label.pause}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              abortRef.current.token += 1;
              stopAudio();
              setIndex((i) => i + 1);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            aria-label={label.next}
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={endTour}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/45 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
          >
            <X className="h-3.5 w-3.5" />
            <span>{label.end}</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default AriaTourController;
