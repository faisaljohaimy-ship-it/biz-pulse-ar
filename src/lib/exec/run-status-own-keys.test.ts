import { describe, expect, it } from "vitest";
import {
  RUN_STATUS_LABELS,
  UNKNOWN_RUN_STATUS,
  deriveRunStatus,
  isKnownRunStatus,
  runStatusLabel,
  runStatusMeta,
} from "./run-status-labels";

describe("run status keys must be owned by the status map", () => {
  it("rejects inherited Object.prototype keys as unknown statuses", () => {
    for (const status of ["constructor", "toString", "valueOf", "__proto__", "hasOwnProperty"]) {
      expect(isKnownRunStatus(status)).toBe(false);
      expect(runStatusMeta(status)).toBe(UNKNOWN_RUN_STATUS);
      expect(runStatusLabel(status, "ar")).toBe(`حالة غير معروفة (${status})`);
      expect(runStatusLabel(status, "en")).toBe(`Unknown status (${status})`);
      expect(deriveRunStatus({ status }).meta).toBe(UNKNOWN_RUN_STATUS);
    }
  });

  it("retains recognition and labels for every declared status", () => {
    for (const status of Object.keys(RUN_STATUS_LABELS)) {
      expect(isKnownRunStatus(status)).toBe(true);
      expect(runStatusMeta(status)).toBe(
        RUN_STATUS_LABELS[status as keyof typeof RUN_STATUS_LABELS],
      );
    }
  });
});
