import { RouteError, RouteNotFound } from "@/components/route-boundaries";
// Knowledge Upload Center — enterprise SOP ingestion.
// Pipeline: client extracts text (PDF.js / mammoth) → uploads file to the
// aria-documents bucket → server fn creates the row and invokes
// /api/public/hooks/sadeed-docs-ingest with the extracted text → polls
// bilingual chunk stats + citation readiness until ready.
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Languages,
  BookOpenCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  enqueueKnowledgeIngest,
  getKnowledgeChunkStats,
} from "@/lib/sadeed/knowledge-upload.functions";
import { listSadeedDocuments, deleteSadeedDocument } from "@/lib/sadeed/documents.functions";
import {
  INGEST_EXPIRED_MESSAGE,
  INGEST_MISSING_MESSAGE,
  ingestPollVerdict,
  knowledgeErrorForDisplay,
  knowledgeLimitHint,
} from "@/lib/sadeed/knowledge-ingest-core";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { userFacingError } from "@/lib/errors/user-facing-error";

export const Route = createFileRoute("/_authenticated/knowledge-upload")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: KnowledgeUploadCenter,
  head: () => ({
    meta: [
      { title: "Knowledge Upload Center — SADEED" },
      {
        name: "description",
        content: "Enterprise SOP ingestion with bilingual chunking and citation readiness.",
      },
    ],
  }),
});

import { previewImport, IMPORT_ACCEPT, type ImportPreview } from "@/lib/ingestion/preview";

const BUCKET = "aria-documents";

type Phase =
  "idle" | "preview" | "extracting" | "uploading" | "enqueuing" | "ingesting" | "done" | "error";

type ActiveJob = {
  fileName: string;
  phase: Phase;
  documentId?: string;
  error?: string;
  /** Arabic notice when the same text was already ingested (no new row). */
  notice?: string;
  /** Page clock when the job entered "ingesting" (ceiling + missing-row check). */
  startedAt?: number;
};

function KnowledgeUploadCenter() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<{ file: File; preview: ImportPreview } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const busyRef = useRef(false);
  const [dragOver, setDragOver] = useState(false);
  const [job, setJob] = useState<ActiveJob | null>(null);
  // Bumped by a timer so the ingesting-phase ceiling is re-checked even when
  // the library listing stops changing.
  const [clock, setClock] = useState(0);

  const enqueueFn = useServerFn(enqueueKnowledgeIngest);
  const statsFn = useServerFn(getKnowledgeChunkStats);
  const deleteFn = useServerFn(deleteSadeedDocument);

  const docsQ = useQuery({
    queryKey: ["knowledge-upload", "docs"],
    queryFn: () => listSadeedDocuments(),
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
  });

  // Live stats for the active job: polled while ingesting, fetched (once)
  // for a finished job too — a duplicate of a ready document jumps straight
  // to "done" and would otherwise show all-zero stats beside "Ingested".
  const statsQ = useQuery({
    queryKey: ["knowledge-upload", "stats", job?.documentId],
    queryFn: () => statsFn({ data: { document_id: job!.documentId! } }),
    enabled: !!job?.documentId && (job.phase === "ingesting" || job.phase === "done"),
    refetchInterval: job?.phase === "ingesting" ? 15000 : false,
    refetchIntervalInBackground: false,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-upload", "docs"] }),
  });

  const handleFile = async (file: File) => {
    if (busyRef.current) return;
    busyRef.current = true;
    pendingRef.current = null;
    setPreview(null);
    setJob({ fileName: file.name, phase: "extracting" });
    try {
      const result = await previewImport(file);
      pendingRef.current = { file, preview: result };
      setPreview(result);
      setJob({ fileName: file.name, phase: "preview" });
    } catch (error) {
      setJob({ fileName: file.name, phase: "error", error: userFacingError(error) });
    } finally {
      busyRef.current = false;
    }
  };

  const confirmImport = async () => {
    const pending = pendingRef.current;
    if (!pending || busyRef.current) return;
    busyRef.current = true;
    pendingRef.current = null;
    setPreview(null);
    const {
      file,
      preview: { text, pages },
    } = pending;
    try {
      let storagePath: string | undefined;
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        setJob((j) => j && { ...j, phase: "uploading" });
        const path = `${u.user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false });
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

      if (res.deduped) {
        // Nothing new was created: drop the file we just stored (best effort).
        if (storagePath) {
          void supabase.storage
            .from(BUCKET)
            .remove([storagePath])
            .catch(() => undefined);
        }
        setJob({
          fileName: file.name,
          phase: res.status === "ready" ? "done" : "ingesting",
          documentId: res.document_id,
          startedAt: Date.now(),
          notice:
            res.status === "ready"
              ? "هذا المستند مرفوع ومُعالَج مسبقًا بالنص نفسه، فلم تُنشأ نسخة مكررة."
              : "هذا المستند قيد المعالجة بالفعل بالنص نفسه، فلم تُنشأ نسخة مكررة.",
        });
      } else {
        setJob({
          fileName: file.name,
          phase: "ingesting",
          documentId: res.document_id,
          startedAt: Date.now(),
        });
      }
      qc.invalidateQueries({ queryKey: ["knowledge-upload", "docs"] });
    } catch (e) {
      const msg = userFacingError(e);
      setJob({ fileName: file.name, phase: "error", error: msg });
    } finally {
      busyRef.current = false;
    }
  };

  // Finalize an ingesting job from the polled library row: ready/partial →
  // done, failed → error, and — so the page can never spin forever on a row
  // nothing will update (e.g. a duplicate of a run whose Worker died) — a
  // ceiling equal to the server's de-dup window, plus a vanished-row check.
  // The in-progress duplicate notice is cleared on every terminal state.
  const docsData = docsQ.data;
  const docsFetchedAt = docsQ.dataUpdatedAt;
  useEffect(() => {
    if (job?.phase !== "ingesting" || !job.documentId) return;
    const startedAt = job.startedAt ?? Date.now();
    const live = (docsData ?? []).find((d) => d.id === job.documentId);
    const verdict = ingestPollVerdict({ live, listFetchedAt: docsFetchedAt, startedAt });
    if (verdict === "waiting") {
      const timer = setTimeout(() => setClock((c) => c + 1), 30_000);
      return () => clearTimeout(timer);
    }
    if (verdict === "done") {
      setJob({ ...job, phase: "done", notice: undefined });
      return;
    }
    const error =
      verdict === "failed"
        ? knowledgeErrorForDisplay(live?.error)
        : verdict === "expired"
          ? INGEST_EXPIRED_MESSAGE
          : INGEST_MISSING_MESSAGE;
    setJob({ ...job, phase: "error", error, notice: undefined });
  }, [job, docsData, docsFetchedAt, clock]);

  const docs = docsData ?? [];

  const stats = statsQ.data ?? {
    total: 0,
    embedded: 0,
    ar: 0,
    en: 0,
    mixed: 0,
    citation_ready: false,
  };

  return (
    <div dir="rtl" className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <BookOpenCheck className="h-8 w-8 text-primary" />
          Knowledge Upload Center · مركز رفع المعرفة
        </h1>
        <p className="text-muted-foreground text-sm">
          افحص المستند محليًا، ثم راجع النص قبل اعتماده للرفع إلى مكتبة المعرفة. المعالجة والفهرسة
          تخضعان لصلاحياتك وحصة النموذج المهيأة؛ جاهزية الاستشهاد تُقاس بعد المعالجة.
        </p>
      </header>

      {/* Drop zone */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
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
        <p className="font-semibold">اسحب ملفًا هنا أو اختر ملفًا للمعاينة</p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF · DOCX · XLSX · CSV · JSON · TXT · MD — حتى ١٠ ميجابايت
        </p>
        <p className="text-xs text-muted-foreground mt-1">{knowledgeLimitHint()}</p>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept={IMPORT_ACCEPT}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
        <Button
          className="mt-4"
          onClick={() => fileRef.current?.click()}
          disabled={
            job?.phase === "extracting" ||
            job?.phase === "uploading" ||
            job?.phase === "enqueuing" ||
            job?.phase === "ingesting"
          }
        >
          {job && job.phase !== "idle" && job.phase !== "done" && job.phase !== "error" ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <UploadCloud className="h-4 w-4 mr-2" />
          )}
          اختيار ملف
        </Button>
      </section>

      {preview && job?.phase === "preview" && (
        <section
          aria-label="معاينة الاستيراد"
          className="rounded-xl border border-border bg-card p-5 space-y-4"
        >
          <h2 className="text-lg font-semibold">FNN · تقرير التحقق قبل الرفع</h2>
          <p className="text-sm">
            المصدر: {job.fileName} · {preview.text.length.toLocaleString("ar-SA")} حرف
            {preview.rows !== null ? ` · ${preview.rows.toLocaleString("ar-SA")} صف` : ""}
            {preview.pages ? ` · ${preview.pages} صفحة` : ""}
          </p>
          {preview.columns.length > 0 && (
            <p className="text-sm break-words">
              الحقول المستخرجة: {preview.columns.join(" · ")}. الوجهة: نص معرفي؛ لا تُكتب جداول
              تشغيلية.
            </p>
          )}
          <p className="text-sm">
            الصفوف المتطابقة المستبعدة داخل الجدول: {preview.duplicateRows}. يفحص الخادم تكرار
            المستند ضمن المؤسسة عند الاعتماد.
          </p>
          <p className="text-sm text-muted-foreground">
            فحص البرمجيات الخبيثة غير متاح. المعاينة ليست شهادة سلامة؛ اعتمد الملفات من مصدر موثوق
            فقط. النص بيانات مرجعية وليس تعليمات تنفيذ للوكلاء.
          </p>
          <pre
            className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-sm"
            dir="auto"
          >
            {preview.text.slice(0, 6000)}
          </pre>
          <p className="text-xs break-all text-muted-foreground" dir="ltr">
            SHA-256: {preview.revisionHash}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button className="min-h-11" onClick={confirmImport}>
              اعتماد رفع الملف ومعالجته
            </Button>
            <Button
              className="min-h-11"
              variant="outline"
              onClick={() => {
                pendingRef.current = null;
                setPreview(null);
                setJob(null);
              }}
            >
              إلغاء
            </Button>
          </div>
        </section>
      )}

      {/* Progress card */}
      {job && job.phase !== "idle" && job.phase !== "preview" && (
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

          {(job.phase === "ingesting" || (job.phase === "done" && statsQ.data)) && (
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
                icon={
                  stats.citation_ready ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : job.phase === "ingesting" ? (
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  )
                }
              />
            </div>
          )}

          {stats.total > 0 && <BilingualBar ar={stats.ar} en={stats.en} mixed={stats.mixed} />}

          {job.notice && (
            <div className="flex items-start gap-2 text-sm text-primary bg-primary/10 border border-primary/30 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{job.notice}</span>
            </div>
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
              Ingested · SADEED can now cite this document.
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
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لا مستندات بعد. ارفع أول إجراء تشغيلي (SOP) ليصبح جاهزًا للاستشهاد.
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
                      <span className="text-[12px] text-muted-foreground">
                        {d.chunk_count} chunks
                      </span>
                    )}
                    {(d.page_count ?? 0) > 0 && (
                      <span className="text-[12px] text-muted-foreground">
                        · {d.page_count} pages
                      </span>
                    )}
                  </div>
                  {d.summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.summary}</p>
                  )}
                  {d.error && (
                    <p className="text-xs text-destructive mt-1 break-all">
                      {knowledgeErrorForDisplay(d.error)}
                    </p>
                  )}
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

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
      <div className="text-[12px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
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
      <div className="flex justify-between text-[12px] uppercase tracking-wider text-muted-foreground mb-1">
        <span>Bilingual Chunking</span>
        <span>
          {Math.round(arPct)}% AR · {Math.round(enPct)}% EN
          {mxPct ? ` · ${Math.round(mxPct)}% Mixed` : ""}
        </span>
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
    <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
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
            {done ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : active ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : null}
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

function PhaseBadge({ phase }: { phase: Phase }) {
  const map: Record<Phase, { cls: string; label: string }> = {
    preview: { cls: "bg-muted text-muted-foreground border-border", label: "بانتظار الاعتماد" },
    idle: { cls: "bg-muted text-muted-foreground border-border", label: "Idle" },
    extracting: { cls: "bg-primary/15 text-primary border-primary/30", label: "Extracting" },
    uploading: { cls: "bg-primary/15 text-primary border-primary/30", label: "Uploading" },
    enqueuing: { cls: "bg-primary/15 text-primary border-primary/30", label: "Enqueuing" },
    ingesting: { cls: "bg-primary/15 text-primary border-primary/30", label: "Ingesting" },
    done: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "Done" },
    error: { cls: "bg-destructive/15 text-destructive border-destructive/30", label: "Error" },
  };
  const e = map[phase];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium",
        e.cls,
      )}
    >
      {e.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ready: { label: "Ready", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    partial: { label: "Partial", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    processing: { label: "Processing", cls: "bg-primary/15 text-primary border-primary/30" },
    pending: { label: "Pending", cls: "bg-muted text-muted-foreground border-border" },
    failed: { label: "Failed", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const e = map[status] ?? map.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium",
        e.cls,
      )}
    >
      {e.label}
    </span>
  );
}
