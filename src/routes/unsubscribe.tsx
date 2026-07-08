import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/unsubscribe")({
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

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) {
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
      } catch (e) {
        setState({ kind: "error", message: "Network error" });
      }
    })();
  }, [token]);

  async function confirm() {
    setSubmitting(true);
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        setState({ kind: "success" });
      } else if (data.reason === "already_unsubscribed") {
        setState({ kind: "already" });
      } else {
        setState({ kind: "error", message: data.error || "Failed to unsubscribe" });
      }
    } catch {
      setState({ kind: "error", message: "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold tracking-widest text-primary">
          NEXUS AI OS
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Email preferences</h1>

        {state.kind === "loading" && (
          <p className="mt-4 text-sm text-muted-foreground">Validating your link…</p>
        )}

        {state.kind === "ready" && (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              Click below to unsubscribe from NEXUS AI OS emails. You can re-subscribe anytime by
              contacting us.
            </p>
            <button
              onClick={confirm}
              disabled={submitting}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Processing…" : "Confirm unsubscribe"}
            </button>
          </>
        )}

        {state.kind === "already" && (
          <p className="mt-4 text-sm text-muted-foreground">
            You're already unsubscribed. No further emails will be sent to this address.
          </p>
        )}

        {state.kind === "success" && (
          <p className="mt-4 text-sm text-foreground">✅ You've been unsubscribed successfully.</p>
        )}

        {state.kind === "invalid" && (
          <p className="mt-4 text-sm text-muted-foreground">
            This unsubscribe link is invalid or has expired.
          </p>
        )}

        {state.kind === "error" && <p className="mt-4 text-sm text-destructive">{state.message}</p>}
      </div>
    </div>
  );
}
