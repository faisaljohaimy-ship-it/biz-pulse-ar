import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createThread, deleteThread, getThreadMessages, listThreads } from "@/lib/threads.functions";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, MessageSquare, Sparkles, Send } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/assistant/$threadId")({
  component: AssistantThread,
});

function AssistantThread() {
  const { threadId } = useParams({ from: "/_authenticated/assistant/$threadId" });
  const { t, locale } = useI18n();
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
        <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold">{t("assistant.title")}</div>
            <div className="text-[11px] text-muted-foreground">Gemini 3 Flash · {locale.toUpperCase()}</div>
          </div>
        </div>

        {messagesQ.isLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">...</div>
        ) : (
          <ChatWindow key={threadId} threadId={threadId} initialMessages={(messagesQ.data ?? []) as unknown as UIMessage[]} />
        )}
      </div>
    </div>
  );
}

function ChatWindow({ threadId, initialMessages }: { threadId: string; initialMessages: UIMessage[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { threadId },
        fetch: async (url, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(url, { ...init, headers });
        },
      }),
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Realtime subscription for live message sync across devices
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${threadId}`)
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
          const uiMsg: UIMessage = {
            id: newMsg.id,
            role: newMsg.role,
            parts: newMsg.parts,
            createdAt: new Date(newMsg.created_at),
            experimental_attachments: undefined,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === uiMsg.id)) return prev;
            return [...prev, uiMsg];
          });
          // Also invalidate server cache so other queries stay fresh
          qc.invalidateQueries({ queryKey: ["messages", threadId] });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [threadId, qc, setMessages]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    await sendMessage({ text });
  };

  return (
    <>
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<Sparkles className="h-8 w-8 text-primary" />}
              title={t("assistant.title")}
              description={t("assistant.empty")}
            />
          ) : (
            messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent>
                  {m.parts.map((p, i) =>
                    p.type === "text" ? <MessageResponse key={i}>{p.text}</MessageResponse> : null,
                  )}
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
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:border-primary/60 focus-within:shadow-glow">
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
