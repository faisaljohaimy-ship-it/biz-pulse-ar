import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { readPublicResult } from "@/lib/public-result";

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [
      { title: "تفضيلات البريد — سَدِيد" },
      { name: "description", content: "إدارة إلغاء الاشتراك في رسائل سَدِيد." },
      { property: "og:title", content: "تفضيلات البريد — سَدِيد" },
      { property: "og:description", content: "إدارة إلغاء الاشتراك في رسائل سَدِيد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UnsubscribePage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
});

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "success" }
  | { kind: "error"; message: string };

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`, {
          signal: AbortSignal.timeout(4_000),
        });
        const data = await readPublicResult<{ valid?: boolean; reason?: string }>(res);
        if (!data) {
          setState({ kind: "invalid" });
          return;
        }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setState({ kind: "already" });
          return;
        }
        if (data.valid === true) {
          setState({ kind: "ready" });
          return;
        }
        setState({ kind: "invalid" });
      } catch {
        setState({ kind: "error", message: "تعذّر التحقق من الرابط الآن. أعد المحاولة." });
      }
    })();
  }, [token, attempt]);

  async function confirm() {
    setSubmitting(true);
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = await readPublicResult<{ success?: boolean; reason?: string }>(res);
      if (!data) {
        setState({ kind: "invalid" });
        return;
      }
      if (data.success) {
        setState({ kind: "success" });
      } else if (data.reason === "already_unsubscribed") {
        setState({ kind: "already" });
      } else {
        setState({ kind: "error", message: "تعذّر إلغاء الاشتراك الآن. أعد المحاولة." });
      }
    } catch {
      setState({ kind: "error", message: "تعذّر إلغاء الاشتراك الآن. أعد المحاولة." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold tracking-widest text-primary">
          SADEED
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">تفضيلات البريد</h1>

        {state.kind === "loading" && (
          <p className="mt-4 text-sm text-muted-foreground">جارٍ التحقق من الرابط…</p>
        )}

        {state.kind === "ready" && (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              أكّد إلغاء الاشتراك في رسائل سَدِيد البريدية.
            </p>
            <Button
              onClick={confirm}
              disabled={submitting}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "جارٍ المعالجة…" : "تأكيد إلغاء الاشتراك"}
            </Button>
          </>
        )}

        {state.kind === "already" && (
          <p className="mt-4 text-sm text-muted-foreground">
            اشتراكك ملغى بالفعل. لن تُرسل رسائل إضافية إلى هذا العنوان.
          </p>
        )}

        {state.kind === "success" && (
          <p className="mt-4 text-sm text-foreground">تم إلغاء الاشتراك.</p>
        )}

        {state.kind === "invalid" && (
          <p className="mt-4 text-sm text-muted-foreground">
            رابط إلغاء الاشتراك غير صالح أو انتهت صلاحيته.
          </p>
        )}

        {state.kind === "error" && (
          <div role="alert">
            <p className="mt-4 text-sm text-destructive">{state.message}</p>
            <Button
              variant="outline"
              className="mt-4 min-h-11"
              onClick={() => {
                setState({ kind: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              إعادة المحاولة
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
