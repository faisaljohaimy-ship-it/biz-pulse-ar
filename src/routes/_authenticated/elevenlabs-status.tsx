import { RouteError, RouteNotFound } from "@/components/route-boundaries";
/**
 * ElevenLabs Integration Status — verifies connector presence, API-key auth,
 * required capabilities (Conversational AI, Realtime Scribe), and the
 * currently configured Agent ID. Gates the "Enable Live Voice" action until
 * every dependency is green.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  MinusCircle,
  RefreshCw,
  Mic,
  KeyRound,
  Bot,
  ShieldCheck,
} from "lucide-react";

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
  connector: { present: boolean; auth_type: string; scopes_note: string };
  agent: { configured: boolean; id_masked: string | null };
  live_voice_ready: boolean;
  generated_at: string;
};

export const Route = createFileRoute("/_authenticated/elevenlabs-status")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: ElevenLabsStatusPage,
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

function ElevenLabsStatusPage() {
  const q = useQuery<Diagnostics>({
    queryKey: ["elevenlabs-status"],
    queryFn: async () => {
      const r = await authenticatedFetch("/api/voice-diagnostics");
      if (!r.ok) throw new Error(`diagnostics ${r.status}`);
      return (await r.json()) as Diagnostics;
    },
    staleTime: 15_000,
  });

  const d = q.data;
  const connectorOk = d?.connector.present ?? false;
  const agentOk = d?.agent.configured ?? false;
  const convaiCheck = d?.checks.find((c) => c.id === "convai_token");
  const liveReady = d?.live_voice_ready ?? false;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-cyan-100">ElevenLabs Integration Status</h1>
          <p className="text-sm text-slate-400">
            حالة تكامل ElevenLabs — connector، الصلاحيات، ومعرّف الـ Agent قبل تفعيل المحادثة الحية.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          className="text-cyan-300 hover:text-cyan-100"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${q.isFetching ? "animate-spin" : ""}`} />
          Re-probe
        </Button>
      </header>

      {q.isLoading && <p className="text-slate-400 text-sm">Probing ElevenLabs endpoints…</p>}
      {q.isError && <p className="text-red-400 text-sm">Failed to fetch integration status.</p>}

      {d && (
        <>
          {/* Overview grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatusTile
              Icon={KeyRound}
              title="Connector"
              ok={connectorOk}
              primary={connectorOk ? "Linked" : "Not linked"}
              secondary={
                d.connector.auth_type === "api_key" ? "API key auth" : d.connector.auth_type
              }
            />
            <StatusTile
              Icon={Bot}
              title="Agent ID"
              ok={agentOk}
              primary={d.agent.id_masked ?? "Not configured"}
              secondary={agentOk ? "ELEVENLABS_AGENT_ID set" : "Secret missing"}
            />
            <StatusTile
              Icon={Mic}
              title="ConvAI token mint"
              ok={convaiCheck?.status === "ok"}
              primary={
                convaiCheck?.status === "ok" ? "Mintable" : (convaiCheck?.status ?? "skipped")
              }
              secondary={convaiCheck?.detail?.slice(0, 60) ?? "—"}
            />
          </div>

          {/* Scopes / auth note */}
          <Card className="border-cyan-500/20 bg-[#08172a]">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <ShieldCheck className="h-5 w-5 text-cyan-300" />
              <CardTitle className="text-base text-cyan-100">Authorization model</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300 space-y-2">
              <p>{d.connector.scopes_note}</p>
              <p className="text-xs text-slate-500">
                Required capabilities on the key: <code className="text-cyan-300">user:read</code>,{" "}
                <code className="text-cyan-300">conversational_ai:create_token</code>,{" "}
                <code className="text-cyan-300">speech_to_text:realtime</code> (entitlements vary by
                plan).
              </p>
            </CardContent>
          </Card>

          {/* Per-check log */}
          <Card className="border-cyan-500/20 bg-[#08172a]">
            <CardHeader>
              <CardTitle className="text-base text-cyan-100">End-to-end probes</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-cyan-500/10">
              {d.checks.map((c) => {
                const meta = STATUS_META[c.status];
                return (
                  <div key={c.id} className="py-3 flex items-start gap-3">
                    <meta.Icon className={`h-5 w-5 mt-0.5 shrink-0 ${meta.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-100">{c.label}</span>
                        <span className={`text-xs ${meta.color}`}>{meta.label}</span>
                      </div>
                      {c.detail && (
                        <p className="text-xs text-slate-400 mt-1 break-words">{c.detail}</p>
                      )}
                      {c.fix && (c.status === "failed" || c.status === "missing") && (
                        <p className="text-xs text-amber-300/90 mt-1">→ {c.fix}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Gate */}
          <Card
            className={`border ${liveReady ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}
          >
            <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      liveReady
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    }
                  >
                    {liveReady ? "READY" : "BLOCKED"}
                  </Badge>
                  <span className="text-sm text-slate-200">
                    {liveReady
                      ? "Live two-way voice can be enabled."
                      : "Live voice gated by failing checks above."}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Current fallback mode: <span className="text-cyan-300">{d.mode}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/30 text-cyan-200"
                >
                  <Link to="/voice-setup">Open wizard</Link>
                </Button>
                <Button
                  size="sm"
                  disabled={!liveReady}
                  className="bg-cyan-500 hover:bg-cyan-400 text-[#061A2E] disabled:opacity-40"
                  asChild={liveReady}
                >
                  {liveReady ? (
                    <Link to="/aria">Enable Live Voice</Link>
                  ) : (
                    <span>Enable Live Voice</span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-slate-500">
            Last probed: {new Date(d.generated_at).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}

function StatusTile({
  Icon,
  title,
  ok,
  primary,
  secondary,
}: {
  Icon: typeof CheckCircle2;
  title: string;
  ok: boolean;
  primary: string;
  secondary: string;
}) {
  return (
    <Card className={`border ${ok ? "border-emerald-500/25" : "border-amber-500/25"} bg-[#08172a]`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300 text-xs uppercase tracking-wide">
            <Icon className="h-4 w-4 text-cyan-300" />
            {title}
          </div>
          {ok ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-400" />
          )}
        </div>
        <div className="text-sm font-mono text-slate-100 truncate">{primary}</div>
        <div className="text-xs text-slate-500 truncate">{secondary}</div>
      </CardContent>
    </Card>
  );
}
