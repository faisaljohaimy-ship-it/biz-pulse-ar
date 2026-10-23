/**
 * قائمة تشغيلات الوكلاء — مكوّن عرضٍ بخصائص صريحة تشترك فيه /exec و/agents.
 *
 * ثلاث قواعد يحرسها الاختبار `AgentRunsList.test.tsx`:
 *   • UI-1: الصفّ الموسوم `is_simulation === true` يحمل شارة «بيانات مرجعية
 *     (محاكاة)» وتُحجب عنه أزرار الإلغاء والإعادة — فلا يُرسَل `sim-run-N` إلى
 *     الخادم. و`steps` مصفوفة في المحاكاة ⇐ «—» لا فراغ ولا صفر.
 *   • UI-2: «نجح» مع `audit_json.pendingApprovals.count > 0` ⇐ شارة كهرمانية
 *     «بانتظار الاعتماد (N)» بمثلث، لا الخضراء؛ ومعها رابطٌ إلى طلبات الاعتماد
 *     إن أعطاه المستهلك. و`toolFailures` ⇐ «أدوات فشلت: N» (أحمر)، و`excludedTools` ⇐
 *     «أدوات مستبعدة: N» (كهرماني) — المستبعَد ليس فشلًا.
 *   • UI-5: التسمية من `run-status-labels.ts` لا النصّ الخام.
 *
 * بلا مزوّدين (لا i18n ولا react-query): اللغة والأسماء والأفعال تأتي خصائصَ.
 */
import type { ReactNode } from "react";
import { Ban, Bot, Eye, RotateCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RunStatusBadge } from "@/components/exec/RunStatusBadge";
import {
  SIMULATION_BADGE_AR,
  SIMULATION_BADGE_TITLE_AR,
  deriveRunStatus,
  isSimulatedRow,
  runStatusMeta,
  runStepsLabel,
} from "@/lib/exec/run-status-labels";

export type AgentRunRow = {
  id: string;
  agent_id: string;
  status: string;
  summary: string | null;
  /** عددٌ في الصفوف الحيّة؛ مصفوفة في المحاكاة — يُعرض عبر `runStepsLabel`. */
  steps: unknown;
  error: string | null;
  started_at: string;
  finished_at?: string | null;
  triggered_by?: string | null;
  goal_override: string | null;
  audit_json?: unknown;
  is_simulation?: boolean;
};

export type AgentRunsListProps = {
  runs: AgentRunRow[];
  locale?: "ar" | "en";
  /** اسم الوكيل المعروض؛ غيابه ⇐ المعرّف الخام. */
  agentName?: (agentId: string) => string | undefined;
  /** أيقونة الوكيل؛ غيابها ⇐ `Bot`. */
  agentIcon?: (agentId: string) => typeof Bot;
  onCancel?: (run: AgentRunRow) => void;
  onRetry?: (run: AgentRunRow) => void;
  onDetails?: (run: AgentRunRow) => void;
  /** يفتح طلبات الاعتماد المرتبطة (تبويب التنفيذات في /exec). */
  onOpenApprovals?: (run: AgentRunRow) => void;
  busy?: { cancel?: boolean; retry?: boolean };
  /** الحالة الفارغة الصادقة — المصفوفة الفارغة مشروعة. */
  empty?: ReactNode;
  className?: string;
};

export function SimulationBadge({ className }: { className?: string }) {
  return (
    <span
      role="note"
      title={SIMULATION_BADGE_TITLE_AR}
      className={
        "inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[12px] text-amber-700 dark:text-amber-300 " +
        (className ?? "")
      }
    >
      {SIMULATION_BADGE_AR}
    </span>
  );
}

function fmtDuration(startedAt: string, finishedAt: string | null | undefined): string {
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return "—";
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const ms = Math.max(0, end - start);
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : "—";
}

export function AgentRunsList({
  runs,
  locale = "ar",
  agentName,
  agentIcon,
  onCancel,
  onRetry,
  onDetails,
  onOpenApprovals,
  busy,
  empty,
  className,
}: AgentRunsListProps) {
  const ar = locale === "ar";
  const anySimulated = runs.some(isSimulatedRow);

  if (runs.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground" data-testid="agent-runs-empty">
        {empty ?? (ar ? "لا توجد تشغيلات بعد." : "No agent runs yet.")}
      </div>
    );
  }

  return (
    <div className={className} dir={ar ? "rtl" : "ltr"}>
      {anySimulated && (
        <div
          className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[12px] text-amber-700 dark:text-amber-300"
          data-testid="agent-runs-simulation-banner"
        >
          <SimulationBadge />
          <span>
            {ar
              ? "لم تصل صفوف حيّة من agent_runs؛ ما يلي بيانات مرجعية موسومة، ليست حيّة، ولا تقبل إلغاءً ولا إعادة."
              : "No live agent_runs rows arrived; the list below is a labelled reference simulation — no cancel or retry."}
          </span>
        </div>
      )}
      <ul className="divide-y divide-border/40">
        {runs.map((r) => {
          const simulated = isSimulatedRow(r);
          const derived = deriveRunStatus(r, locale);
          const live = runStatusMeta(r.status).live;
          const Icon = agentIcon?.(r.agent_id) ?? Bot;
          const name = agentName?.(r.agent_id) ?? r.agent_id;
          const steps = runStepsLabel(r.steps);
          const showCancel = !simulated && live && !!onCancel;
          const showRetry = !simulated && r.status === "failed" && !!onRetry;
          return (
            <li
              key={r.id}
              className="flex items-start gap-3 p-3 transition hover:bg-primary/5"
              data-run-id={r.id}
              data-simulation={simulated ? "true" : undefined}
            >
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
                <Icon aria-hidden className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1 text-start">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{name}</span>
                  <RunStatusBadge status={r.status} auditJson={r.audit_json} locale={locale} />
                  {simulated && <SimulationBadge />}
                  <span className="text-[12px] text-muted-foreground">{fmtWhen(r.started_at)}</span>
                  <span className="text-[12px] text-muted-foreground">
                    · {fmtDuration(r.started_at, r.finished_at)}
                  </span>
                  <span className="text-[12px] text-muted-foreground" data-testid="run-steps">
                    · {ar ? `${steps} خطوة` : `${steps} steps`}
                  </span>
                  {derived.toolFailures != null && derived.toolFailures > 0 && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[12px] text-red-700 dark:text-red-300"
                      data-testid="run-tool-failures"
                    >
                      <ShieldAlert aria-hidden className="size-3" />
                      {ar
                        ? `أدوات فشلت: ${derived.toolFailures}`
                        : `Tools failed: ${derived.toolFailures}`}
                    </span>
                  )}
                  {derived.excludedTools != null && derived.excludedTools > 0 && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[12px] text-amber-800 dark:text-amber-300"
                      data-testid="run-excluded-tools"
                      title={
                        ar
                          ? "أدوات لم تُعرض على الوكيل (صلاحية أو تعطيل)"
                          : "Tools not offered to the agent"
                      }
                    >
                      {ar
                        ? `أدوات مستبعدة: ${derived.excludedTools}`
                        : `Tools excluded: ${derived.excludedTools}`}
                    </span>
                  )}
                </div>
                {r.goal_override && (
                  <div className="mt-1 text-[12px] italic text-muted-foreground">
                    {ar ? "الهدف: " : "goal: "}
                    {r.goal_override}
                  </div>
                )}
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {r.error ? (
                    <span className="text-red-700 dark:text-red-300">{r.error}</span>
                  ) : (
                    (r.summary ?? "—")
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground/70">
                  <span>
                    id: <code>{r.id.slice(0, 8)}</code>
                  </span>
                  {derived.pendingApprovals > 0 && onOpenApprovals && !simulated && (
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      className="h-auto min-h-[44px] px-1 text-[12px] text-amber-700 dark:text-amber-300"
                      onClick={() => onOpenApprovals(r)}
                    >
                      {ar ? "عرض طلبات الاعتماد" : "View approval requests"}
                    </Button>
                  )}
                </div>
              </div>
              {(showCancel || showRetry || onDetails) && (
                <div className="flex flex-col gap-1">
                  {showCancel && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-[44px] text-[12px]"
                      disabled={!!busy?.cancel}
                      onClick={() => onCancel?.(r)}
                    >
                      <Ban aria-hidden className="me-1 h-3 w-3" />
                      {ar ? "إلغاء" : "Cancel"}
                    </Button>
                  )}
                  {showRetry && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-[44px] text-[12px]"
                      disabled={!!busy?.retry}
                      onClick={() => onRetry?.(r)}
                    >
                      <RotateCw aria-hidden className="me-1 h-3 w-3" />
                      {ar ? "إعادة" : "Retry"}
                    </Button>
                  )}
                  {onDetails && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="min-h-[44px] text-[12px]"
                      onClick={() => onDetails(r)}
                    >
                      <Eye aria-hidden className="me-1 h-3 w-3" />
                      {ar ? "تفاصيل" : "Logs"}
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
