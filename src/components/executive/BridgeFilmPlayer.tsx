/**
 * BridgeFilmPlayer — plays the rendered FINN Command-Bridge film when it
 * exists, with the four mandated media states:
 *
 *   loading  — probing whether the film asset is available.
 *   success  — the film is present; a real <video> with its own audio track
 *              (the FINN Layan narration is baked into the render — there is
 *              NO browser TTS anywhere on this path).
 *   empty    — the film has not been rendered yet: an elegant placeholder
 *              (FINN poster) with a clear call to launch the LIVE seven-scene
 *              experience instead of a broken element.
 *   error    — the asset exists but failed to load/decode: retry affordance.
 *
 * The film's audio is self-contained; this component never calls speech
 * synthesis. Bilingual RTL, ≥44px targets, reduced-motion friendly.
 */
import * as React from "react";
import { Play, Film, RefreshCw, AlertTriangle } from "lucide-react";
import { BRIDGE_FILM_POSTER, bridgeCaptionsSrc, bridgeFilmSrc } from "@/lib/bridge-film";

type MediaState = "loading" | "success" | "empty" | "error";

export interface BridgeFilmPlayerProps {
  lang: "ar" | "en";
  /** Launch the live seven-scene experience (used by the empty state). */
  onLaunchLive: () => void;
  className?: string;
}

export function BridgeFilmPlayer({ lang, onLaunchLive, className }: BridgeFilmPlayerProps) {
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";
  const src = bridgeFilmSrc(lang);
  const captions = bridgeCaptionsSrc(lang);
  const [state, setState] = React.useState<MediaState>("loading");
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Probe availability with a HEAD request; a real AbortController lets a
  // retry (or unmount) cancel an in-flight probe so a stale response can't
  // overwrite a newer state.
  const probe = React.useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState("loading");
    fetch(src, { method: "HEAD", signal: controller.signal })
      .then((r) => {
        if (controller.signal.aborted) return;
        // 200 → the film was rendered. Any other status (404 = not produced
        // yet) is the legitimate EMPTY state, not a failure.
        setState(r.ok ? "success" : "empty");
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError"))
          return;
        // A genuine network/decode failure is an ERROR (retryable) — distinct
        // from "film not produced yet" so we never hide a real fault behind
        // the in-production placeholder.
        setState("error");
      });
  }, [src]);

  React.useEffect(() => {
    probe();
    return () => abortRef.current?.abort();
  }, [probe]);

  const shell =
    "relative w-full overflow-hidden rounded-3xl border border-white/10 bg-[#04101c]/80 " +
    (className ?? "");

  if (state === "loading") {
    return (
      <div dir={dir} lang={lang} className={shell} aria-busy="true">
        <div className="flex aspect-video w-full items-center justify-center">
          <span className="h-10 w-10 nx-anim-spin rounded-full border-2 border-white/20 border-t-[#3AE8FF]" />
          <span className="sr-only">{ar ? "جارٍ التحقق من الفيلم…" : "Checking film…"}</span>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div dir={dir} lang={lang} className={shell}>
        <video
          ref={videoRef}
          className="aspect-video w-full bg-black"
          src={src}
          poster={BRIDGE_FILM_POSTER}
          controls
          playsInline
          preload="metadata"
          aria-label={
            ar
              ? "فيلم جسر القيادة التنفيذي بصوت FINN"
              : "Executive Command Bridge film — FINN voice"
          }
          onError={() => setState("error")}
        >
          <track
            kind="captions"
            src={captions}
            srcLang={lang}
            label={ar ? "العربية" : "English"}
            default
          />
        </video>
        {/* A real (text-bearing) live region announces the async result —
            role=status on the player wrapper itself has no text to read. */}
        <span className="sr-only" role="status">
          {ar ? "الفيلم جاهز للتشغيل" : "Film ready to play"}
        </span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div dir={dir} lang={lang} className={shell} role="alert">
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-[#F5A524]" aria-hidden />
          <p className="text-sm text-white/75">
            {ar ? "تعذّر تشغيل الفيلم — أعد المحاولة." : "The film could not play — try again."}
          </p>
          <button
            type="button"
            onClick={() => probe()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-white transition-colors hover:border-[#3AE8FF]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            {ar ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  // empty — the film has not been rendered yet.
  return (
    <div dir={dir} lang={lang} className={shell} role="status">
      <div
        className="flex aspect-video w-full flex-col items-center justify-center gap-4 p-6 text-center"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(4,16,28,0.55), rgba(4,16,28,0.92)), url(${BRIDGE_FILM_POSTER})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.24em] text-white/70">
          <Film className="h-3.5 w-3.5 text-[#3AE8FF]" aria-hidden />
          {ar ? "الفيلم قيد التجهيز" : "Film in production"}
        </span>
        <h3 className="max-w-lg text-lg font-black leading-tight text-white sm:text-xl">
          {ar ? "جسر القيادة التنفيذي — بصوت FINN" : "Executive Command Bridge — narrated by FINN"}
        </h3>
        <p className="max-w-md text-xs leading-relaxed text-white/65 sm:text-sm">
          {ar
            ? "الفيلم السينمائي بصوت FINN يُجهَّز عبر خط إنتاج الصوت والفيديو. حتى ذلك الحين، شغّل التجربة الحية بالمشاهد السبعة والسرد الصوتي."
            : "The FINN-narrated film is being produced. Until then, launch the live seven-scene experience with on-demand voice."}
        </p>
        <button
          type="button"
          onClick={onLaunchLive}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#3AE8FF] px-5 text-sm font-bold text-[#04101c] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Play className="h-4 w-4 fill-current" aria-hidden />
          {ar ? "تشغيل التجربة الحية" : "Launch the live experience"}
        </button>
      </div>
    </div>
  );
}

export default BridgeFilmPlayer;
