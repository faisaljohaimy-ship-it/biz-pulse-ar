// Knowledge Upload Center — enterprise SOP ingestion.
// Pipeline: client extracts text (PDF.js / mammoth) → uploads file to the
// aria-documents bucket → server fn creates the row and invokes
// /api/public/hooks/aria-docs-ingest with the extracted text → polls
// bilingual chunk stats + citation readiness until ready.
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  UploadCloud, FileText, Loader2, CheckCircle2, AlertTriangle,
  Languages, BookOpenCheck, Sparkles, Trash2,
} from "lucide-react";
import {
  enqueueKnowledgeIngest,
  getKnowledgeChunkStats,
} from "@/lib/aria/knowledge-upload.functions";
import {
  listAriaDocuments,
  deleteAriaDocument,
} from "@/lib/aria/documents.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/knowledge-upload")({
  component: KnowledgeUploadCenter,
  head: () => ({
    meta: [
      { title: "Knowledge Upload Center — NEXIOS AI OS" },
      { name: "description", content: "Enterprise SOP ingestion with bilingual chunking and citation readiness." },
    ],
  }),
});

const BUCKET = "aria-documents";

type Phase = "idle" | "extracting" | "uploading" | "enqueuing" | "ingesting" | "done" | "error";

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
  throw new Error("Unsupported file type. Upload PDF, DOCX, or plain text. / نوع غير مدعوم.");
}

type ActiveJob = {
  fileName: string;
  phase: Phase;
  documentId?: string;
  error?: string;
};

function KnowledgeUploadCenter() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [job, setJob] = useState<ActiveJob | null>(null);

  const enqueueFn = useServerFn(enqueueKnowledgeIngest);
  const statsFn = useServerFn(getKnowledgeChunkStats);
  const deleteFn = useServerFn(deleteAriaDocument);

  const docsQ = useQuery({
    queryKey: ["knowledge-upload", "docs"],
    queryFn: () => listAriaDocuments(),
    refetchInterval: 4000,
  });

  // Live stats for the active job (polls every 2s while ingesting).
  const statsQ = useQuery({
    queryKey: ["knowledge-upload", "stats", job?.documentId],
    queryFn: () => statsFn({ data: { document_id: job!.documentId! } }),
    enabled: !!job?.documentId && job.phase === "ingesting",
    refetchInterval: 2000,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-upload", "docs"] }),
  });

  const handleFile = async (file: File) => {
    setJob({ fileName: file.name, phase: "extracting" });
    try {
      const { text, pages } = await extractText(file);
      if (!text.trim()) throw new Error("No extractable text. / لا يمكن استخراج النص.");

      let storagePath: string | undefined;
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        setJob((j) => j && { ...j, phase: "uploading" });
        const path = `${u.user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
        if (!upErr) storagePath = path;
      }

      setJob((j) => j && { ...j, phase: "enqueuing" });
      const res = await enqueueFn({
        data: {
          title: file.name,
          text,
          storage_path: storagePath,
          mime_type: file.type || undefined,
          size_bytes: file.size,
          page_count: pages,
        },
      });

      setJob({ fileName: file.name, phase: "ingesting", documentId: res.document_id });
      qc.invalidateQueries({ queryKey: ["knowledge-upload", "docs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setJob({ fileName: file.name, phase: "error", error: msg });
    }
  };

  // When the polled document is ready/partial/failed, finalize the job state.
  const docs = docsQ.data ?? [];
  if (job?.phase === "ingesting" && job.documentId) {
    const live = docs.find((d) => d.id === job.documentId);
    if (live && (live.status === "ready" || live.status === "partial")) {
      setTimeout(() => setJob({ ...job, phase: "done" }), 0);
    } else if (live && live.status === "failed") {
      setTimeout(() => setJob({ ...job, phase: "error", error: live.error ?? "ingest_failed" }), 0);
    }
  }

  const stats = statsQ.data ?? { total: 0, embedded: 0, ar: 0, en: 0, mixed: 0, citation_ready: false };

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <BookOpenCheck className="h-8 w-8 text-primary" />
          Knowledge Upload Center · مركز رفع المعرفة
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload SOPs, policies, and operations manuals (PDF / DOCX / TXT). Each
          file is chunked bilingually (AR / EN), embedded, and made citation-ready
          for ARIA via{" "}
          <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">
            /api/public/hooks/aria-docs-ingest
          </code>.
        </p>
      </header>

      {/* Drop zone */}
      <section
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !job?.phase.match(/extracting|uploading|enqueuing|ingesting/)) handleFile(f);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed transition-colors p-8 text-center bg-card/30 backdrop-blur",
          dragOver ? "border-primary bg-primary/5" : "border-border/60",
        )}
      >
        <UploadCloud className="h-10 w-10 mx-auto text-primary mb-3" />
        <p className="font-semibold">Drop a file here, or click to choose</p>
        <p className="text-xs text-muted-foreground mt-1">PDF · DOCX · TXT · MD (up to 50MB)</p>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt,.md"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
        <Button
          className="mt-4"
          onClick={() => fileRef.current?.click()}
          disabled={job?.phase === "extracting" || job?.phase === "uploading" || job?.phase === "enqueuing" || job?.phase === "ingesting"}
        >
          {job && (job.phase !== "idle" && job.phase !== "done" && job.phase !== "error")
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <UploadCloud className="h-4 w-4 mr-2" />}
          Choose file
        </Button>
      </section>

      {/* Progress card */}
      {job && job.phase !== "idle" && (
        <section className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{job.fileName}</div>
              <div className="text-xs text-muted-foreground">
                Pipeline: extract → upload → enqueue → <code>aria-docs-ingest</code> → chunk + embed
              </div>
            </div>
            <PhaseBadge phase={job.phase} />
          </div>

          <PhaseStepper phase={job.phase} />

          {(job.phase === "ingesting" || job.phase === "done") && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <Stat label="Chunks" value={stats.total} />
              <Stat label="Embedded" value={`${stats.embedded}/${stats.total || 0}`} />
              <Stat
                label="Arabic / English"
                value={`${stats.ar} · ${stats.en}${stats.mixed ? ` · ${stats.mixed}m` : ""}`}
                icon={<Languages className="h-3.5 w-3.5 text-primary" />}
              />
              <Stat
                label="Citation Ready"
                value={stats.citation_ready ? "Yes" : "Pending"}
                icon={stats.citation_ready
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  : <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />}
              />
            </div>
          )}

          {stats.total > 0 && (
            <BilingualBar ar={stats.ar} en={stats.en} mixed={stats.mixed} />
          )}

          {job.phase === "error" && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="break-all">{job.error}</span>
            </div>
          )}
          {job.phase === "done" && (
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              <Sparkles className="h-4 w-4" />
              Ingested · ARIA can now cite this document.
            </div>
          )}
        </section>
      )}

      {/* Library */}
      <section className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          Knowledge Library ({docs.length})
        </h2>
        {docsQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />Loading…
          </div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents yet. Upload your first SOP to make it citation-ready.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {docs.map((d) => (
              <div key={d.id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{d.title}</span>
                    <StatusBadge status={d.status} />
                    {(d.chunk_count ?? 0) > 0 && (
                      <span className="text-[10px] text-muted-foreground">{d.chunk_count} chunks</span>
                    )}
                    {(d.page_count ?? 0) > 0 && (
                      <span className="text-[10px] text-muted-foreground">· {d.page_count} pages</span>
                    )}
                  </div>
                  {d.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.summary}</p>}
                  {d.error && <p className="text-xs text-destructive mt-1 break-all">{d.error}</p>}
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

function Stat({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}{label}
      </div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function BilingualBar({ ar, en, mixed }: { ar: number; en: number; mixed: number }) {
  const total = ar + en + mixed;
  if (total === 0) return null;
  const arPct = (ar / total) * 100;
  const enPct = (en / total) * 100;
  const mxPct = (mixed / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        <span>Bilingual Chunking</span>
        <span>{Math.round(arPct)}% AR · {Math.round(enPct)}% EN{mxPct ? ` · ${Math.round(mxPct)}% Mixed` : ""}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-muted/40 flex">
        <div className="bg-primary" style={{ width: `${arPct}%` }} />
        <div className="bg-emerald-400" style={{ width: `${enPct}%` }} />
        <div className="bg-muted-foreground/60" style={{ width: `${mxPct}%` }} />
      </div>
    </div>
  );
}

function PhaseStepper({ phase }: { phase: Phase }) {
  const steps: { key: Phase; label: string }[] = [
    { key: "extracting", label: "Extract text" },
    { key: "uploading", label: "Upload to bucket" },
    { key: "enqueuing", label: "Invoke hook" },
    { key: "ingesting", label: "Chunk + embed" },
    { key: "done", label: "Citation ready" },
  ];
  const order = ["extracting", "uploading", "enqueuing", "ingesting", "done"];
  const idx = order.indexOf(phase);
  return (
    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
      {steps.map((s, i) => {
        const active = i === idx;
        const done = i < idx || phase === "done";
        return (
          <div
            key={s.key}
            className={cn(
              "px-2 py-1 rounded-full border flex items-center gap-1",
              done && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
              active && "border-primary/50 bg-primary/10 text-primary",
              !done && !active && "border-border/40 text-muted-foreground",
            )}
          >
            {done ? <CheckCircle2 className="h-3 w-3" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

function PhaseBadge({ phase }: { phase: Phase }) {
  const map: Record<Phase, { cls: string; label: string }> = {
    idle:       { cls: "bg-muted text-muted-foreground border-border", label: "Idle" },
    extracting: { cls: "bg-primary/15 text-primary border-primary/30", label: "Extracting" },
    uploading:  { cls: "bg-primary/15 text-primary border-primary/30", label: "Uploading" },
    enqueuing:  { cls: "bg-primary/15 text-primary border-primary/30", label: "Enqueuing" },
    ingesting:  { cls: "bg-primary/15 text-primary border-primary/30", label: "Ingesting" },
    done:       { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "Done" },
    error:      { cls: "bg-destructive/15 text-destructive border-destructive/30", label: "Error" },
  };
  const e = map[phase];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", e.cls)}>
      {e.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ready:      { label: "Ready",      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    partial:    { label: "Partial",    cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    processing: { label: "Processing", cls: "bg-primary/15 text-primary border-primary/30" },
    pending:    { label: "Pending",    cls: "bg-muted text-muted-foreground border-border" },
    failed:     { label: "Failed",     cls: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const e = map[status] ?? map.pending;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", e.cls)}>
      {e.label}
    </span>
  );
}
