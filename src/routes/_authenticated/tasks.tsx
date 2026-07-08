import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/tasks")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: TasksPage,
});

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_agent: string | null;
  created_at: string;
};

const STATUSES = ["todo", "in_progress", "done"] as const;

function TasksPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user || !title.trim()) return;
      const { error } = await supabase
        .from("tasks")
        .insert({ user_id: user.id, title: title.trim(), priority });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async (vars: { id: string; status: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: vars.status })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <Section>
      <PageHeader
        icon={ListChecks}
        title={t("nav.tasks")}
        subtitle={
          locale === "ar"
            ? "نظّم مهام فريقك مع تعيين تلقائي للوكلاء."
            : "Organize team tasks with auto agent assignment."
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-card/60 p-3 sm:flex-row"
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={locale === "ar" ? "أضف مهمة جديدة..." : "Add a new task..."}
          className="flex-1"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-md border border-border bg-input px-3 text-sm"
        >
          <option value="low">{locale === "ar" ? "منخفض" : "Low"}</option>
          <option value="medium">{locale === "ar" ? "متوسط" : "Medium"}</option>
          <option value="high">{locale === "ar" ? "عالٍ" : "High"}</option>
        </select>
        <Button type="submit" disabled={!title.trim() || create.isPending}>
          <Plus className="h-4 w-4" />
          {t("common.new")}
        </Button>
      </form>

      <div className="grid gap-4 lg:grid-cols-3">
        {STATUSES.map((s) => (
          <div key={s} className="rounded-2xl border border-border bg-card/40 p-3">
            <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {locale === "ar"
                ? { todo: "للتنفيذ", in_progress: "قيد العمل", done: "منجزة" }[s]
                : { todo: "To do", in_progress: "In progress", done: "Done" }[s]}
              <span className="ms-2 text-muted-foreground/60">
                {tasks.filter((t) => t.status === s).length}
              </span>
            </div>
            <div className="space-y-2">
              {isLoading && (
                <div className="text-xs text-muted-foreground">{t("common.loading")}</div>
              )}
              {tasks
                .filter((t) => t.status === s)
                .map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border border-border bg-background/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium">{task.title}</div>
                      <button
                        onClick={() => del.mutate(task.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      {STATUSES.filter((x) => x !== s).map((x) => (
                        <button
                          key={x}
                          onClick={() => updateStatus.mutate({ id: task.id, status: x })}
                          className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          →{" "}
                          {locale === "ar"
                            ? { todo: "للتنفيذ", in_progress: "قيد العمل", done: "منجزة" }[x]
                            : x.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
