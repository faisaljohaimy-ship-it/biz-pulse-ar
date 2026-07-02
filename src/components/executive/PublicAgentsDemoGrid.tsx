import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { DemoDataBadge } from "./DemoDataBadge";

type Status = "idle" | "running" | "done";

interface DemoAgent {
  key: string;
  ar: string;
  en: string;
  baseOffsetMin: number; // last-run baseline
}

const AGENTS: DemoAgent[] = [
  { key: "incidents",  ar: "وكيل الحوادث",              en: "Incident Response Agent",     baseOffsetMin: 2 },
  { key: "preventive", ar: "وكيل الصيانة الوقائية",     en: "Preventive Maintenance Agent", baseOffsetMin: 14 },
  { key: "outlook",    ar: "وكيل تقارير Outlook",       en: "Outlook Reports Agent",       baseOffsetMin: 37 },
  { key: "hajj",       ar: "وكيل الحج · المشاعر",       en: "Hajj Mashaer Agent",          baseOffsetMin: 6 },
  { key: "risk",       ar: "وكيل المخاطر",              en: "Risk Intelligence Agent",     baseOffsetMin: 22 },
  { key: "permits",    ar: "وكيل التصاريح",             en: "Permits Agent",               baseOffsetMin: 51 },
];

const CYCLE: Status[] = ["idle", "running", "done"];

function relMin(min: number, ar: boolean): string {
  if (min < 1) return ar ? "الآن" : "just now";
  if (min < 60) return ar ? `منذ ${min} د` : `${min}m ago`;
  const h = Math.floor(min / 60);
  return ar ? `منذ ${h} س` : `${h}h ago`;
}

const TONE: Record<Status, { dot: string; ring: string; label_ar: string; label_en: string }> = {
  idle:    { dot: "bg-[#3AE8FF]",   ring: "border-[#3AE8FF]/50", label_ar: "جاهز",  label_en: "Idle" },
  running: { dot: "bg-amber-300",   ring: "border-amber-300/60", label_ar: "يعمل",  label_en: "Running" },
  done:    { dot: "bg-emerald-300", ring: "border-emerald-300/60", label_ar: "منجز", label_en: "Done" },
};

export function PublicAgentsDemoGrid({ ar }: { ar: boolean }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % 60), 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto mt-4 w-full max-w-3xl">
      <div className="mb-3 flex items-center justify-end">
        <DemoDataBadge />
      </div>

      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a, idx) => {
          const status = CYCLE[(phase + idx) % CYCLE.length];
          const tone = TONE[status];
          const mins = a.baseOffsetMin + (idx % 3);
          return (
            <li
              key={a.key}
              className={`group flex items-center gap-3 rounded-xl border ${tone.ring} bg-[#061A2E]/70 p-3 backdrop-blur-md transition-transform`}
              style={{ willChange: "transform" }}
            >
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                <Bot className="h-4 w-4 text-[#3AE8FF]" aria-hidden />
                <span
                  aria-hidden
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${tone.dot} ring-2 ring-[#061A2E] ${status === "running" ? "animate-pulse" : ""}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-white/90">
                  {ar ? a.ar : a.en}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-white/50">
                  <span className={`inline-flex items-center gap-1 rounded-full border ${tone.ring} px-1.5 py-px uppercase tracking-[0.16em]`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    {ar ? tone.label_ar : tone.label_en}
                  </span>
                  <span>·</span>
                  <span>{relMin(mins, ar)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-center text-[11px] text-white/40">
        {ar ? (
          <>
            الوكلاء أعلاه عرض توضيحي.{" "}
            <Link to="/auth" className="text-[#3AE8FF] underline-offset-2 hover:underline">
              سجّل الدخول لعرض الشبكة الحيّة
            </Link>
            .
          </>
        ) : (
          <>
            The agents above are a demo.{" "}
            <Link to="/auth" className="text-[#3AE8FF] underline-offset-2 hover:underline">
              Sign in to view the live grid
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}

export default PublicAgentsDemoGrid;
