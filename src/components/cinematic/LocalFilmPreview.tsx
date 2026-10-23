import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  hasDecodedVideoFrame,
  hasMp4FileType,
  localMp4Problem,
} from "@/lib/cinematic/mp4-validation";
import "@/styles/sadeed-film-preview.css";

type Phase = "idle" | "checking" | "selected" | "decoded" | "error";

/** Device-only preview. Never uploads media, requests a provider, or labels it live. */
export function LocalFilmPreview({ onPlaybackStart }: { onPlaybackStart?: () => void }) {
  const id = useId();
  const [source, setSource] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const player = useRef<HTMLVideoElement>(null);
  const activeUrl = useRef<string | null>(null);
  const generation = useRef(0);

  const release = () => {
    if (player.current) {
      player.current.pause();
      player.current.removeAttribute("src");
      player.current.load();
    }
    if (activeUrl.current) URL.revokeObjectURL(activeUrl.current);
    activeUrl.current = null;
  };

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState === "hidden") player.current?.pause();
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      generation.current += 1;
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      if (activeUrl.current) URL.revokeObjectURL(activeUrl.current);
    };
  }, []);

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = ""; // The same file can be retried after a decoder error.
    if (!file) return;
    const current = ++generation.current;
    release();
    setSource(null);
    setPhase("checking");
    setMessage("");
    const problem = localMp4Problem(file);
    if (problem) {
      setPhase("error");
      setMessage(
        problem === "file_too_large"
          ? "الحد الأقصى للمعاينة المحلية 200 ميجابايت."
          : "اختر ملف MP4 غير فارغ من جهازك.",
      );
      return;
    }
    try {
      const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
      if (current !== generation.current) return;
      if (!hasMp4FileType(header)) {
        setPhase("error");
        setMessage("لم يُتعرف على حاوية MP4 قياسية؛ تغيير امتداد الملف لا يحوله إلى فيديو.");
        return;
      }
      const url = URL.createObjectURL(file);
      activeUrl.current = url;
      setSource(url);
      setPhase("selected");
      setMessage("تم اختيار الملف. اضغط تشغيل للتحقق من فك أول إطار فيديو.");
    } catch {
      if (current !== generation.current) return;
      setPhase("error");
      setMessage("تعذر قراءة الملف محليًا. جرّب نسخة MP4 أخرى.");
    }
  };

  return (
    <section className="sd-film-preview" aria-labelledby={`${id}-title`} data-film-phase={phase}>
      <div className="sd-film-preview-heading">
        <div>
          <h2 id={`${id}-title`}>معاينة فيديو MP4 حقيقي</h2>
          <p>اختر ملفًا تملكه أو لديك إذن باستخدامه. يبقى على جهازك ولا يُرفع إلى الخادم.</p>
        </div>
        <label className="sd-film-picker">
          <span>اختيار ملف MP4</span>
          <input
            type="file"
            accept="video/mp4,.mp4"
            onChange={(event) => void selectFile(event)}
            aria-label="اختيار ملف MP4 للمعاينة المحلية"
          />
        </label>
        {source && (
          <button
            type="button"
            className="sd-cinema-control"
            onClick={() => {
              generation.current += 1;
              release();
              setSource(null);
              setPhase("idle");
              setMessage("");
            }}
          >
            إغلاق المعاينة
          </button>
        )}
      </div>
      <p role={phase === "error" ? "alert" : "status"} aria-live="polite">
        {phase === "checking" ? "جارٍ التحقق من الملف محليًا…" : message}
      </p>
      {source && (
        <video
          key={source}
          ref={player}
          src={source}
          controls
          playsInline
          preload="metadata"
          onPlay={onPlaybackStart}
          className="sd-film-video"
          aria-label="فيديو محلي مسجل — ليس بثًا حيًا"
          onLoadedData={(event) => {
            if (source !== activeUrl.current) return;
            if (hasDecodedVideoFrame(event.currentTarget)) {
              setPhase("decoded");
              setMessage(
                "فُك أول إطار فيديو بنجاح على هذا الجهاز. هذه معاينة محلية وليست نشرًا للإنتاج.",
              );
            } else {
              setPhase("error");
              setMessage("لم يثبت وجود إطار فيديو قابل للعرض؛ قد يكون الملف صوتيًا أو غير مدعوم.");
            }
          }}
          onError={() => {
            if (source !== activeUrl.current) return;
            setPhase("error");
            setMessage("تعذر فك الفيديو في هذا المتصفح. جرّب MP4 بترميز H.264 متوافق مع جهازك.");
          }}
        />
      )}
      <p className="sd-cinema-disclosure">
        ملف مسجل مستقل عن موشن الصفحة وبيانات التوأم الرقمي. لا يثبت اتصال كاميرا، ولا يُنشر
        تلقائيًا.
      </p>
    </section>
  );
}
