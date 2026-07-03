// Nexios Audio Bus — the single source of truth for tour/aria narration.
// Only ONE HTMLAudioElement instance across the app for narration.
// Emits `nexios:audio-claim` when speak() begins and `nexios:audio-release`
// when it stops so any competing media (greeting video, chat TTS) can mute.
import type { TourLang } from "./tour.types";

const CLAIM_EVENT = "nexios:audio-claim";
const RELEASE_EVENT = "nexios:audio-release";

type SpeakResolver = () => void;

class AudioBusImpl {
  private el: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private token = 0;
  private currentResolver: SpeakResolver | null = null;
  private muted = false;
  private hiddenBound = false;

  private ensureEl(): HTMLAudioElement {
    if (typeof window === "undefined") throw new Error("AudioBus: no window");
    if (!this.el) {
      const a = new Audio();
      a.preload = "auto";
      a.crossOrigin = "anonymous";
      this.el = a;
    }
    if (!this.hiddenBound) {
      this.hiddenBound = true;
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) this.stop();
      });
    }
    return this.el;
  }

  isBusy(): boolean {
    const a = this.el;
    return !!a && !a.paused && !a.ended;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.el) this.el.muted = m;
  }

  isMuted() {
    return this.muted;
  }

  stop(): void {
    const a = this.el;
    if (a) {
      try { a.pause(); a.currentTime = 0; } catch { /* noop */ }
    }
    if (this.currentUrl) {
      try { URL.revokeObjectURL(this.currentUrl); } catch { /* noop */ }
      this.currentUrl = null;
    }
    const r = this.currentResolver;
    this.currentResolver = null;
    this.token++;
    if (r) r();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(RELEASE_EVENT));
    }
  }

  async speak(text: string, _lang: TourLang): Promise<void> {
    if (typeof window === "undefined") return;
    if (!text.trim()) return;

    // Cancel prior playback synchronously.
    this.stop();

    const myToken = ++this.token;
    const a = this.ensureEl();
    a.muted = this.muted;

    // Claim audio channel — competing players should mute themselves.
    window.dispatchEvent(new CustomEvent(CLAIM_EVENT));

    let blobUrl: string | null = null;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (myToken !== this.token) return; // superseded
      if (!res.ok) throw new Error(`tts ${res.status}`);
      const blob = await res.blob();
      if (myToken !== this.token) return;
      blobUrl = URL.createObjectURL(blob);
      this.currentUrl = blobUrl;
      a.src = blobUrl;
    } catch {
      // Silent failure — resolve immediately so tour advances.
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      if (myToken === this.token) {
        this.currentUrl = null;
        window.dispatchEvent(new CustomEvent(RELEASE_EVENT));
      }
      return;
    }

    await new Promise<void>((resolve) => {
      this.currentResolver = resolve;
      const cleanup = () => {
        a.removeEventListener("ended", onEnd);
        a.removeEventListener("error", onEnd);
      };
      const onEnd = () => {
        if (myToken !== this.token) { cleanup(); return; }
        cleanup();
        if (this.currentUrl) {
          try { URL.revokeObjectURL(this.currentUrl); } catch { /* noop */ }
          this.currentUrl = null;
        }
        const r = this.currentResolver;
        this.currentResolver = null;
        window.dispatchEvent(new CustomEvent(RELEASE_EVENT));
        if (r) r();
      };
      a.addEventListener("ended", onEnd);
      a.addEventListener("error", onEnd);
      a.play().catch(() => onEnd());
    });
  }
}

export const audioBus = new AudioBusImpl();
export const AUDIO_CLAIM_EVENT = CLAIM_EVENT;
export const AUDIO_RELEASE_EVENT = RELEASE_EVENT;
