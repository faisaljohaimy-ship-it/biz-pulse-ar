import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createThread, deleteThread, getThreadMessages, listThreads } from "@/lib/threads.functions";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, MessageSquare, Sparkles, Send, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useAriaVoice } from "@/lib/aria-voice";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ToolInvocation } from "@/components/ai-elements/tool-invocation";
import { CitationsPanel, type CitationItem, type CoverageInfo } from "@/components/aria/CitationsPanel";


export const Route = createFileRoute("/_authenticated/assistant/$threadId")({
  component: AssistantThread,
});

function AssistantThread() {
  const { threadId } = useParams({ from: "/_authenticated/assistant/$threadId" });
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const del = useServerFn(deleteThread);
  const getMessages = useServerFn(getThreadMessages);

  const threadsQ = useQuery({ queryKey: ["threads"], queryFn: () => list() });
  const messagesQ = useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => getMessages({ data: { threadId } }),
  });

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Threads list */}
      <aside className="hidden w-72 shrink-0 flex-col border-e border-border bg-card/40 md:flex">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{t("assistant.threads")}</h2>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={async () => {
              const newT = await create({ data: {} });
              await qc.invalidateQueries({ queryKey: ["threads"] });
              navigate({ to: "/assistant/$threadId", params: { threadId: newT.id } });
            }}
            title={t("assistant.new")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {(threadsQ.data ?? []).map((th) => (
            <div
              key={th.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                threadId === th.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              <Link
                to="/assistant/$threadId"
                params={{ threadId: th.id }}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{th.title}</span>
              </Link>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  await del({ data: { id: th.id } });
                  await qc.invalidateQueries({ queryKey: ["threads"] });
                  if (threadId === th.id) navigate({ to: "/assistant", replace: true });
                }}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                title={t("assistant.delete")}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        {messagesQ.isLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">...</div>
        ) : messagesQ.error ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-destructive" role="alert">
            {messagesQ.error instanceof Error ? messagesQ.error.message : "ARIA messages could not load."}
          </div>
        ) : (
          <ChatWindow key={threadId} threadId={threadId} initialMessages={(messagesQ.data ?? []) as unknown as UIMessage[]} />
        )}
      </div>
    </div>
  );
}

const MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro" },
  { id: "openai/gpt-5-mini", label: "GPT-5 mini" },
  { id: "openai/gpt-5", label: "GPT-5" },
];

const makeRequestId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `aria-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function ChatWindow({ threadId, initialMessages }: { threadId: string; initialMessages: UIMessage[] }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(() => {
    if (typeof window === "undefined") return MODELS[0].id;
    const saved = localStorage.getItem("nexus.model");
    return MODELS.some((m) => m.id === saved) ? saved! : MODELS[0].id;
  });
  const modelRef = useRef(model);
  useEffect(() => {
    modelRef.current = model;
    if (typeof window !== "undefined") localStorage.setItem("nexus.model", model);
  }, [model]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ threadId, model: modelRef.current }),
        fetch: async (url, init) => {
          const requestId = makeRequestId();
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          headers.set("X-ARIA-Request-ID", requestId);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          const started = performance.now();
          console.info("[assistant] request:start", { requestId, threadId, model: modelRef.current });
          for (let attempt = 1; attempt <= 2; attempt += 1) {
            try {
              const res = await fetch(url, { ...init, headers });
              console.info("[assistant] request:response", {
                requestId,
                attempt,
                status: res.status,
                ok: res.ok,
                ms: Math.round(performance.now() - started),
              });
              if (!res.ok) {
                const cloned = res.clone();
                try {
                  const payload = await cloned.json() as { error?: string; requestId?: string };
                  if (payload.error) {
                    return new Response(`${payload.error}${payload.requestId ? ` · ${payload.requestId}` : ""}`, {
                      status: res.status,
                      statusText: res.statusText,
                      headers: res.headers,
                    });
                  }
                } catch {
                  // Fall back to the original response body below.
                }
              }
              if (res.status >= 500 && attempt === 1) continue;
              return res;
            } catch (error) {
              console.warn("[assistant] request:network-error", { requestId, attempt, error });
              if (attempt === 2) throw error;
            }
          }
          throw new Error("ARIA network request failed");
        },
      }),
  );

  const [chatError, setChatError] = useState<string | null>(null);
  const { messages, sendMessage, status, setMessages, regenerate, clearError } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => {
      console.error("[assistant] useChat error", err);
      setChatError(err instanceof Error ? err.message : String(err));
    },
    onFinish: ({ message, isError, finishReason }) => {
      console.info("[assistant] finish", { threadId, isError, finishReason, parts: message.parts.length });
      if (!isError) setChatError(null);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";
  const lastUserTextRef = useRef<string>("");

  useEffect(() => {
    const reconnect = () => {
      if (status === "error") {
        clearError();
        void regenerate().catch((err) => console.warn("[assistant] reconnect retry failed", err));
      }
    };
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", reconnect);
    return () => {
      window.removeEventListener("online", reconnect);
      document.removeEventListener("visibilitychange", reconnect);
    };
  }, [status, clearError, regenerate]);

  // Voice I/O — ElevenLabs STT (auto-detect AR/EN) + TTS playback
  const voice = useAriaVoice({
    onFinal: (text) => {
      if (!text.trim() || isLoading) return;
      sendMessage({ text });
    },
  });

  // Auto-speak the latest assistant message when voice mode is engaged
  const lastSpokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!voice.listening && !voice.speaking) return;
    if (status !== "ready") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || last.id === lastSpokenRef.current) return;
    const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
    if (text.length < 4) return;
    lastSpokenRef.current = last.id;
    voice.speak(text);
  }, [messages, status, voice]);

  // Realtime subscription for live message sync across devices
  useEffect(() => {
    // Unique topic per mount avoids "cannot add 'postgres_changes' callbacks"
    // which occurs when re-using a topic that is already joined (e.g. in
    // React StrictMode double-mount).
    const topic = `messages:${threadId}:${Math.random().toString(36).slice(2)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            const newMsg = payload.new as {
              id: string;
              role: "user" | "assistant" | "system";
              parts: Array<{ type: string; text?: string }>;
              created_at: string;
            };
            // Only sync assistant messages from realtime. User messages are
            // already shown optimistically by useChat with AI-SDK ids; the
            // DB row uses a different uuid so id-based dedupe would fail and
            // we'd see the user's message twice.
            if (newMsg.role !== "assistant") return;
            const uiMsg: UIMessage = {
              id: newMsg.id,
              role: newMsg.role,
              parts: newMsg.parts as UIMessage["parts"],
            };
            setMessages((prev) => {
              if (prev.some((m) => m.id === uiMsg.id)) return prev;
              // Avoid double-render if useChat already appended the assistant
              // response with its own id during streaming.
              const newText = uiMsg.parts.map((p) => (p.type === "text" ? p.text ?? "" : "")).join("").trim();
              if (newText) {
                const dup = prev.some(
                  (m) =>
                    m.role === "assistant" &&
                    m.parts.map((p) => (p.type === "text" ? p.text ?? "" : "")).join("").trim() === newText,
                );
                if (dup) return prev;
              }
              return [...prev, uiMsg];
            });
            qc.invalidateQueries({ queryKey: ["messages", threadId] });
          },
        )
        .subscribe();
      channelRef.current = channel;
    } catch (err) {
      console.warn("[assistant] realtime unavailable", err);
    }

    return () => {
      if (channel) {
        try { channel.unsubscribe(); } catch { /* noop */ }
        supabase.removeChannel(channel);
      }
      channelRef.current = null;
    };
  }, [threadId, qc, setMessages]);


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    lastUserTextRef.current = text;
    setInput("");
    try {
      await sendMessage({ text });
    } catch (err) {
      console.error("[assistant] send failed", err);
      setChatError(err instanceof Error ? err.message : String(err));
    }
  };

  const suggestions = [
    t("assistant.sugg_1"),
    t("assistant.sugg_2"),
    t("assistant.sugg_3"),
    t("assistant.sugg_4"),
  ];

  const sendSuggestion = async (text: string) => {
    if (isLoading) return;
    lastUserTextRef.current = text;
    try {
      await sendMessage({ text });
    } catch (err) {
      console.error("[assistant] suggestion failed", err);
      setChatError(err instanceof Error ? err.message : String(err));
    }
  };

  const retryLast = async () => {
    if (isLoading) return;
    clearError();
    setChatError(null);
    try {
      await regenerate();
    } catch (err) {
      console.warn("[assistant] retry regenerate failed", err);
      if (lastUserTextRef.current) await sendMessage({ text: lastUserTextRef.current });
    }
  };

  return (
    <>
      {/* Header with model picker */}
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{t("assistant.title")}</div>
          <div className="text-[11px] text-muted-foreground">{locale.toUpperCase()} · Lovable AI</div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">{t("assistant.model")}</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
      </div>

      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
              <ConversationEmptyState
                icon={<Sparkles className="h-8 w-8 text-primary" />}
                title={t("assistant.title")}
                description={t("assistant.empty")}
              />
              <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendSuggestion(s)}
                    className="rounded-xl border border-border bg-card/60 px-3 py-2.5 text-start text-sm text-foreground/90 transition-all hover:border-primary/60 hover:bg-card hover:shadow-glow"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent>
                  {m.parts.map((p, i) => {
                    if (p.type === "text") {
                      return <MessageResponse key={i}>{p.text}</MessageResponse>;
                    }
                    if (p.type.startsWith("tool-") || p.type === "tool-invocation") {
                      return <ToolInvocation key={i} part={p as Parameters<typeof ToolInvocation>[0]["part"]} />;
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>{t("common.loading")}</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>


      <form
        onSubmit={onSubmit}
        className="border-t border-border bg-background/80 p-3 backdrop-blur md:p-4"
      >
        {voice.partial && (
          <div className="mb-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary/90">
            🎙 {voice.partial}
          </div>
        )}
        {voice.error && (
          <div className="mb-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
            {voice.error}
          </div>
        )}
        {chatError && (
          <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
            <span className="break-all">⚠ {chatError}</span>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={retryLast} className="font-medium underline-offset-2 hover:underline">
                {locale === "ar" ? "إعادة المحاولة" : "Retry"}
              </button>
              <button type="button" onClick={() => setChatError(null)} className="opacity-60 hover:opacity-100">×</button>
            </div>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:border-primary/60 focus-within:shadow-glow">
          <Button
            type="button"
            size="icon"
            variant={voice.listening ? "default" : "ghost"}
            onClick={voice.toggleListening}
            className={cn(voice.listening && "animate-pulse bg-destructive hover:bg-destructive/90")}
            title={voice.listening ? t("assistant.stop_listening") ?? "Stop" : t("assistant.start_listening") ?? "Speak"}
          >
            {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          {voice.speaking && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={voice.stopSpeaking}
              title="Stop voice"
            >
              <VolumeX className="h-4 w-4" />
            </Button>
          )}
          {!voice.speaking && voice.listening && (
            <span className="flex h-9 w-9 items-center justify-center text-primary/60">
              <Volume2 className="h-4 w-4" />
            </span>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder={t("assistant.placeholder")}
            rows={1}
            className="min-h-[40px] max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="bg-gradient-primary shadow-glow"
          >
            <Send className="h-4 w-4" data-flip-rtl />
          </Button>
        </div>
      </form>
    </>
  );
}
