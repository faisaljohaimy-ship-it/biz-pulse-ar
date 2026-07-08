import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookMarked, Plus, Copy, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/prompts")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: PromptsPage,
});

type Prompt = { id: string; title: string; body: string; category: string; is_shared: boolean };

function PromptsPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [open, setOpen] = useState(false);

  const { data: prompts = [] } = useQuery({
    queryKey: ["prompts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Prompt[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("prompts").insert({
        user_id: user.id,
        title: title.trim(),
        body: body.trim(),
        category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setBody("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["prompts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prompts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prompts"] }),
  });

  return (
    <Section>
      <PageHeader
        icon={BookMarked}
        title={t("nav.prompts")}
        subtitle={
          locale === "ar" ? "احفظ وأعد استخدام أفضل أوامرك." : "Save and reuse your best prompts."
        }
        actions={
          <Button onClick={() => setOpen((v) => !v)}>
            <Plus className="h-4 w-4" />
            {t("common.new")}
          </Button>
        }
      />

      {open && (
        <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={locale === "ar" ? "اسم القالب" : "Prompt name"}
          />
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={locale === "ar" ? "التصنيف" : "Category"}
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder={locale === "ar" ? "نص الأمر..." : "Prompt body..."}
          />
          <div className="flex gap-2">
            <Button onClick={() => create.mutate()} disabled={!title.trim() || !body.trim()}>
              {t("common.save")}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {prompts.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{p.title}</h3>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {p.category}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(p.body);
                    toast.success(locale === "ar" ? "تم النسخ" : "Copied");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => del.mutate(p.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{p.body}</pre>
          </div>
        ))}
        {prompts.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {locale === "ar" ? "لا توجد أوامر محفوظة" : "No saved prompts yet"}
          </div>
        )}
      </div>
    </Section>
  );
}
