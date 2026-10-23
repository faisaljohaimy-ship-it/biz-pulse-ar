import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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

describe("twin read integrity", () => {
  it("accepts successful responses, including measured empty arrays", () => {
    expect(() => assertTwinReadsSucceeded(snapshot())).not.toThrow();
  });

  it.each(Object.keys(snapshot()))("rejects failure in %s despite other live rows", (source) => {
    const reads = {
      ...snapshot(),
      [source]: { data: null, error: { message: "private database details" }, status: 503 },
    };
    expect(() => assertTwinReadsSucceeded(reads)).toThrow(`twin-read-unavailable:${source}`);
  });

  it("rejects partial rows accompanied by an error", () => {
    const cameras = { data: [{ id: "camera-1" }], error: { code: "42501" }, status: 403 };
    expect(() => assertTwinReadsSucceeded({ ...snapshot(), cameras })).toThrow();
  });

  it.each([null, undefined, "unexpected", {}, 4])("rejects malformed data: %j", (data) => {
    const cameras = { data, error: null, status: 200 };
    expect(() => assertTwinReadsSucceeded({ ...snapshot(), cameras })).toThrow();
  });

  it("rejects failed HTTP status even without an error object", () => {
    const sensors = { data: [], error: null, status: 503 };
    expect(() => assertTwinReadsSucceeded({ ...snapshot(), sensors })).toThrow();
  });

  it("rejects a missing response", () => {
    expect(() => assertTwinReadsSucceeded({ ...snapshot(), gates: undefined })).toThrow();
  });

  it("does not disclose raw errors or row contents", () => {
    const error = { message: "confidential-key", details: "private-row" };
    const cameras = { data: [], error, status: 500 };
    expect(() => assertTwinReadsSucceeded({ ...snapshot(), cameras })).toThrow(
      /^twin-read-unavailable:cameras$/,
    );
  });

  it("does not modify successful responses", () => {
    const reads = snapshot();
    const before = JSON.stringify(reads);
    Object.values(reads).forEach(Object.freeze);
    assertTwinReadsSucceeded(Object.freeze(reads));
    expect(JSON.stringify(reads)).toBe(before);
  });

  it("guards all nine reads before assembling the live hierarchy", () => {
    const source = readFileSync("src/lib/sec.functions.ts", "utf8");
    const start = source.indexOf("async function fetchTwinTree(");
    const end = source.indexOf("// ============= PROJECTS", start);
    const body = source.slice(start, end);
    const call = body.match(/assertTwinReadsSucceeded\(\{([\s\S]*?)\}\)/);
    expect(call).not.toBeNull();
    for (const key of Object.keys(snapshot())) expect(call?.[1]).toContain(key);
    expect(body.indexOf("assertTwinReadsSucceeded")).toBeLessThan(
      body.indexOf("const camerasByBuilding"),
    );
  });
});
