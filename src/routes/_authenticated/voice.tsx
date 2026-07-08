import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/voice")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: VoicePage,
});

function VoicePage() {
  const { t, locale } = useI18n();
  const [connecting, setConnecting] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);

  const conversation = useConversation({
    onConnect: () => toast.success(locale === "ar" ? "متصل" : "Connected"),
    onDisconnect: () => toast.info(locale === "ar" ? "انتهى الاتصال" : "Disconnected"),
    onError: (e) => toast.error(typeof e === "string" ? e : ((e as Error)?.message ?? "Error")),
    onMessage: (msg: { source?: string; message?: string }) => {
      if (msg?.message) setTranscript((t) => [...t, `${msg.source ?? "?"}: ${msg.message}`]);
    },
    overrides: {
      tts: { voiceId: "EXAVITQu4vr4xnSDxMaL" }, // Sarah — female bilingual AR/EN
      agent: {
        language: locale === "ar" ? "ar" : "en",
        firstMessage:
          locale === "ar"
            ? "مرحباً، أنا آريا. كيف أستطيع مساعدتك اليوم؟"
            : "Hello, I'm ARIA. How can I help you today?",
      },
    },
  });

  const start = useCallback(async () => {
    setConnecting(true);
    try {
      const r = await authenticatedFetch("/api/voice-token", { method: "POST" });
      const data = await r.json();
      if (!r.ok || !data.token) throw new Error(data.error ?? "No token");
      await navigator.mediaDevices.getUserMedia({ audio: true });

      if (data.kind === "conversation") {
        await conversation.startSession({
          conversationToken: data.token,
          connectionType: "webrtc",
        });
      } else {
        toast.message(
          locale === "ar"
            ? "أضف ELEVENLABS_AGENT_ID لتفعيل المحادثة الكاملة"
            : "Add ELEVENLABS_AGENT_ID to enable full conversation",
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }, [conversation, locale]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isConnected = conversation.status === "connected";

  return (
    <Section>
      <PageHeader
        icon={Mic}
        title={t("nav.voice")}
        subtitle={
          locale === "ar"
            ? "تحدث مع المساعد الذكي صوتياً بزمن استجابة فوري."
            : "Talk to your AI assistant in real time."
        }
        badge="ElevenLabs"
      />

      <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-border bg-card/60 p-10">
        <div className="relative">
          <div
            className={`flex h-32 w-32 items-center justify-center rounded-full bg-gradient-primary shadow-glow ${isConnected ? "animate-pulse-ring" : ""}`}
          >
            {conversation.isSpeaking ? (
              <Volume2 className="h-12 w-12 text-primary-foreground" />
            ) : isConnected ? (
              <Mic className="h-12 w-12 text-primary-foreground" />
            ) : (
              <MicOff className="h-12 w-12 text-primary-foreground/80" />
            )}
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-semibold">
            {isConnected
              ? conversation.isSpeaking
                ? locale === "ar"
                  ? "المساعد يتحدث..."
                  : "Assistant speaking..."
                : locale === "ar"
                  ? "أستمع إليك..."
                  : "Listening..."
              : locale === "ar"
                ? "جاهز للاتصال"
                : "Ready to connect"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {locale === "ar" ? "الحالة" : "Status"}: {conversation.status}
          </div>
        </div>

        {isConnected ? (
          <Button variant="destructive" onClick={stop}>
            {locale === "ar" ? "إنهاء" : "End call"}
          </Button>
        ) : (
          <Button onClick={start} disabled={connecting}>
            {connecting ? t("common.loading") : locale === "ar" ? "ابدأ المكالمة" : "Start call"}
          </Button>
        )}
      </div>

      {transcript.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {locale === "ar" ? "النص" : "Transcript"}
          </div>
          <div className="space-y-1 text-sm">
            {transcript.map((line, i) => (
              <div key={i} className="text-muted-foreground">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
