import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/knowledge")({
  component: KnowledgePage,
});

type Doc = { id: string; title: string; content: string; tags: string[]; created_at: string };

function KnowledgePage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);

  const { data: docs = [] } = useQuery({
    queryKey: ["kb", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("knowledge_docs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Doc[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("knowledge_docs").insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle(""); setContent(""); setOpen(false);
      qc.invalidateQueries({ queryKey: ["kb"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("knowledge_docs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb"] }),
  });

  return (
    <Section>
      <PageHeader
        icon={BookOpen}
        title={t("nav.knowledge")}
        subtitle={locale === "ar" ? "مستودع المعرفة الذي يغذي وكلائك الذكيين." : "The knowledge corpus that powers your agents."}
        actions={
          <Button onClick={() => setOpen((v) => !v)}>
            <Plus className="h-4 w-4" />
            {t("common.new")}
          </Button>
        }
      />

      {open && (
        <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={locale === "ar" ? "العنوان" : "Title"} />
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={locale === "ar" ? "المحتوى..." : "Content..."} rows={6} />
          <div className="flex gap-2">
            <Button onClick={() => create.mutate()} disabled={!title.trim() || !content.trim() || create.isPending}>
              {t("common.save")}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {docs.map((d) => (
          <div key={d.id} className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{d.title}</h3>
              <button onClick={() => del.mutate(d.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">{d.content}</p>
          </div>
        ))}
        {docs.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center text-sm text-muted-foreground">
            {locale === "ar" ? "ابدأ ببناء قاعدة معرفتك" : "Start building your knowledge base"}
          </div>
        )}
      </div>
    </Section>
  );
}
