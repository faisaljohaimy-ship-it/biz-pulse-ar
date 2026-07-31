/**
 * The connection badge — replaces a hard-coded "Systems online" string.
 *
 * Reports `checking` until something is actually known, and says
 * «إعداد غير مكتمل» when the Supabase environment is absent instead of
 * claiming a connection that cannot exist. See src/lib/system/system-health.ts
 * for why the states are shaped this way.
 */
import { useEffect, useState } from "react";
import { Wifi, WifiOff, Loader2, AlertTriangle } from "lucide-react";
import {
  type SystemHealth,
  deriveSystemHealth,
  healthLabel,
  healthTone,
} from "@/lib/system/system-health";
import { cn } from "@/lib/utils";

const TONE = {
  positive: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  neutral: "border-white/15 bg-white/5 text-slate-300",
} as const;

function Icon({ state }: { state: SystemHealth }) {
  if (state === "checking") return <Loader2 className="h-4 w-4 animate-spin" aria-hidden />;
  if (state === "connected") return <Wifi className="h-4 w-4" aria-hidden />;
  if (state === "misconfigured") return <AlertTriangle className="h-4 w-4" aria-hidden />;
  return <WifiOff className="h-4 w-4" aria-hidden />;
}

export function SystemStatusBadge({ ar, className }: { ar: boolean; className?: string }) {
  // Config is known synchronously from the bundle; connectivity is not, so the
  // first paint is honestly `checking` rather than optimistically `connected`.
  const [online, setOnline] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const read = () => setOnline(navigator.onLine);
    read();
    window.addEventListener("online", read);
    window.addEventListener("offline", read);
    return () => {
      window.removeEventListener("online", read);
      window.removeEventListener("offline", read);
    };
  }, []);

  const state = deriveSystemHealth({
    // Read individually: this is the form Vite statically replaces, so the
    // values are baked into the bundle rather than depending on an env object
    // existing at runtime.
    env: {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    online,
    // `navigator.onLine === true` only proves a local link exists, not that the
    // backend answers. It is passed as the probe result because it is the
    // strongest signal available without adding a request on every page load;
    // when it is false the state is already decided before this is read.
    probeOk: online === undefined ? undefined : online,
  });

  return (
    <span
      // A status region, not decoration: assistive tech should hear it change.
      role="status"
      aria-live="polite"
      className={cn(
        "hidden min-h-11 items-center gap-2 rounded-xl border px-3 text-xs sm:inline-flex",
        TONE[healthTone(state)],
        className,
      )}
    >
      <Icon state={state} />
      {healthLabel(state, ar)}
    </span>
  );
}
