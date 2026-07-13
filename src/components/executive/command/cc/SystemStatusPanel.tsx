/**
 * SystemStatusPanel — «حالة النظام» health rings + «التنبيهات الذكية» feed.
 * Static poster figures, badged «محاكاة». Tinted by the system accent (green).
 */
import { AlertTriangle, Bell, RefreshCw, ShieldCheck } from "lucide-react";
import { CC_ALERTS, CC_SYSTEM_RINGS } from "../commandCenterData";

function Ring({ pct, accent, label }: { pct: number; accent: string; label: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 56 56" className="h-14 w-14" role="img" aria-label={`${label}: ${pct}%`}>
        <circle cx="28" cy="28" r={r} fill="none" stroke={`${accent}22`} strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 28 28)"
          style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
        />
        <text
          x="28"
          y="32"
          textAnchor="middle"
          fontSize="12"
          className="font-mono font-bold"
          fill="#fff"
        >
          {pct}%
        </text>
      </svg>
      <span className="text-center text-[9px] text-white/60">{label}</span>
    </div>
  );
}

export function SystemStatusPanel({ ar, accent }: { ar: boolean; accent: string }) {
  return (
    <div className="flex flex-col gap-3" style={{ ["--acc" as string]: accent }}>
      {/* health */}
      <section
        className="nx-cmd-surface nx-living-border rounded-2xl p-3"
        aria-label={ar ? "حالة النظام" : "System status"}
      >
        <header className="mb-2 flex items-center gap-2">
          <ShieldCheck className="nx-icon-soft h-4 w-4" style={{ color: accent }} aria-hidden />
          <div>
            <div className="text-sm font-black" style={{ color: accent }}>
              {ar ? "حالة النظام" : "System status"}
            </div>
            <div className="text-[9px] text-white/55">
              {ar ? "جميع الأنظمة تعمل بكفاءة" : "All systems operational"}
            </div>
          </div>
        </header>
        <div className="grid grid-cols-3 gap-2">
          {CC_SYSTEM_RINGS.map((rr) => (
            <Ring key={rr.en} pct={rr.pct} accent={accent} label={ar ? rr.ar : rr.en} />
          ))}
        </div>
      </section>

      {/* alerts */}
      <section
        className="nx-cmd-surface rounded-2xl p-3"
        aria-label={ar ? "التنبيهات الذكية" : "Smart alerts"}
      >
        <header className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Bell className="nx-icon-soft h-3.5 w-3.5" style={{ color: accent }} aria-hidden />
            <span className="text-xs font-bold text-white/85">
              {ar ? "التنبيهات الذكية" : "Smart alerts"}
            </span>
          </div>
          <span className="text-[9px] font-semibold" style={{ color: "#f87171" }}>
            {ar ? `${CC_ALERTS.length} تنبيهات جديدة` : `${CC_ALERTS.length} new`}
          </span>
        </header>
        <ul className="flex flex-col gap-1.5">
          {CC_ALERTS.map((a) => {
            const high = a.level === "high";
            const Icon = high ? AlertTriangle : RefreshCw;
            return (
              <li
                key={a.en}
                className="flex items-center gap-2 rounded-lg border px-2 py-1.5"
                style={{
                  borderColor: high ? "rgba(248,113,113,0.35)" : "rgba(255,255,255,0.08)",
                  background: high ? "rgba(248,113,113,0.08)" : "rgba(0,0,0,0.2)",
                }}
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: high ? "#f87171" : accent }}
                  aria-hidden
                />
                <span className="flex-1 truncate text-end text-[10px] text-white/80">
                  {ar ? a.ar : a.en}
                </span>
                <span className="shrink-0 font-mono text-[9px] text-white/45 tabular-nums">
                  {a.time}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export default SystemStatusPanel;
