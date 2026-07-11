/** Shared base for the KB seed data: the article shape + ref helpers. */
export type KbSeedArticle = {
  doc_code: string;
  category_code: string;
  title_ar: string;
  title_en: string;
  summary_ar: string;
  summary_en: string;
  purpose_ar?: string;
  purpose_en?: string;
  scope_ar?: string;
  scope_en?: string;
  procedure_ar: string;
  procedure_en: string;
  responsibilities_ar?: string;
  responsibilities_en?: string;
  requirements_ar?: string;
  requirements_en?: string;
  risk_level: "low" | "medium" | "high" | "critical";
  priority: "routine" | "elevated" | "urgent" | "immediate";
  escalation_level?: string;
  related_forms?: string[];
  related_policies?: string[];
  related_workflows?: string[];
  related_agents?: string[];
  keywords_ar: string[];
  keywords_en: string[];
  owner?: string;
  version?: string;
};

export const POL = (n: number) => `POL-${String(n).padStart(3, "0")}`;
export const SOP = (n: number) => `SOP-${String(n).padStart(3, "0")}`;
export const KPI = (n: number) => `KPI-${String(n).padStart(3, "0")}`;
