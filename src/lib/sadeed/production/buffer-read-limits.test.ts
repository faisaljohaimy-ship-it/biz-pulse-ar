import { afterEach, describe, expect, it } from "vitest";
import { clearLogs, log, tailLogs } from "./logging.server";
import { audit, clearAudits, listAudits } from "./audit.server";

afterEach(() => {
  clearLogs();
  clearAudits();
});

describe("production in-memory read limits", () => {
  it("does not disclose all logs for zero, negative, fractional or nonfinite limits", () => {
    log("info", "unit-test", "first");
    log("error", "unit-test", "second");

    for (const limit of [0, -1, -2, 1.5, NaN, Infinity, -Infinity]) {
      expect(tailLogs(limit), `logs limit=${limit}`).toEqual([]);
    }

    expect(tailLogs(1).map((entry) => entry.message)).toEqual(["second"]);
    expect(tailLogs(2).map((entry) => entry.message)).toEqual(["first", "second"]);
    expect(tailLogs(2, "error").map((entry) => entry.message)).toEqual(["second"]);
  });

  it("does not turn an unknown severity into unrestricted log access", () => {
    log("warn", "unit-test", "bounded");
    expect(tailLogs(200, "unknown" as "info")).toEqual([]);
  });

  it("does not disclose all audits for zero, negative, fractional or nonfinite limits", () => {
    audit.userAction("first");
    audit.userAction("second");

    for (const limit of [0, -1, -2, 1.5, NaN, Infinity, -Infinity]) {
      expect(listAudits(limit), `audit limit=${limit}`).toEqual([]);
    }

    expect(listAudits(1).map((entry) => entry.action)).toEqual(["second"]);
    expect(listAudits(2).map((entry) => entry.action)).toEqual(["first", "second"]);
  });
});
