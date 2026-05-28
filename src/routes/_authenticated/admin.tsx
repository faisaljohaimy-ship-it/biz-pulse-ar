import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shield, Users, MessageSquare, ListChecks, Database } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, ModuleCard } from "@/components/page-header";

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
    </Section>
  );
}
