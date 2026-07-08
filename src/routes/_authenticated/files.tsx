import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderUp, UploadCloud, FileText, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/files")({
  component: FilesPage,
});

function FilesPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["files", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("uploads").list(user!.id, {
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const onPick = () => inputRef.current?.click();

  const upload = async (fileList: FileList | null) => {
    if (!fileList || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("uploads").upload(path, file);
        if (error) throw error;
      }
      toast.success(locale === "ar" ? "تم الرفع" : "Uploaded");
      qc.invalidateQueries({ queryKey: ["files"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (name: string) => {
    if (!user) return;
    const { error } = await supabase.storage.from("uploads").remove([`${user.id}/${name}`]);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["files"] });
  };

  return (
    <Section>
      <PageHeader
        icon={FolderUp}
        title={t("nav.files")}
        subtitle={
          locale === "ar"
            ? "ارفع المستندات لتحليلها بالذكاء الاصطناعي."
            : "Upload documents for AI-powered analysis."
        }
      />

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files);
        }}
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/40 p-10 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <UploadCloud className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="text-sm font-semibold">
          {locale === "ar" ? "اسحب الملفات أو اضغط للرفع" : "Drop files here or click to upload"}
        </div>
        <Button onClick={onPick} disabled={uploading}>
          {uploading ? t("common.loading") : locale === "ar" ? "اختر ملف" : "Choose file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card/60">
        <div className="border-b border-border p-3 text-sm font-semibold">
          {locale === "ar" ? "الملفات الأخيرة" : "Recent files"}
        </div>
        <div className="divide-y divide-border">
          {isLoading && (
            <div className="p-4 text-xs text-muted-foreground">{t("common.loading")}</div>
          )}
          {!isLoading && files.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {locale === "ar" ? "لا توجد ملفات بعد" : "No files yet"}
            </div>
          )}
          {files.map((f) => (
            <div key={f.name} className="flex items-center gap-3 p-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1 truncate text-sm">{f.name}</div>
              <button
                onClick={() => remove(f.name)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
