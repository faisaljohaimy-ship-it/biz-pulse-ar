import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  BellRing,
  Camera,
  KeyRound,
  ShieldAlert,
  Wrench,
  Filter,
  ArrowUpRight,
} from "lucide-react";
import { getSecOverview } from "@/lib/sec.functions";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { probeEvidence } from "@/lib/evidence/gate";

type Priority = "critical" | "high" | "medium" | "low";
type Source = "incident" | "cctv" | "permit" | "asset";

type AlertItem = {
  id: string;
  source: Source;
  priority: Priority;
  title: string;
  meta: string;
  ref: string;
  ts: string;
  to: string;
};

const PRIO_STYLE: Record<
  Priority,
  { dot: string; text: string; border: string; bg: string; label: string }
> = {
  critical: {
    dot: "bg-rose-500",
    text: "text-rose-300",
    border: "border-rose-500/40",
    bg: "bg-rose-500/10",
    label: "حرج",
  },
  high: {
    dot: "bg-amber-400",
    text: "text-amber-300",
    border: "border-amber-400/40",
    bg: "bg-amber-400/10",
    label: "مرتفع",
  },
  medium: {
    dot: "bg-sky-400",
    text: "text-sky-300",
    border: "border-sky-400/40",
    bg: "bg-sky-400/10",
    label: "متوسط",
  },
  low: {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    border: "border-emerald-400/40",
    bg: "bg-emerald-400/10",
    label: "منخفض",
  },
};

const SOURCE_META: Record<
  Source,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  incident: { icon: AlertTriangle, label: "بلاغات" },
  cctv: { icon: Camera, label: "مراقبة" },
  permit: { icon: KeyRound, label: "تصاريح" },
  asset: { icon: Wrench, label: "أصول" },
};

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t) / 1000;
  if (diff < 60) return `${Math.floor(diff)}ث`;
  if (diff < 3600) return `${Math.floor(diff / 60)}د`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}س`;
  return `${Math.floor(diff / 86400)}ي`;
}

function severityToPriority(sev: string | null | undefined): Priority {
  switch ((sev ?? "").toLowerCase()) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}

export function AlertsPanel() {
  const fetchOverview = useServerFn(getSecOverview);
  const { data, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["sec-overview-alerts"],
    queryFn: () => fetchOverview(),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const [prio, setPrio] = useState<"all" | Priority>("all");
  const [source, setSource] = useState<"all" | Source>("all");

  const items = useMemo<AlertItem[]>(() => {
    if (!data) return [];
    const out: AlertItem[] = [];

    for (const i of data.incidents) {
      if (i.status === "closed") continue;
      out.push({
        id: `inc-${i.id}`,
        source: "incident",
        priority: severityToPriority(i.severity),
        title: i.title_ar || i.title_en || "بلاغ",
        meta: `${i.category}${i.owner ? " · " + i.owner : ""}`,
        ref: i.ref,
        ts: i.reported_at,
        to: "/sec/incidents",
      });
    }

    for (const c of data.cctv) {
      if (c.status === "resolved" || c.status === "dismissed") continue;
      const p: Priority =
        c.confidence >= 0.9 ? "critical" : c.confidence >= 0.75 ? "high" : "medium";
      out.push({
        id: `cctv-${c.id}`,
        source: "cctv",
        priority: p,
        title: `كاميرا ${c.camera_code} · ${c.alert_type}`,
        meta: `ثقة ${Math.round(c.confidence * 100)}%`,
        ref: c.ref,
        ts: c.detected_at,
        to: "/sec/cctv",
      });
    }

    const now = Date.now();
    for (const pmt of data.permits) {
      if (pmt.status !== "active") continue;
      const ends = new Date(pmt.ends_at).getTime();
      const hoursLeft = (ends - now) / 36e5;
      if (hoursLeft > 24) continue;
      const p: Priority = hoursLeft < 0 ? "critical" : hoursLeft < 4 ? "high" : "medium";
      out.push({
        id: `pmt-${pmt.id}`,
        source: "permit",
        priority: p,
        title: `تصريح ${pmt.work_type} — ${pmt.contractor}`,
        meta: hoursLeft < 0 ? "منتهٍ" : `ينتهي خلال ${Math.max(0, Math.round(hoursLeft))}س`,
        ref: pmt.ref,
        ts: pmt.ends_at,
        to: "/sec/permits",
      });
    }

    for (const a of data.assets) {
      if (a.status === "operational" && a.health >= 60) continue;
      const p: Priority =
        a.status === "offline" || a.health < 30 ? "critical" : a.health < 50 ? "high" : "medium";
      out.push({
        id: `ast-${a.id}`,
        source: "asset",
        priority: p,
        title: `${a.name_ar || a.name_en} · ${a.kind}`,
        meta: `صحة ${a.health}% · ${a.status}`,
        ref: a.code,
        ts: a.last_seen_at,
        to: "/sec/assets",
      });
    }

    const order: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    out.sort((x, y) => order[x.priority] - order[y.priority] || +new Date(y.ts) - +new Date(x.ts));
    return out;
  }, [data]);

  const counts = useMemo(() => {
    const c = { all: items.length, critical: 0, high: 0, medium: 0, low: 0 } as Record<
      string,
      number
    >;
    for (const i of items) c[i.priority]++;
    return c;
  }, [items]);

  const filtered = items.filter(
    (i) => (prio === "all" || i.priority === prio) && (source === "all" || i.source === source),
  );

  return (
    <section className="relative rounded-xl bg-gradient-to-br from-background/60 to-background/20 backdrop-blur-xl border border-white/5 overflow-hidden">
      <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-400/60 to-transparent" />

      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <BellRing className="w-4 h-4 text-rose-300" />
            {counts.critical > 0 && (
              <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_currentColor]" />
            )}
          </div>
          <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/60 font-mono">
            Live Alerts
          </span>
          <span className="text-xs text-foreground/40 font-mono">· {items.length}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full ${isFetching ? "bg-primary animate-pulse" : "bg-emerald-400"}`}
          />
          <span className="text-foreground/50 uppercase tracking-widest">
            {isFetching ? "SYNC" : "LIVE"}
          </span>
        </div>
      </header>

      {/* Priority filters */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 border-b border-white/5">
        <Filter className="w-3 h-3 text-foreground/40 me-1" />
        {(["all", "critical", "high", "medium", "low"] as const).map((p) => {
          const active = prio === p;
          const style = p === "all" ? null : PRIO_STYLE[p];
          return (
            <button
              key={p}
              onClick={() => setPrio(p)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono border transition-colors ${
                active
                  ? style
                    ? `${style.bg} ${style.text} ${style.border}`
                    : "bg-primary/15 text-primary border-primary/40"
                  : "border-white/5 text-foreground/50 hover:border-white/15 hover:text-foreground/80"
              }`}
            >
              {style && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
              <span>{p === "all" ? "الكل" : style!.label}</span>
              <span className="opacity-60">{counts[p] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Source filters */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-white/5">
        <button
          onClick={() => setSource("all")}
          className={`rounded-md px-2 py-0.5 text-[10px] font-mono border transition-colors ${
            source === "all"
              ? "border-primary/40 text-primary bg-primary/10"
              : "border-white/5 text-foreground/50 hover:text-foreground/80"
          }`}
        >
          جميع المصادر
        </button>
        {(Object.keys(SOURCE_META) as Source[]).map((s) => {
          const M = SOURCE_META[s];
          const Icon = M.icon;
          const active = source === s;
          return (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono border transition-colors ${
                active
                  ? "border-secondary/40 text-secondary bg-secondary/10"
                  : "border-white/5 text-foreground/50 hover:text-foreground/80"
              }`}
            >
              <Icon className="w-3 h-3" /> {M.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <ul className="max-h-[420px] overflow-y-auto divide-y divide-white/5">
        {filtered.length === 0 && (
          <li className="px-4 py-10 text-center text-xs text-foreground/40 font-mono">
            <ShieldAlert className="w-5 h-5 mx-auto mb-2 text-emerald-400/70" />
            لا توجد تنبيهات مطابقة
          </li>
        )}
        {filtered.slice(0, 60).map((a) => {
          const style = PRIO_STYLE[a.priority];
          const Icon = SOURCE_META[a.source].icon;
          return (
            <li key={a.id}>
              <Link
                to={a.to}
                className="group flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
              >
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full ${style.dot} shadow-[0_0_6px_currentColor] shrink-0`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon className={`w-3 h-3 ${style.text} shrink-0`} />
                    <span
                      className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-px rounded border ${style.border} ${style.text}`}
                    >
                      {style.label}
                    </span>
                    <span className="text-[10px] font-mono text-foreground/40 truncate">
                      {a.ref}
                    </span>
                  </div>
                  <div className="text-xs text-foreground/90 truncate">{a.title}</div>
                  <div className="text-[10px] text-foreground/40 font-mono mt-0.5 truncate">
                    {a.meta}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] font-mono text-foreground/40">{timeAgo(a.ts)}</span>
                  <ArrowUpRight className="w-3 h-3 text-foreground/30 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
