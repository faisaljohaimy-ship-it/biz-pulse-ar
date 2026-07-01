import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Users, MessageSquare, ListChecks, Database, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, ModuleCard } from "@/components/page-header";
import { useServerFn } from "@tanstack/react-start";
import {
  runSimulationSeedFn,
  validateSimulationFn,
  getSimulationStatusFn,
} from "@/lib/simulation/sim.functions";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats", user?.id],
    queryFn: async () => {
      const [threads, messages, tasks, prompts] = await Promise.all([
        supabase.from("threads").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }),
        supabase.from("prompts").select("id", { count: "exact", head: true }),
      ]);
      return {
        threads: threads.count ?? 0,
        messages: messages.count ?? 0,
        tasks: tasks.count ?? 0,
        prompts: prompts.count ?? 0,
      };
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const isAdmin = roles.some((r) => r.role === "admin");

  return (
    <Section>
      <PageHeader
        icon={Shield}
        title={t("nav.admin")}
        subtitle={locale === "ar" ? "إدارة المستخدمين والأدوار وضوابط النظام." : "Manage users, roles, and system controls."}
        badge={isAdmin ? "Admin" : "Member"}
      />

      {!isAdmin && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          {locale === "ar"
            ? "ليس لديك صلاحيات إدارية. اطلب من مالك مساحة العمل ترقيتك."
            : "You don't have admin privileges. Ask the workspace owner to promote you."}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ModuleCard icon={MessageSquare} title={locale === "ar" ? "المحادثات" : "Threads"}>
          <div className="text-2xl font-bold">{stats?.threads ?? "—"}</div>
        </ModuleCard>
        <ModuleCard icon={Database} title={locale === "ar" ? "الرسائل" : "Messages"}>
          <div className="text-2xl font-bold">{stats?.messages ?? "—"}</div>
        </ModuleCard>
        <ModuleCard icon={ListChecks} title={locale === "ar" ? "المهام" : "Tasks"}>
          <div className="text-2xl font-bold">{stats?.tasks ?? "—"}</div>
        </ModuleCard>
        <ModuleCard icon={Users} title={locale === "ar" ? "الأوامر" : "Prompts"}>
          <div className="text-2xl font-bold">{stats?.prompts ?? "—"}</div>
        </ModuleCard>
      </div>

      <div className="rounded-2xl border border-border bg-card/60 p-5">
        <h3 className="text-sm font-semibold">{locale === "ar" ? "صلاحياتك" : "Your roles"}</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {roles.length === 0 && (
            <span className="text-xs text-muted-foreground">{locale === "ar" ? "عضو عادي" : "Standard member"}</span>
          )}
          {roles.map((r) => (
            <span key={r.id} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {r.role}
            </span>
          ))}
        </div>
      </div>

      {isAdmin && <SimulationPanel locale={locale} />}
    </Section>
  );
}

function SimulationPanel({ locale }: { locale: string }) {
  const runSeed = useServerFn(runSimulationSeedFn);
  const validate = useServerFn(validateSimulationFn);
  const getStatus = useServerFn(getSimulationStatusFn);
  const [log, setLog] = useState<string>("");

  const status = useQuery({
    queryKey: ["sim-status"],
    queryFn: () => getStatus(),
  });

  const seedMut = useMutation({
    mutationFn: () => runSeed({ data: { seed: 20260101 } }),
    onSuccess: (r) => {
      setLog(JSON.stringify(r.counts, null, 2));
      status.refetch();
    },
    onError: (e: Error) => setLog(`Error: ${e.message}`),
  });

  const validateMut = useMutation({
    mutationFn: () => validate(),
    onSuccess: (r) => setLog(JSON.stringify(r, null, 2)),
    onError: (e: Error) => setLog(`Error: ${e.message}`),
  });

  return (
    <div className="rounded-2xl border border-primary/30 bg-card/60 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">
          {locale === "ar" ? "محرك المحاكاة المؤسسية" : "Enterprise Simulation Engine"}
        </h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {locale === "ar"
          ? "يولّد بيانات ديموغرافية وتشغيلية واقعية لجميع الوحدات (موظفون، إدارات، حوادث، تفتيش، مخاطر…). عملية آمنة قابلة للتكرار."
          : "Generates realistic, interconnected demo data across all modules (employees, departments, incidents, inspections, risks…). Safe and idempotent."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => seedMut.mutate()}
          disabled={seedMut.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {seedMut.isPending
            ? locale === "ar" ? "جارٍ التوليد…" : "Seeding…"
            : locale === "ar" ? "توليد بيانات المحاكاة" : "Run Simulation Seed"}
        </button>
        <button
          onClick={() => validateMut.mutate()}
          disabled={validateMut.isPending}
          className="rounded-lg border border-border px-4 py-2 text-xs font-semibold"
        >
          {locale === "ar" ? "تحقق من السلامة" : "Validate"}
        </button>
      </div>

      {status.data && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(status.data.tables).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-background/40 p-2">
              <div className="text-[10px] uppercase text-muted-foreground">{k.replace("sim_", "")}</div>
              <div className="text-lg font-bold text-primary">{v as number}</div>
            </div>
          ))}
        </div>
      )}

      {log && (
        <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-background/60 p-3 text-[11px]">{log}</pre>
      )}
    </div>
  );
}
