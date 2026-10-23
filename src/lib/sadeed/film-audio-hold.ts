/**
 * ما يُسكت صوت الأفلام من خارجها — **مصدرٌ واحد** لفيلم البانر (`HomeBrandRow`) وفيلم التوأم
 * (`TwinFilmPlayer`): لوحة سَدِيد مفتوحة، و«إيقاف الحركة»، وتبويبٌ مخفيّ، وسَدِيد ينطق أو يُصغي
 * (ناقل الصوت الواحد `SadeedAudioBus`: كل صوتٍ لسَدِيد يمرّ به، وحالة حضوره). فلا يتكلّم فيلمٌ فوق
 * سَدِيد ولا فوق لوحته.
 */
import { SadeedAudioBus } from "@/lib/sadeed/audio-bus";
import { sadeedState } from "@/lib/sadeed/sadeed-state";
import { MOTION_PAUSED_ATTR, SADEED_PANEL_ATTR } from "@/components/home/HoloVideoEngine";

export function filmAudioHeld(): boolean {
  const root = document.documentElement;
  const presence = sadeedState.get();
  return (
    root.getAttribute(SADEED_PANEL_ATTR) === "open" ||
    root.getAttribute(MOTION_PAUSED_ATTR) === "1" ||
    document.visibilityState === "hidden" ||
    SadeedAudioBus.currentSource() !== null ||
    presence === "speaking" ||
    presence === "listening"
  );
}

/** ما يستمع إليه من يتبع `filmAudioHeld`: ناقل الصوت وحضور سَدِيد وسمتا الجذر وظهور التبويب. */
export function watchFilmAudioHold(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [SADEED_PANEL_ATTR, MOTION_PAUSED_ATTR],
  });
  document.addEventListener("visibilitychange", onChange);
  const stopBus = SadeedAudioBus.subscribe(onChange);
  const stopPresence = sadeedState.subscribe(onChange);
  return () => {
    observer.disconnect();
    document.removeEventListener("visibilitychange", onChange);
    stopBus();
    stopPresence();
  };
}
