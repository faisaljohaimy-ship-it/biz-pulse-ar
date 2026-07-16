import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  AudioWaveform,
  CheckCircle2,
  KeyRound,
  MinusCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Check = {
  id: string;
  label: string;
  status: "ok" | "missing" | "failed" | "skipped";
  detail?: string;
  fix?: string;
};

type Diagnostics = {
  ok: boolean;
  mode: "canonical" | "unavailable";
  checks: Check[];
  connector: { present: boolean; auth_type: string; scopes_note: string };
  voice: { configured: boolean; identity: string; model: string; id_masked: string };
  live_voice_ready: boolean;
  generated_at: string;
};

const STATUS_META: Record<
  Check["status"],
  { color: string; Icon: typeof CheckCircle2; label: string }
> = {
  ok: { color: "text-emerald-400", Icon: CheckCircle2, label: "جاهز" },
  failed: { color: "text-red-400", Icon: XCircle, label: "فشل" },
  missing: { color: "text-amber-400", Icon: AlertCircle, label: "ناقص" },
  skipped: { color: "text-slate-500", Icon: MinusCircle, label: "متوقف" },
};

/** Read-only health surface for the one official ARIA voice runtime. */
export function CanonicalVoiceStatus() {
  const query = useQuery<Diagnostics>({
    queryKey: ["aria-canonical-voice-diagnostics"],
    queryFn: async () => {
      const response = await authenticatedFetch("/api/voice-diagnostics");
      if (!response.ok) throw new Error(`diagnostics ${response.status}`);
      return (await response.json()) as Diagnostics;
    },
    staleTime: 15_000,
  });
  const diagnostics = query.data;
  const apiKeyReady = diagnostics?.checks.find((check) => check.id === "api_key")?.status === "ok";
  const voiceReady =
    diagnostics?.checks.find((check) => check.id === "canonical_voice")?.status === "ok";

  return (
    <main className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden px-5 py-10" dir="rtl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(34,211,238,0.14),transparent_42%)]" />
      <div className="relative mx-auto max-w-4xl space-y-5">
        <header className="spatial-window flex flex-wrap items-start justify-between gap-5 rounded-[2rem] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 shadow-[0_0_35px_rgba(34,211,238,0.2)]">
              <AudioWaveform className="h-6 w-6 text-cyan-200" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-300">
                NEXIOS · ONE ARIA
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                حالة صوت آريا الرسمي
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                فحص للهوية الصوتية الواحدة والمسار الخادمي المحكوم. لا تنشئ هذه الصفحة مساعداً أو
                ميكروفوناً أو محادثة إضافية.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="border-cyan-300/25 bg-cyan-400/5 text-cyan-100"
          >
            <RefreshCw className={`ml-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            إعادة الفحص
          </Button>
        </header>

        {query.isLoading && (
          <Card className="border-cyan-500/20 bg-[#08172a]/90">
            <CardContent className="p-6 text-sm text-slate-400">جارٍ فحص قناة الصوت…</CardContent>
          </Card>
        )}
        {query.isError && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-6 text-sm text-red-300">
              تعذر تحميل التشخيص. تحقق من الجلسة ثم أعد المحاولة.
            </CardContent>
          </Card>
        )}

        {diagnostics && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <StatusTile
                Icon={KeyRound}
                title="المفتاح الخادمي"
                ok={apiKeyReady}
                primary={
                  apiKeyReady
                    ? "موثّق ومحمي"
                    : diagnostics.connector.present
                      ? "موجود ويحتاج تحققاً"
                      : "غير مضاف"
                }
                secondary="ELEVENLABS_API_KEY"
              />
              <StatusTile
                Icon={Sparkles}
                title="الهوية الصوتية"
                ok={voiceReady}
                primary={diagnostics.voice.identity}
                secondary={`${diagnostics.voice.model} · ${diagnostics.voice.id_masked}`}
              />
              <StatusTile
                Icon={ShieldCheck}
                title="المسار الرسمي"
                ok={diagnostics.live_voice_ready}
                primary={diagnostics.live_voice_ready ? "جاهز" : "مغلق بأمان"}
                secondary="/api/aria/tts"
              />
            </div>

            <Card className="border-cyan-500/20 bg-[#08172a]/90">
              <CardHeader>
                <CardTitle className="text-base text-cyan-100">فحوص التشغيل</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-cyan-500/10">
                {diagnostics.checks.map((check) => {
                  const meta = STATUS_META[check.status];
                  return (
                    <div key={check.id} className="flex items-start gap-3 py-3">
                      <meta.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-100">{check.label}</span>
                          <span className={`text-xs ${meta.color}`}>{meta.label}</span>
                        </div>
                        {check.detail && (
                          <p className="mt-1 break-words text-xs text-slate-400">{check.detail}</p>
                        )}
                        {check.fix && check.status !== "ok" && (
                          <p className="mt-1 text-xs text-amber-300/90">← {check.fix}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card
              className={
                diagnostics.live_voice_ready
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-amber-500/30 bg-amber-500/5"
              }
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <Badge
                    variant="outline"
                    className={
                      diagnostics.live_voice_ready
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                        : "border-amber-500/30 bg-amber-500/15 text-amber-300"
                    }
                  >
                    {diagnostics.live_voice_ready ? "ARIA VOICE READY" : "SAFE CLOSED"}
                  </Badge>
                  <p className="mt-2 text-xs text-slate-400">
                    آخر فحص: {new Date(diagnostics.generated_at).toLocaleString("ar-SA")}
                  </p>
                </div>
                <Button asChild className="bg-cyan-400 text-[#061A2E] hover:bg-cyan-300">
                  <Link to="/assistant">
                    <Sparkles className="ml-2 h-4 w-4" />
                    افتح آريا الرسمية
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <p className="px-2 text-xs leading-5 text-slate-500">
              الإعداد الوحيد المطلوب للصوت هو المفتاح الخادمي. هوية آريا وصوتها ونموذجها مقفلة
              مركزياً، وأي فشل يؤدي إلى الصمت الآمن بدلاً من تشغيل صوت بديل.
            </p>
          </>
        )}
      </div>
    </main>
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
    <Card className={`${ok ? "border-emerald-500/25" : "border-amber-500/25"} bg-[#08172a]/90`}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-300">
            <Icon className="h-4 w-4 text-cyan-300" />
            {title}
          </div>
          {ok ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-400" />
          )}
        </div>
        <div className="truncate text-sm font-medium text-slate-100">{primary}</div>
        <div className="truncate text-xs text-slate-500">{secondary}</div>
      </CardContent>
    </Card>
  );
}
