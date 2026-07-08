import { useState } from "react";
import { BookOpen, FileText, Brain, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type CitationItem = {
  kind: "document" | "knowledge" | "memory";
  id: string;
  title: string;
  source?: string | null;
  similarity: number;
  tag: string;
  excerpt: string;
};

export type CoverageInfo = {
  available: number;
  cited: number;
  citedTags: string[];
  uncitedTags: string[];
  coverageRatio: number;
  status: "grounded" | "partial" | "uncited" | "no-sources";
};

const KIND_ICON = {
  document: FileText,
  knowledge: BookOpen,
  memory: Brain,
} as const;

const STATUS_LABEL: Record<
  CoverageInfo["status"],
  { ar: string; en: string; tone: string; Icon: typeof ShieldCheck }
> = {
  grounded: {
    ar: "موثّق بالمصادر",
    en: "Grounded",
    tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    Icon: ShieldCheck,
  },
  partial: {
    ar: "موثّق جزئياً",
    en: "Partially grounded",
    tone: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    Icon: ShieldAlert,
  },
  uncited: {
    ar: "بدون اقتباس",
    en: "Sources uncited",
    tone: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    Icon: ShieldAlert,
  },
  "no-sources": {
    ar: "لا مصادر",
    en: "No retrieved sources",
    tone: "bg-muted text-muted-foreground border-border",
    Icon: ShieldQuestion,
  },
};

export function CitationsPanel({
  citations,
  coverage,
  locale = "en",
}: {
  citations: CitationItem[];
  coverage?: CoverageInfo;
  locale?: "ar" | "en";
}) {
  const [open, setOpen] = useState<CitationItem | null>(null);
  if (!citations?.length && !coverage) return null;

  const sourceCitations = citations.filter((c) => c.kind !== "memory");
  if (!sourceCitations.length && coverage?.status === "no-sources") return null;

  const status = coverage ? STATUS_LABEL[coverage.status] : null;
  const isUncited = coverage?.status === "uncited" && coverage.available > 0;

  return (
    <>
      <div className="mt-3 rounded-xl border border-border/60 bg-card/50 p-3 backdrop-blur">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
          {status && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
                status.tone,
              )}
            >
              <status.Icon className="h-3 w-3" />
              {locale === "ar" ? status.ar : status.en}
              {coverage && coverage.available > 0 && (
                <span className="opacity-70">
                  · {coverage.cited}/{coverage.available}
                </span>
              )}
            </span>
          )}
          <span className="text-muted-foreground">
            {locale === "ar" ? "المصادر المرجعية" : "Citations"}
          </span>
        </div>

        {isUncited && (
          <div className="mb-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-2 py-1 text-[11px] text-rose-300">
            {locale === "ar"
              ? "تم استرجاع مصادر لكن الإجابة لم تستشهد بها صراحة."
              : "Sources were retrieved but the answer did not cite them explicitly."}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {sourceCitations.map((c) => {
            const Icon = KIND_ICON[c.kind];
            const wasCited = coverage?.citedTags.includes(c.tag);
            return (
              <button
                key={`${c.kind}:${c.id}`}
                type="button"
                onClick={() => setOpen(c)}
                className={cn(
                  "group inline-flex max-w-[260px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all",
                  wasCited
                    ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                    : "border-border bg-muted/40 text-foreground/70 hover:border-primary/40 hover:text-foreground",
                )}
                title={c.tag}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{c.title}</span>
                <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px] font-mono">
                  {Math.round(c.similarity * 100)}%
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const I = KIND_ICON[open.kind];
                    return <I className="h-4 w-4 text-primary" />;
                  })()}
                  {open.title}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-primary">{open.tag}</span>
                  {open.source && <span>· {open.source}</span>}
                  <span>· {Math.round(open.similarity * 100)}% match</span>
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed">
                {open.excerpt ||
                  (locale === "ar" ? "لا يوجد مقتطف متاح." : "No excerpt available.")}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {locale === "ar"
                  ? "هذا المقتطف من قاعدة المعرفة المُستوعَبة. لاستعراض المستند الكامل افتح مركز رفع المعرفة."
                  : "Verified excerpt from the ingested knowledge base. Open the Knowledge Upload center for the full document."}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
