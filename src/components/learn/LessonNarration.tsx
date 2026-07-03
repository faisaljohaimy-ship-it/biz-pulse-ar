/**
 * LessonNarration — plays the executive narration script via ElevenLabs TTS.
 * Reuses /api/tts (bearer-authed, rate-limited).
 */
import { useEffect, useRef, useState } from "react";
import { Volume2, Loader2, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  text: string;
  lang: "ar" | "en";
}

export function LessonNarration({ text, lang }: Props) {
  const ar = lang === "ar";
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    audioRef.current?.pause();
  }, []);

  async function play() {
    if (playing && audioRef.current) { audioRef.current.pause(); setPlaying(false); return; }
    if (audioRef.current && urlRef.current) {
      await audioRef.current.play(); setPlaying(true); return;
    }
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error(ar ? "الرجاء تسجيل الدخول" : "Please sign in");
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text, preserveDiacritics: ar, stability: 0.55, style: 0.3, speed: 1.0 }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => setPlaying(false);
      await a.play();
      setPlaying(true);
    } catch (e) {
      toast.error((e as Error).message || (ar ? "تعذّر تشغيل السرد" : "Narration failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={play}
      disabled={loading || !text}
      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 transition-colors hover:bg-cyan-400/20 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      {loading ? (ar ? "جاري توليد السرد…" : "Generating narration…") : playing ? (ar ? "إيقاف" : "Pause") : (ar ? "استمع لآريا تسرد الحصة" : "Hear ARIA narrate the lesson")}
    </button>
  );
}
