// ARIA Document Intelligence — Wave 1 console.
// Upload PDFs / Word / Excel / text, then ask grounded questions across them.
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Upload, FileText, Loader2, Search, Trash2, FileSearch, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  listAriaDocuments,
  ingestAriaDocument,
  deleteAriaDocument,
  searchAriaDocuments,
} from "@/lib/aria/documents.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/aria-documents")({
  component: AriaDocumentsConsole,
});

const BUCKET = "aria-documents";

async function extractText(file: File): Promise<{ text: string; pages: number }> {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("text/") || /\.(txt|md|csv|json|log|xml|html)$/.test(name)) {
    return { text: await file.text(), pages: 0 };
  }
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const workerMod = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = (workerMod as { default: string }).default;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let out = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      out += content.items.map((i: unknown) => {
        const it = i as { str?: string };
        return typeof it.str === "string" ? it.str : "";
      }).join(" ") + "\n\n";
    }
    return { text: out, pages: doc.numPages };
  }
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = (await import("mammoth/mammoth.browser" as string)) as {
      extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    };
    const buf = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer: buf });
    return { text: res.value, pages: 0 };
  }
  if (/\.(xlsx|xls)$/.test(name) || file.type.includes("spreadsheetml")) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    let out = "";
    for (const sn of wb.SheetNames) {
      out += `# ${sn}\n` + XLSX.utils.sheet_to_csv(wb.Sheets[sn]) + "\n\n";
    }
    return { text: out, pages: wb.SheetNames.length };
  }
  throw new Error("نوع الملف غير مدعوم. ارفع PDF أو Word أو Excel أو نص.");
}

function AriaDocumentsConsole() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<{ name: string; phase: string } | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const ingestFn = useServerFn(ingestAriaDocument);
  const deleteFn = useServerFn(deleteAriaDocument);
  const searchFn = useServerFn(searchAriaDocuments);

  const docsQ = useQuery({
    queryKey: ["aria-documents"],
    queryFn: () => listAriaDocuments(),
    refetchInterval: 5000,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aria-documents"] }),
  });

  const searchMut = useMutation({
    mutationFn: (q: string) => searchFn({ data: { query: q, limit: 8 } }),
  });

  const handleUpload = async (file: File) => {
    setUploadErr(null);
    setUploadState({ name: file.name, phase: "extracting" });
    try {
      const { text, pages } = await extractText(file);
      if (!text.trim()) throw new Error("لا يمكن استخراج نص من هذا الملف");

      // Upload raw file to private storage (best-effort; ingestion still works without it)
      let storagePath: string | undefined;
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        setUploadState({ name: file.name, phase: "uploading" });
        const path = `${u.user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
        if (!upErr) storagePath = path;
      }

      setUploadState({ name: file.name, phase: "embedding" });
      await ingestFn({
        data: {
          title: file.name,
          text,
          storage_path: storagePath,
          mime_type: file.type || undefined,
          size_bytes: file.size,
          page_count: pages,
        },
      });
      setUploadState(null);
      qc.invalidateQueries({ queryKey: ["aria-documents"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setUploadErr(msg);
      setUploadState(null);
    }
  };

  const onSearch = () => {
    const q = query.trim();
    if (q.length < 2) return;
    searchMut.mutate(q);
  };

  const docs = docsQ.data ?? [];

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <FileSearch className="h-8 w-8 text-primary" />
          ذكاء المستندات — ARIA Document Intelligence
        </h1>
        <p className="text-muted-foreground text-sm">
          ارفع تقاريرك (PDF / Word / Excel / نص) — تُقطَّع وتُفهرس دلالياً لتجيب ARIA عليها بدقة.
        </p>
      </header>

      {/* Upload */}
      <section className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">رفع مستند جديد</h2>
              <p className="text-xs text-muted-foreground">PDF · DOCX · XLSX · TXT · CSV · JSON (حتى 50MB)</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.xlsx,.xls,.txt,.md,.csv,.json,.log"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={!!uploadState}>
            {uploadState ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
            اختر ملفاً
          </Button>
        </div>
        {uploadState && (
          <div className="mt-4 text-sm flex items-center gap-2 text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{uploadState.name} · {uploadState.phase === "extracting" ? "استخراج النص…" : uploadState.phase === "uploading" ? "حفظ الملف…" : "حساب التضمينات الدلالية…"}</span>
          </div>
        )}
        {uploadErr && (
          <div className="mt-4 text-sm flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> {uploadErr}
          </div>
        )}
      </section>

      {/* Semantic search */}
      <section className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">بحث دلالي في مستنداتك</h2>
        </div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }}
            placeholder="مثال: ما إجراءات الإخلاء في الحالات الحرجة؟"
            className="flex-1 rounded-lg border border-border/60 bg-background/60 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button onClick={onSearch} disabled={searchMut.isPending || query.trim().length < 2}>
            {searchMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        {searchMut.data && (
          <div className="space-y-2">
            {searchMut.data.matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة.</p>
            ) : searchMut.data.matches.map((m) => (
              <div key={m.chunk_id} className="rounded-lg border border-border/40 p-3 text-sm bg-background/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-primary text-xs">{m.title}</span>
                  <span className="text-[10px] text-muted-foreground">تطابق {Math.round(m.similarity * 100)}%</span>
                </div>
                <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap line-clamp-4">{m.content}</p>
              </div>
            ))}
          </div>
        )}
        {searchMut.isError && (
          <p className="text-sm text-destructive">{searchMut.error instanceof Error ? searchMut.error.message : "فشل البحث"}</p>
        )}
      </section>

      {/* Document list */}
      <section className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          المستندات المفهرسة ({docs.length})
        </h2>
        {docsQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />جاري التحميل…</div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد مستندات بعد. ارفع أول ملف لتبدأ ARIA بفهرسته دلالياً.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {docs.map((d) => (
              <div key={d.id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{d.title}</span>
                    <StatusBadge status={d.status} />
                    {d.chunk_count > 0 && (
                      <span className="text-[10px] text-muted-foreground">{d.chunk_count} مقطع</span>
                    )}
                    {d.page_count > 0 && (
                      <span className="text-[10px] text-muted-foreground">{d.page_count} صفحة</span>
                    )}
                  </div>
                  {d.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.summary}</p>}
                  {d.error && <p className="text-xs text-destructive mt-1">{d.error}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => delMut.mutate(d.id)}
                  disabled={delMut.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
    ready: { label: "جاهز", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
    processing: { label: "معالجة", cls: "bg-primary/15 text-primary border-primary/30", icon: Loader2 },
    pending: { label: "بانتظار", cls: "bg-muted text-muted-foreground border-border", icon: Loader2 },
    failed: { label: "فشل", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertTriangle },
  };
  const e = map[status] ?? map.pending;
  const Icon = e.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", e.cls)}>
      <Icon className={cn("h-3 w-3", status === "processing" && "animate-spin")} />
      {e.label}
    </span>
  );
}
