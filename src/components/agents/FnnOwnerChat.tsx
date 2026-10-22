import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Send, ShieldCheck, Trash2 } from "lucide-react";
import { useFnnOwner } from "@/lib/dual-agent/use-fnn-owner";
import { useFnnChatStore } from "@/lib/dual-agent/fnn-chat-store";
import { askFnn } from "@/lib/dual-agent/owner.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { FnnPlan } from "@/lib/sadeed/orchestrator/fnn-plan";
import "@/styles/home/home-owner-agents.css";

type Turn = {
  id: number;
  question: string;
  plan: FnnPlan;
  source?: "deterministic" | "scheduled_report";
};

/** Its own dialog, transport and memory. No SADEED context, messages or guest fallback. */
export function FnnOwnerChat() {
  const { allowed, userId } = useFnnOwner();
  if (!allowed || !userId) return null;
  return <OwnerConversation key={userId} userId={userId} />;
}

function OwnerConversation({ userId }: { userId: string }) {
  const isOpen = useFnnChatStore((state) => state.ownerId === userId);
  const openFor = useFnnChatStore((state) => state.openFor);
  const close = useFnnChatStore((state) => state.close);
  useEffect(() => close, [close]);
  const ask = useServerFn(askFnn);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const message = question.trim();
    if (!message || busy) return;
    setBusy(true);
    setError(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const reply = await Promise.race([
        ask({ data: { message } }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("تعذّر تجهيز الخطة")), 10_000);
        }),
      ]);
      setTurns((previous) => [
        ...previous.slice(-19),
        { id: Date.now(), question: message, plan: reply.plan, source: reply.source },
      ]);
      setQuestion("");
    } catch {
      setError(true);
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? openFor(userId) : close())}>
      <SheetTrigger asChild>
        <Button
          className="nx-owner-control fixed bottom-24 start-4 z-40 min-h-11 gap-2 rounded-2xl border border-primary/30 px-4 shadow-lg"
          aria-label="فتح شات FNN الخاص بمالك النظام"
        >
          <Bot className="h-5 w-5" aria-hidden />
          <span dir="rtl">
            FNN <span className="text-xs opacity-80">· المالك</span>
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        dir="rtl"
        className="flex flex-col sm:max-w-lg [&>.nexus-window-close]:h-11 [&>.nexus-window-close]:w-11"
      >
        <SheetHeader className="pe-8 text-start">
          <SheetTitle className="flex items-center gap-2">
            <Bot aria-hidden /> FNN · مساعد المالك
          </SheetTitle>
          <SheetDescription>
            محادثة مستقلة للأتمتة والبرمجة واستيراد البيانات. الوصول خاص بحساب مالك النظام.
          </SheetDescription>
        </SheetHeader>
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" aria-hidden /> صلاحية المالك موثّقة على الخادم
          </p>
          <p className="mt-2 text-muted-foreground">
            يجهّز FNN الخطوات محليًا دون استدعاء نموذج مدفوع. التنفيذ متاح للأدوات المصرّح بها في
            مساحة التنفيذ، والكتابات تتطلب اعتمادًا. البرمجة والنشر هنا خطط للمراجعة.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="nx-owner-control min-h-11">
              <a href="/orchestration">فتح أدوات FNN وسجل التنفيذ</a>
            </Button>
            <Button asChild variant="outline" className="nx-owner-control min-h-11">
              <a href="/knowledge-upload">فحص واستيراد البيانات</a>
            </Button>
          </div>
        </div>
        <div
          role="log"
          aria-label="محادثة FNN المستقلة"
          aria-live="polite"
          aria-busy={busy}
          className="min-h-24 flex-1 space-y-4 overflow-y-auto"
        >
          {!turns.length && (
            <p className="text-sm text-muted-foreground">
              اكتب «حالة أتمتة FNN» لقراءة التقرير الدوري، أو مهمة صيانة أو مراجعة كود لتجهيز
              خطواتها.
            </p>
          )}
          {turns.map((turn) => (
            <article
              key={turn.id}
              className="space-y-3 rounded-xl border border-border p-4 text-sm"
            >
              <p className="whitespace-pre-wrap break-words font-semibold">أنت: {turn.question}</p>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-semibold">FNN: {turn.plan.title}</p>
                <ol className="mt-2 list-inside list-decimal space-y-2">
                  {turn.plan.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-muted-foreground">
                  {turn.source === "scheduled_report"
                    ? "نتيجة محفوظة من المجدول · هذه الرسالة لا تبدأ دورة جديدة."
                    : "خطة مقترحة · لم يُنفّذ أي إجراء."}
                </p>
              </div>
            </article>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            تعذّر الوصول إلى مساحة المالك. أعد المحاولة أو سجّل الدخول مجددًا.
          </p>
        )}
        <form onSubmit={submit} className="space-y-2">
          <label htmlFor="fnn-owner-message" className="text-sm font-semibold">
            رسالتك إلى FNN
          </label>
          <Textarea
            id="fnn-owner-message"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={2000}
            required
            placeholder="جهّز خطة مراجعة الكود والتكاملات…"
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={busy || !question.trim()}
              className="nx-owner-control min-h-11 gap-2"
            >
              <Send className="h-4 w-4" aria-hidden />
              {busy ? "جارٍ التجهيز…" : "إرسال إلى FNN"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              className="nx-owner-control min-h-11 gap-2"
              onClick={() => setTurns([])}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              مسح المحادثة
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
