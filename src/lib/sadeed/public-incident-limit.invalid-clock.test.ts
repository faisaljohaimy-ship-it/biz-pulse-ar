import { beforeEach, describe, expect, it } from "vitest";
import {
  allowIncidentDuringStorageOutage,
  INCIDENT_FALLBACK_MAX_REQUESTS,
  INCIDENT_FALLBACK_WINDOW_MS,
  resetIncidentOutageBucketsForTests,
} from "./public-incident-limit.server";

describe("anonymous incident fallback — invalid clock", () => {
  beforeEach(() => resetIncidentOutageBucketsForTests());

  it.each([Number.NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects unsafe time %s without creating a quota bucket",
    (invalidNow) => {
      expect(allowIncidentDuringStorageOutage("incident:clock", invalidNow)).toBe(false);
      expect(allowIncidentDuringStorageOutage("incident:clock", 1_000)).toBe(true);
    },
  );

  it.each([Number.NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "preserves an exhausted window after unsafe time %s",
    (invalidNow) => {
      for (let i = 0; i < INCIDENT_FALLBACK_MAX_REQUESTS; i += 1) {
        expect(allowIncidentDuringStorageOutage("incident:existing", 1_000)).toBe(true);
      }
      expect(allowIncidentDuringStorageOutage("incident:existing", invalidNow)).toBe(false);
      expect(allowIncidentDuringStorageOutage("incident:new", invalidNow)).toBe(false);
      expect(allowIncidentDuringStorageOutage("incident:existing", 1_000)).toBe(false);
      expect(allowIncidentDuringStorageOutage("incident:new", 1_000)).toBe(true);
      expect(
        allowIncidentDuringStorageOutage(
          "incident:existing",
          1_000 + INCIDENT_FALLBACK_WINDOW_MS,
        ),
      ).toBe(true);
    },
  );
});
