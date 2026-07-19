/**
 * HCIS framework data layer — shared by /hcis and /hcis/directive/$code.
 *
 * Reads EXCLUSIVELY from the four live framework tables through the ONE
 * env-configured browser client (anon RLS decides guest visibility):
 *   hcis_directives (21) · hcis_sectors (13) · hcis_approval_stages (7)
 *   hcis_compliance_status (19 SEC × 4 regions = 76)
 *
 * Failure doctrine (root-cause fix for the permanent "تعذّر التحميل" card):
 *   - Empty results are DATA (empty state), never an error.
 *   - Only a failure of the primary table (hcis_directives) is fatal;
 *     stages/compliance failures degrade gracefully to empty sections.
 *   - Every real PostgREST error is logged verbatim (code/message/details)
 *     so the live browser console pins the diagnosis instantly, while the
 *     UI keeps its clean Arabic error state.
 */
import { useQuery } from "@tanstack/react-query";
import {
  Anchor,
  BookOpenCheck,
  Building2,
  Cctv,
  ClipboardList,
  DoorOpen,
  Factory,
  Fence,
  FireExtinguisher,
  IdCard,
  Lightbulb,
  Network,
  PlugZap,
  Radar,
  ScanLine,
  ShieldHalf,
  TrainFront,
  UserCheck,
  Warehouse,
  Waypoints,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

/* ── Types mirroring the approved live schema ───────────────────────────── */

export interface Directive {
  code: string;
  category: "SEC" | "SAF";
  name_ar: string;
  name_en: string;
  scope_ar: string;
  issue_note_ar: string | null;
  sort_order: number;
}
export interface Stage {
  stage_no: number;
  name_ar: string;
  name_en: string;
  description_ar: string;
}
export interface ComplianceRow {
  directive_code: string;
  region_code: string;
  status: string;
  priority: string;
  is_simulation: boolean;
}
export interface HcisDataset {
  directives: Directive[];
  stages: Stage[];
  compliance: ComplianceRow[];
  /** "database" = live Supabase rows; "reference" = built-in fallback. */
  source: "database" | "reference";
}

/* ── Directive glyphs — the approved semantic icon map ──────────────────────
   SEC-17 uses Waypoints: lucide's `Pipeline` glyph does not exist in the
   pinned lucide-react version (documented substitute per the mandate). */

export const DIRECTIVE_ICONS: Record<string, LucideIcon> = {
  "SEC-01": BookOpenCheck,
  "SEC-02": Fence,
  "SEC-03": DoorOpen,
  "SEC-04": Lightbulb,
  "SEC-05": Cctv,
  "SEC-06": ScanLine,
  "SEC-07": PlugZap,
  "SEC-08": Network,
  "SEC-09": Warehouse,
  "SEC-10": TrainFront,
  "SEC-11": UserCheck,
  "SEC-12": IdCard,
  "SEC-13": ShieldHalf,
  "SEC-14": Anchor,
  "SEC-15": ClipboardList,
  "SEC-16": Radar,
  "SEC-17": Waypoints,
  "SEC-18": Zap,
  "SEC-19": Factory,
  "SEC-RC": Building2,
  "SAF-GEN": FireExtinguisher,
};

/* ── Status presentation ────────────────────────────────────────────────── */

export const STATUS_META: Record<string, { ar: string; en: string; cell: string; pill: string }> = {
  compliant: {
    ar: "ممتثل",
    en: "Compliant",
    cell: "bg-emerald-500/70",
    pill: "text-emerald-200 border-emerald-400/40 bg-emerald-500/10",
  },
  partial: {
    ar: "جزئي",
    en: "Partial",
    cell: "bg-amber-400/70",
    pill: "text-amber-200 border-amber-400/40 bg-amber-500/10",
  },
  non_compliant: {
    ar: "غير ممتثل",
    en: "Non-compliant",
    cell: "bg-rose-500/70",
    pill: "text-rose-200 border-rose-400/40 bg-rose-500/10",
  },
  not_applicable: {
    ar: "لا ينطبق",
    en: "N/A",
    cell: "bg-slate-500/40",
    pill: "text-slate-300 border-slate-400/30 bg-slate-500/10",
  },
  not_assessed: {
    ar: "لم يُقيَّم",
    en: "Not assessed",
    cell: "bg-white/10",
    pill: "text-white/60 border-white/20 bg-white/5",
  },
};
export const statusMeta = (s: string | undefined) =>
  STATUS_META[s ?? "not_assessed"] ?? STATUS_META.not_assessed!;

export const PRIORITY_AR: Record<string, string> = {
  critical: "حرجة",
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

/** Weighted compliance over ASSESSED rows only; null when nothing assessed. */
export function compliancePct(rows: readonly ComplianceRow[]): number | null {
  const scored = rows.filter(
    (r) => r.status === "compliant" || r.status === "partial" || r.status === "non_compliant",
  );
  if (scored.length === 0) return null;
  const w = scored.reduce(
    (a, r) => a + (r.status === "compliant" ? 1 : r.status === "partial" ? 0.5 : 0),
    0,
  );
  return Math.round((w / scored.length) * 100);
}

/* ── Data hook ──────────────────────────────────────────────────────────── */

interface PgError {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

function logPgError(table: string, error: PgError): void {
  // Deliberately always-on (not dev-only): the live console is the fastest
  // way to pin WHICH table/project fails while the UI stays presentable.
  console.error(
    `[HCIS] Supabase read failed for "${table}" — code=${error.code ?? "?"} message=${error.message}`,
    { details: error.details, hint: error.hint },
  );
}

/** Built-in reference copy of the framework — the page is NEVER dead. */
async function referenceDataset(): Promise<HcisDataset> {
  const ref = await import("./reference-data");
  return {
    directives: [...ref.HCIS_REFERENCE_DIRECTIVES],
    stages: [...ref.HCIS_REFERENCE_STAGES],
    compliance: [...ref.HCIS_REFERENCE_COMPLIANCE],
    source: "reference",
  };
}

export function useHcisFramework() {
  return useQuery<HcisDataset>({
    queryKey: ["hcis-framework"],
    retry: false,
    staleTime: 60_000,
    refetchInterval: 120_000,
    // NEVER throws and never returns an empty framework: the live database
    // wins when it answers with rows; otherwise the built-in reference copy
    // fills the showcase (clearly badged), and the real failure is logged.
    queryFn: async (): Promise<HcisDataset> => {
      if (!isSupabaseConfigured) {
        console.error("[HCIS] Supabase env not configured — serving reference dataset.");
        return referenceDataset();
      }
      try {
        const [dir, stg, cmp] = await Promise.all([
          supabase
            .from("hcis_directives")
            .select("code,category,name_ar,name_en,scope_ar,issue_note_ar,sort_order")
            .order("sort_order", { ascending: true }),
          supabase
            .from("hcis_approval_stages")
            .select("stage_no,name_ar,name_en,description_ar")
            .order("stage_no", { ascending: true }),
          supabase
            .from("hcis_compliance_status")
            .select("directive_code,region_code,status,priority,is_simulation"),
        ]);

        if (dir.error) logPgError("hcis_directives", dir.error);
        if (stg.error) logPgError("hcis_approval_stages", stg.error);
        if (cmp.error) logPgError("hcis_compliance_status", cmp.error);

        const directives = (dir.data ?? []) as Directive[];
        if (dir.error || directives.length === 0) return referenceDataset();

        return {
          directives,
          stages: (stg.error ? [] : (stg.data ?? [])) as Stage[],
          compliance: (cmp.error ? [] : (cmp.data ?? [])) as ComplianceRow[],
          source: "database",
        };
      } catch (error) {
        console.error("[HCIS] framework fetch failed — serving reference dataset.", error);
        return referenceDataset();
      }
    },
  });
}
