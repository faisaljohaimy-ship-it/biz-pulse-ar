// Simulation Engine — configuration.
// Phase 2 will flip SIM_MODE to "off" and swap seeders for live adapters
// without touching consumers.
export const SIM_MODE: "on" | "off" = "on";

export const SIM_VOLUMES = {
  departments: 12,
  employees: 120, // scaled for demo perf; increase for full load
  contractors: 20,
  buses: 18,
  incidents: 90,
  near_misses: 70,
  inspections: 80,
  risks: 60,
  corrective_actions: 140,
  permits: 100,
  meetings: 60,
  tasks: 300,
  notifications: 400,
  daily_ops_days: 30, // last N days
} as const;

export const SIM_SEED_DEFAULT = 20260101;
