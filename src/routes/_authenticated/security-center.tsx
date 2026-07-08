import { RouteError, RouteNotFound } from "@/components/route-boundaries";
// Security Center — RBAC role matrix, audit trail, secret inventory.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Shield,
  Users,
  Key,
  Activity,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import {
  getSecurityOverview,
  listAuditLogs,
  updateMemberRole,
  getSecretInventory,
  ORG_ROLES,
  type OrgRole,
} from "@/lib/security-center.functions";

export const Route = createFileRoute("/_authenticated/security-center")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: SecurityCenterPage,
});

function SecurityCenterPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getSecurityOverview);
  const fetchAudit = useServerFn(listAuditLogs);
  const fetchSecrets = useServerFn(getSecretInventory);
  const changeRole = useServerFn(updateMemberRole);

  const overview = useQuery({
    queryKey: ["sec-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 60_000,
  });
  const audit = useQuery({
    queryKey: ["sec-audit"],
    queryFn: () => fetchAudit(),
    refetchInterval: 30_000,
  });
  const secrets = useQuery({
    queryKey: ["sec-secrets"],
    queryFn: () => fetchSecrets(),
    enabled: overview.data?.is_platform_admin ?? false,
  });

  const roleMut = useMutation({
    mutationFn: (v: { user_id: string; org_id: string; role: OrgRole }) => changeRole({ data: v }),
    onSuccess: () => {
      toast.success(ar ? "تم تحديث الدور" : "Role updated");
      void qc.invalidateQueries({ queryKey: ["sec-overview"] });
      void qc.invalidateQueries({ queryKey: ["sec-audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totals = overview.data?.totals;
  const canManage = overview.data?.is_platform_admin ?? false;

  return (
    <NexusPage
      eyebrow="SECURITY CENTER"
      title={ar ? "مركز الأمن والصلاحيات" : "Security & Access Center"}
      subtitle={
        ar
          ? "الأدوار، سجل التدقيق، ومخزون الأسرار — كل ذلك في مكان واحد."
          : "Roles, audit trail, and secret inventory — all in one place."
      }
      actions={
        <NexusPill tone={canManage ? "emerald" : "slate"}>
          {canManage ? (ar ? "مسؤول منصة" : "Platform admin") : ar ? "قراءة فقط" : "Read-only"}
        </NexusPill>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat
          label={ar ? "الأعضاء" : "Members"}
          value={String(totals?.members ?? "—")}
          tone="cyan"
        />
        <NexusStat
          label={ar ? "مسؤولون" : "Admins"}
          value={String((totals?.by_role.owner ?? 0) + (totals?.by_role.admin ?? 0))}
          tone="emerald"
        />
        <NexusStat
          label={ar ? "سجلات 24س" : "Audit 24h"}
          value={String(totals?.audit_24h ?? 0)}
          tone="cyan"
        />
        <NexusStat
          label={ar ? "أخطاء 24س" : "Errors 24h"}
          value={String(totals?.audit_errors_24h ?? 0)}
          tone={(totals?.audit_errors_24h ?? 0) > 0 ? "rose" : "emerald"}
        />
      </div>

      {/* RBAC Matrix */}
      <NexusCard>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "مصفوفة الأدوار" : "ROLE MATRIX"}
          </div>
        </div>

        {overview.isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-4 w-4 animate-spin text-cyan-300" />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-left text-[10px] uppercase tracking-widest text-slate-500">
                <tr className="border-b border-white/5">
                  <th className="py-2 pe-3">{ar ? "المستخدم" : "User"}</th>
                  <th className="py-2 pe-3">{ar ? "الدور" : "Role"}</th>
                  <th className="py-2 pe-3">{ar ? "انضم" : "Joined"}</th>
                </tr>
              </thead>
              <tbody>
                {(overview.data?.members ?? []).map((m) => (
                  <tr key={`${m.org_id}-${m.user_id}`} className="border-b border-white/5">
                    <td className="py-2 pe-3">
                      <div className="font-medium text-white">
                        {m.display_name ?? m.user_id.slice(0, 8)}
                        {m.user_id === overview.data?.current_user_id && (
                          <span className="ms-2 text-[10px] text-cyan-300">
                            ({ar ? "أنت" : "you"})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {m.user_id.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="py-2 pe-3">
                      {canManage ? (
                        <select
                          value={m.role}
                          onChange={(e) =>
                            roleMut.mutate({
                              user_id: m.user_id,
                              org_id: m.org_id,
                              role: e.target.value as OrgRole,
                            })
                          }
                          disabled={roleMut.isPending}
                          className="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-[12px] text-white focus:border-cyan-400/60 focus:outline-none"
                        >
                          {ORG_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <NexusPill
                          tone={
                            m.role === "owner" || m.role === "admin"
                              ? "emerald"
                              : m.role === "viewer"
                                ? "slate"
                                : "cyan"
                          }
                        >
                          {m.role}
                        </NexusPill>
                      )}
                    </td>
                    <td className="py-2 pe-3 text-slate-400">
                      {new Date(m.joined_at).toLocaleDateString(ar ? "ar" : "en", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
                {(overview.data?.members ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500">
                      {ar ? "لا أعضاء" : "No members"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </NexusCard>

      {/* Audit Trail */}
      <NexusCard>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "سجل التدقيق" : "AUDIT TRAIL"}
          </div>
        </div>

        {audit.isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-4 w-4 animate-spin text-cyan-300" />
          </div>
        ) : (audit.data ?? []).length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            {ar ? "لا توجد سجلات" : "No audit entries"}
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-white/5 font-mono text-[11px] max-h-[420px] overflow-auto">
            {(audit.data ?? []).map((row) => (
              <li key={row.id} className="flex items-start gap-3 py-2 text-slate-300">
                <span className="w-24 shrink-0 text-slate-500">
                  {new Date(row.occurred_at).toLocaleString(ar ? "ar" : "en", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <NexusPill
                  tone={row.status === "ok" ? "emerald" : row.status === "error" ? "rose" : "amber"}
                >
                  {row.status}
                </NexusPill>
                <span className="min-w-0 flex-1">
                  <span className="text-cyan-200">{row.action}</span>
                  {row.entity && <span className="ms-1 text-slate-400">on {row.entity}</span>}
                  {row.actor_email && (
                    <span className="ms-1 text-slate-500">· by {row.actor_email}</span>
                  )}
                  {row.route && <span className="ms-1 text-slate-600">· {row.route}</span>}
                </span>
                {row.duration_ms != null && (
                  <span className="shrink-0 text-slate-500">{row.duration_ms}ms</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </NexusCard>

      {/* Secret Vault (admin only) */}
      {canManage && (
        <NexusCard>
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-cyan-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
              {ar ? "جرد الأسرار (أسماء فقط)" : "SECRET INVENTORY (names only)"}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {ar
              ? "قيم الأسرار لا تُعرض أبداً. تُدار في إعدادات المنصة."
              : "Secret values are never shown. Manage them in platform settings."}
          </div>

          {secrets.isLoading ? (
            <div className="py-6 text-center">
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-cyan-300" />
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(secrets.data ?? []).map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] p-2 text-[11px]"
                >
                  <div>
                    <div className="font-mono font-semibold text-white">{s.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">
                      {s.category}
                    </div>
                  </div>
                  {s.configured ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-slate-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </NexusCard>
      )}

      {!canManage && (
        <NexusCard>
          <div className="flex items-center gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] text-amber-100">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {ar
              ? "أنت في وضع القراءة فقط. تحتاج دور مسؤول منصة لتعديل الأدوار أو استعراض جرد الأسرار."
              : "You are in read-only mode. Platform admin role required to change roles or view secret inventory."}
          </div>
        </NexusCard>
      )}
    </NexusPage>
  );
}
