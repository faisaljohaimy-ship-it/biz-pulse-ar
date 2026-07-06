// /_authenticated/readiness — enterprise readiness scorecard.
// All values come from getReadinessReport (a real auth-gated server fn).
// Each chip is honestly labelled (pass / in_progress / scheduled /
// simulation / draft) and links to its evidence.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Clock3,
  CalendarClock,
  FlaskConical,
  FileEdit,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { getReadinessReport, type ReadinessChip, type ReadinessAxis } from "@/lib/readiness.functions";
import { MicrosoftPanel } from "@/components/readiness/MicrosoftPanel";

export const Route = createFileRoute("/_authenticated/readiness")({
  component: ReadinessPage,
});

const CHIP_STYLE: Record<
  ReadinessChip,
  { border: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pass: {
    border: "rgba(52,211,153,0.45)",
    bg: "rgba(52,211,153,0.10)",
    text: "#6EE7B7",
    icon: CheckCircle2,
  },
  in_progress: {
    border: "rgba(56,189,248,0.45)",
    bg: "rgba(56,189,248,0.10)",
    text: "#7DD3FC",
    icon: Clock3,
  },
  scheduled: {
    border: "rgba(167,139,250,0.45)",
    bg: "rgba(167,139,250,0.10)",
    text: "#C4B5FD",
    icon: CalendarClock,
  },
  simulation: {
    border: "rgba(251,146,60,0.45)",
    bg: "rgba(251,146,60,0.10)",
    text: "#FDBA74",
    icon: FlaskConical,
  },
  draft: {
    border: "rgba(148,163,184,0.45)",
    bg: "rgba(148,163,184,0.10)",
    text: "#CBD5E1",
    icon: FileEdit,
  },
};

function AxisCard({ axis }: { axis: ReadinessAxis }) {
  const style = CHIP_STYLE[axis.chip];
  const Icon = style.icon;
  const Wrapper = axis.evidence_href
    ? (props: React.PropsWithChildren) => (
        <a
          href={axis.evidence_href}
          className="group block h-full transition hover:scale-[1.01]"
          aria-label={`عرض دليل ${axis.title_ar}`}
        >
          {props.children}
        </a>
      )
    : (props: React.PropsWithChildren) => <div className="h-full">{props.children}</div>;

  return (
    <Wrapper>
      <article
        dir="rtl"
        className="flex h-full flex-col justify-between rounded-2xl border p-4 transition"
        style={{
          borderColor: style.border,
          background: "linear-gradient(180deg, rgba(10,22,44,0.55) 0%, rgba(6,14,30,0.45) 100%)",
        }}
      >
        <header className="mb-3 flex items-start justify-between gap-2">
          <h3
            className="text-sm font-bold leading-snug"
            style={{ fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}
          >
            {axis.title_ar}
          </h3>
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold"
            style={{ borderColor: style.border, background: style.bg, color: style.text }}
          >
            <Icon className="h-3 w-3" />
            {axis.label_ar}
          </span>
        </header>
        <p className="text-xs leading-6 text-muted-foreground">{axis.detail_ar}</p>
        {axis.evidence_href && (
          <div className="mt-3 text-[10px] font-bold uppercase tracking-widest opacity-70">
            ↖ دليل قابل للفتح
          </div>
        )}
      </article>
    </Wrapper>
  );
}

function ReadinessPage() {
  const fetchReport = useServerFn(getReadinessReport);
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["readiness-report"],
    queryFn: () => fetchReport(),
    staleTime: 30_000,
  });

  return (
    <div dir="rtl" className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <h1
              className="text-xl font-black sm:text-2xl"
              style={{ fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}
            >
              لوحة الجاهزية المؤسسية
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            كل حالة أدناه تعكس نتيجة فحص حقيقي — لا نعرض جاهزية وهمية.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition hover:bg-white/5 disabled:opacity-60"
          style={{ borderColor: "rgba(56,189,248,0.35)", color: "#7DD3FC" }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          إعادة الفحص
        </button>
      </header>

      {isPending && (
        <div className="rounded-xl border border-border/40 p-6 text-center text-sm text-muted-foreground">
          جارٍ فحص محاور الجاهزية…
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-6 text-center text-sm text-rose-300">
          تعذّر جلب تقرير الجاهزية. حاول مرة أخرى.
        </div>
      )}

      {data && (
        <>
          <section
            aria-label="محاور الجاهزية"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {data.axes.map((ax) => (
              <AxisCard key={ax.key} axis={ax} />
            ))}
          </section>

          <MicrosoftPanel microsoft={data.microsoft} />

          <footer
            dir="rtl"
            className="rounded-2xl border p-4 text-center text-xs text-muted-foreground"
            style={{ borderColor: "rgba(148,163,184,0.25)" }}
          >
            <div className="mb-1 font-bold text-foreground">
              تدقيق داخلي — لا يغني عن التدقيق الخارجي المستقل
            </div>
            <div>
              آخر تحديث: {new Date(data.generated_at).toLocaleString("ar-SA")} ·{" "}
              <Link to="/command-center" className="underline hover:text-cyan-300">
                فتح مركز القيادة
              </Link>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
