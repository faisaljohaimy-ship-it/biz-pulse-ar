/**
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
 * Voice Setup Wizard — surfaces /api/voice-diagnostics in a clean, actionable
 * UI so executives know exactly what to do when live voice isn't fully wired.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, MinusCircle, RefreshCw } from "lucide-react";

type Check = {
  id: string;
  label: string;
  status: "ok" | "missing" | "failed" | "skipped";
  detail?: string;
  fix?: string;
};
type Diagnostics = {
  ok: boolean;
  mode: "conversation" | "scribe" | "unavailable";
  checks: Check[];
  generated_at: string;
};

export const Route = createFileRoute("/_authenticated/voice-setup")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: VoiceSetupPage,
});

const STATUS_META: Record<
  Check["status"],
  { color: string; Icon: typeof CheckCircle2; label: string }
> = {
  ok: { color: "text-emerald-400", Icon: CheckCircle2, label: "OK" },
  failed: { color: "text-red-400", Icon: XCircle, label: "Failed" },
  missing: { color: "text-amber-400", Icon: AlertCircle, label: "Missing" },
  skipped: { color: "text-slate-500", Icon: MinusCircle, label: "Skipped" },
};

const MODE_LABEL: Record<Diagnostics["mode"], { ar: string; en: string; tone: string }> = {
  conversation: {
    ar: "محادثة كاملة (ثنائية الاتجاه)",
    en: "Full conversation (two-way)",
    tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  scribe: {
    ar: "استماع فقط (تحويل صوت إلى نص)",
    en: "Listen-only (speech-to-text)",
    tone: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  unavailable: {
    ar: "غير متاح",
    en: "Unavailable",
    tone: "bg-red-500/15 text-red-300 border-red-500/30",
  },
};

function VoiceSetupPage() {
  const q = useQuery<Diagnostics>({
    queryKey: ["voice-diagnostics"],
    queryFn: async () => {
      const r = await authenticatedFetch("/api/voice-diagnostics");
      if (!r.ok) throw new Error(`diagnostics ${r.status}`);
      return (await r.json()) as Diagnostics;
    },
    staleTime: 15_000,
  });

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-cyan-100">Voice Setup · إعداد الصوت</h1>
        <p className="text-sm text-slate-400">
          Live diagnostics for the ARIA voice stack. Every layer is probed end-to-end; no silent
          failures.
        </p>
      </header>

      <Card className="border-cyan-500/20 bg-[#08172a]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base text-cyan-100">Current mode</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => q.refetch()}
            disabled={q.isFetching}
            className="text-cyan-300 hover:text-cyan-100"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${q.isFetching ? "animate-spin" : ""}`} />
            Re-run
          </Button>
        </CardHeader>
        <CardContent>
          {q.isLoading && <p className="text-slate-400 text-sm">Probing…</p>}
          {q.isError && <p className="text-red-400 text-sm">Failed to fetch diagnostics.</p>}
          {q.data && (
            <div className="space-y-3">
              <Badge variant="outline" className={MODE_LABEL[q.data.mode].tone}>
                {MODE_LABEL[q.data.mode].en} · {MODE_LABEL[q.data.mode].ar}
              </Badge>
              <p className="text-xs text-slate-500">
                Last checked: {new Date(q.data.generated_at).toLocaleTimeString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-cyan-500/20 bg-[#08172a]">
        <CardHeader>
          <CardTitle className="text-base text-cyan-100">Checks</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-cyan-500/10">
          {q.data?.checks.map((c) => {
            const meta = STATUS_META[c.status];
            return (
              <div key={c.id} className="py-3 flex items-start gap-3">
                <meta.Icon className={`h-5 w-5 mt-0.5 shrink-0 ${meta.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-100">{c.label}</span>
                    <span className={`text-xs ${meta.color}`}>{meta.label}</span>
                  </div>
                  {c.detail && <p className="text-xs text-slate-400 mt-1">{c.detail}</p>}
                  {c.fix && (c.status === "failed" || c.status === "missing") && (
                    <p className="text-xs text-amber-300/90 mt-1">→ {c.fix}</p>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-cyan-500/10 bg-[#06121f]">
        <CardHeader>
          <CardTitle className="text-sm text-slate-300">How to enable full two-way voice</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate-400 space-y-2">
          <p>
            1. Visit <span className="text-cyan-300">elevenlabs.io/app/conversational-ai</span> and
            create an agent (set the system prompt, voice, language).
          </p>
          <p>2. Copy the agent ID.</p>
          <p>
            3. Save it as the secret <code className="text-cyan-300">ELEVENLABS_AGENT_ID</code> in
            your Lovable project settings.
          </p>
          <p>
            4. Return here and click <em>Re-run</em>. Mode should switch to{" "}
            <em>Full conversation</em>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
