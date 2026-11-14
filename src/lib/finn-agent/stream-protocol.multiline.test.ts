import { describe, expect, it } from "vitest";
import { createFinnEventParser, encodeFinnEvent } from "./stream-protocol";

describe("Finn SSE multiline data frame regression", () => {
  it("decodes one JSON event assembled from multiple data lines", () => {
    const parser = createFinnEventParser();
    const frame = [
      "data: {",
      'data:   "type": "delta",',
      'data:   "text": "مرحبًا"',
      "data: }",
      "",
      "",
    ].join("\n");
    expect(parser.push(frame)).toEqual([{ type: "delta", text: "مرحبًا" }]);
    expect(parser.flush()).toEqual([]);
  });

  it("assembles multiline data when CRLF is split across network chunks", () => {
    const parser = createFinnEventParser();
    const frame = [
      "data: {",
      'data: "type":"done",',
      'data: "truncated":true',
      "data: }",
      "",
      "",
    ].join("\r\n");
    const got = [];
    for (const character of frame) got.push(...parser.push(character));
    expect(got).toEqual([{ type: "done", truncated: true }]);
    expect(parser.flush()).toEqual([]);
  });

  it("discards a malformed multiline frame without losing the next valid event", () => {
    const parser = createFinnEventParser();
    const broken = ['data: {', 'data: "type": not-json', "data: }", "", ""].join("\n");
    expect(parser.push(broken + encodeFinnEvent({ type: "delta", text: "سليم" }))).toEqual([
      { type: "delta", text: "سليم" },
    ]);
  });

  it("accepts data lines without the optional space after colon", () => {
    const parser = createFinnEventParser();
    expect(parser.push('data:{"type":"done","truncated":false}\n\n')).toEqual([
      { type: "done", truncated: false },
    ]);
  });
});
