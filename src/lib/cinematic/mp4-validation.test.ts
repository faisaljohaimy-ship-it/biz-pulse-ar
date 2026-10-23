import { describe, expect, it } from "vitest";
import {
  hasDecodedVideoFrame,
  hasMp4FileType,
  localMp4Problem,
  MAX_LOCAL_MP4_BYTES,
} from "./mp4-validation";

const candidate = { name: "film.mp4", type: "video/mp4", size: 128 };
const header = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0]);
const decoded = { readyState: 2, videoWidth: 64, videoHeight: 36, duration: 1 };

describe("local MP4 evidence", () => {
  it("accepts standard MP4 metadata and case-insensitive extensions", () => {
    expect(localMp4Problem(candidate)).toBeNull();
    expect(localMp4Problem({ ...candidate, name: "FILM.MP4", type: "" })).toBeNull();
  });
  it.each([0, -1, Number.NaN, Number.NEGATIVE_INFINITY])("rejects empty size %s", (size) => {
    expect(localMp4Problem({ ...candidate, size })).toBe("empty_file");
  });
  it("bounds local media size", () => {
    expect(localMp4Problem({ ...candidate, size: MAX_LOCAL_MP4_BYTES })).toBeNull();
    expect(localMp4Problem({ ...candidate, size: MAX_LOCAL_MP4_BYTES + 1 })).toBe("file_too_large");
  });
  it.each([
    { name: "film.html", type: "video/mp4" },
    { name: "film.mp4", type: "text/html" },
    { name: "film.mp4.html", type: "video/mp4" },
  ])("rejects misleading metadata %j", (metadata) => {
    expect(localMp4Problem({ ...candidate, ...metadata })).toBe("unsupported_type");
  });
  it("requires a complete ftyp header", () => {
    expect(hasMp4FileType(header)).toBe(true);
    for (let length = 0; length < 16; length++) {
      expect(hasMp4FileType(header.slice(0, length))).toBe(false);
    }
  });
  it("rejects renamed HTML and invalid box sizes or brands", () => {
    expect(hasMp4FileType(new TextEncoder().encode("<!DOCTYPE html><html>"))).toBe(false);
    for (const index of [0, 3, 4, 8]) {
      const corrupted = header.slice();
      corrupted[index] = index === 0 ? 0 : 1;
      if (index === 0) corrupted[3] = 0;
      expect(hasMp4FileType(corrupted)).toBe(false);
    }
  });
  it("supports byte views with a nonzero byte offset", () => {
    const padded = new Uint8Array(48);
    padded.set(header, 8);
    expect(hasMp4FileType(padded.subarray(8, 24))).toBe(true);
  });
  it("does not call metadata-only a decoded video", () => {
    expect(hasDecodedVideoFrame({ ...decoded, readyState: 1 })).toBe(false);
    expect(hasDecodedVideoFrame(decoded)).toBe(true);
  });
  it.each([
    { videoWidth: 0 },
    { videoHeight: 0 },
    { duration: 0 },
    { duration: Number.NaN },
    { duration: Number.POSITIVE_INFINITY },
  ])("rejects missing frame evidence %j", (change) => {
    expect(hasDecodedVideoFrame({ ...decoded, ...change })).toBe(false);
  });
});
