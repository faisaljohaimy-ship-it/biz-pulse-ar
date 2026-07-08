import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { Volume2, Download, Loader2, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/auth-fetch";

// ARIA voice is HARD-LOCKED to Layan (gVzwmdZzRgBrNjXaTmi5) server-side.
// This dev tool only exposes the canonical voice — the server ignores any
// `voiceId` in the request body regardless of what is sent from here.
const VOICES = [{ id: "gVzwmdZzRgBrNjXaTmi5", label: "Layan — ARIA canonical (locked)" }];

const TASHKEEL = "\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652";
const SAMPLE_AR =
  "دَخَلَ الْمُدِيرُ الِاجْتِمَاعَ، وَأَلْقَى كَلِمَةً مُوجَزَةً عَنْ خُطَّةِ التَّحَوُّلِ الرَّقْمِيِّ، ثُمَّ غَادَرَ الْقَاعَةَ.";

export const Route = createFileRoute("/_authenticated/tts")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: TtsPage,
});

function TtsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [text, setText] = useState(SAMPLE_AR);
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [preserve, setPreserve] = useState(true);
  const [stability, setStability] = useState(0.55);
  const [style, setStyle] = useState(0.3);
  const [speed, setSpeed] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const harakatCount = useMemo(
    () => Array.from(text).filter((c) => TASHKEEL.includes(c)).length,
    [text],
  );

  const synthesize = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const r = await authenticatedFetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceId,
          preserveDiacritics: preserve,
          stability,
          style,
          speed,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: r.statusText }));
        throw new Error(err.error ?? "TTS failed");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      setTimeout(() => audioRef.current?.play().catch(() => {}), 50);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "TTS error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section>
      <PageHeader
        icon={Volume2}
        title={ar ? "تحويل النص إلى صوت" : "Text to Speech"}
        subtitle={
          ar
            ? "نطق عربي فصيح مع دعم كامل للتشكيل (الحركات والشدّة والتنوين والسكون)."
            : "Studio-grade speech with full Arabic diacritics (tashkeel) support."
        }
        badge="ElevenLabs · Multilingual v2"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 rounded-2xl border border-border bg-card/60 p-5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {ar ? "النص" : "Text"}
            </Label>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{text.length} / 5000</span>
              <span className="flex items-center gap-1 text-primary">
                <Sparkles className="h-3 w-3" />
                {harakatCount} {ar ? "حركة" : "harakat"}
              </span>
            </div>
          </div>
          <Textarea
            dir="auto"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="font-arabic text-lg leading-loose"
            placeholder={ar ? "اكتب نصًا عربيًا مُشكَّلًا..." : "Type Arabic text with tashkeel..."}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setText(SAMPLE_AR)}>
              {ar ? "مثال مُشكَّل" : "Sample (diacritized)"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setText(text.replace(new RegExp(`[${TASHKEEL}\u0670\u0671]`, "g"), ""))
              }
            >
              {ar ? "إزالة التشكيل" : "Strip tashkeel"}
            </Button>
            <div className="ms-auto flex items-center gap-2">
              <Button onClick={synthesize} disabled={loading || !text.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
                {ar ? "تحويل وتشغيل" : "Synthesize"}
              </Button>
              {audioUrl && (
                <Button asChild variant="secondary" size="icon">
                  <a href={audioUrl} download="tts.mp3" aria-label="Download">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {audioUrl && <audio ref={audioRef} src={audioUrl} controls className="w-full" />}
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card/60 p-5">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {ar ? "الصوت" : "Voice"}
            </Label>
            <Select value={voiceId} onValueChange={setVoiceId}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">
                {ar ? "النطق الفصيح المُشكَّل" : "Preserve diacritics"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {ar
                  ? "يحافظ على الفتحة والضمة والكسرة والتنوين والشدّة والسكون"
                  : "Keep fatha, damma, kasra, tanwin, shadda, sukun"}
              </p>
            </div>
            <Switch checked={preserve} onCheckedChange={setPreserve} />
          </div>

          <SliderRow
            label={ar ? "الثبات" : "Stability"}
            value={stability}
            onChange={setStability}
          />
          <SliderRow label={ar ? "النمط التعبيري" : "Style"} value={style} onChange={setStyle} />
          <SliderRow
            label={ar ? "السرعة" : "Speed"}
            value={speed}
            min={0.7}
            max={1.2}
            step={0.05}
            onChange={setSpeed}
          />
        </div>
      </div>
    </Section>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
        <span className="text-xs font-mono text-foreground">{value.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}
