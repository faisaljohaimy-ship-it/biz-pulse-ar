// Unified data-source contract.
// Phase 2 will swap the underlying reader from `sim_*` to live production
// adapters without changing any consumer.
//
// Consumers should import from here going forward:
//   import { listEmployees, listRisks, listNearMisses } from "@/lib/sec/data-source";
//
// (Existing sec_* readers in src/lib/sec.functions.ts remain unchanged and are
// re-exported so consumers can migrate incrementally.)
export {
  // re-export existing sec readers as-is
  fetchExecKpiSources,
  computeExecKpis,
} from "@/lib/sec.functions";
