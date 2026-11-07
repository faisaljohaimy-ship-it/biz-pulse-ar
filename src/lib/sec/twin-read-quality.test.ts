import { describe, expect, it } from "vitest";
import { assertTwinReadsSucceeded } from "./twin-read-integrity";

function snapshot() {
  return {
    sections: { data: [], error: null, status: 200 },
    circles: { data: [{ id: "circle-1" }], error: null, status: 200 },
    sites: { data: [], error: null, status: 200 },
    buildings: { data: [], error: null, status: 200 },
    cameras: { data: [], error: null, status: 200 },
    gates: { data: [], error: null, status: 200 },
    sensors: { data: [], error: null, status: 200 },
    controlRooms: { data: [], error: null, status: 200 },
    patrolTeams: { data: [], error: null, status: 200 },
  };
}

const assertCamera = (camera: unknown) => {
  assertTwinReadsSucceeded({ ...snapshot(), cameras: camera });
};

describe("twin complete-read quality", () => {
  it.each([null, 1, "row", [], {}, { id: 1 }, { id: "" }, { id: "  " }])(
    "rejects malformed row %j without exposing it",
    (row) => {
      expect(() => assertCamera({ data: [row], status: 200 })).toThrow(
        /^twin-read-unavailable:cameras$/,
      );
    },
  );
  it("rejects duplicate identities instead of inflating asset totals", () => {
    expect(() => assertCamera({ data: [{ id: "a" }, { id: "a" }], status: 200 })).toThrow();
  });
  it.each([-1, 0, 199, 300, 302, 403, 503, Number.NaN, Number.POSITIVE_INFINITY, "200"])(
    "rejects non-success status %s",
    (status) => {
      expect(() => assertCamera({ data: [], status })).toThrow();
    },
  );
  it.each([-1, 0, 2, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "1"])(
    "rejects inconsistent total %s",
    (count) => {
      expect(() => assertCamera({ data: [{ id: "a" }], count, status: 200 })).toThrow();
    },
  );
  it("accepts complete counts and measured empty arrays", () => {
    expect(() => assertCamera({ data: [{ id: "a" }], count: 1, status: 200 })).not.toThrow();
    expect(() => assertCamera({ data: [], count: 0, status: 200 })).not.toThrow();
  });
  it("retains compatibility when count/status are absent", () => {
    expect(() => assertCamera({ data: [{ id: "a" }], count: null })).not.toThrow();
  });
  it("does not mutate frozen responses", () => {
    const data = Object.freeze([Object.freeze({ id: "a" })]);
    expect(() => assertCamera(Object.freeze({ data, status: 200, count: 1 }))).not.toThrow();
  });
});
