import { describe, expect, it } from "vitest";
import { mergeEventRowsById } from "./event-rows";

describe("event stream hydration and realtime reconciliation", () => {
  const prior = [{ id: "older-2" }, { id: "older-1" }];
  const incoming = { id: "new-insert" };

  it("retains an INSERT that arrived before the initial query completed", () => {
    // Before this repair, hydration replaced [incoming] with the older snapshot.
    expect(mergeEventRowsById([incoming], prior, 50)).toEqual([incoming, ...prior]);
  });

  it("deduplicates a row returned by both realtime and the initial query", () => {
    const live = { id: "same", source: "realtime" };
    const snapshot = { id: "same", source: "snapshot" };
    expect(mergeEventRowsById([live], [snapshot], 50)).toEqual([live]);
  });

  it("preserves the configured cap and prioritizes the newest realtime events", () => {
    expect(mergeEventRowsById([incoming, { id: "newer-2" }], prior, 3)).toEqual([
      incoming,
      { id: "newer-2" },
      prior[0],
    ]);
  });

  it("keeps unchanged hydration behavior when there are no live rows", () => {
    expect(mergeEventRowsById([], prior, 50)).toEqual(prior);
  });

  it("does not emit a row when the caller's limit is zero", () => {
    expect(mergeEventRowsById([incoming], prior, 0)).toEqual([]);
  });

  it("does not read stale hydration rows when the realtime cap is already filled", () => {
    // The previous implementation spread the entire older snapshot first,
    // even when the visible result had already reached its one-row limit.
    const unusedSnapshot = new Proxy([{ id: "never-needed" }], {
      get(target, property, receiver) {
        if (property === Symbol.iterator) throw new Error("stale snapshot was consumed");
        return Reflect.get(target, property, receiver);
      },
    });
    expect(mergeEventRowsById([incoming], unusedSnapshot, 1)).toEqual([incoming]);
  });

  it("stops reading realtime rows after the cap without cloning the entire list", () => {
    const live = new Proxy([incoming, { id: "never-needed" }], {
      get(target, property, receiver) {
        if (property === "1") throw new Error("event tail was consumed");
        return Reflect.get(target, property, receiver);
      },
    });
    expect(mergeEventRowsById(live, prior, 1)).toEqual([incoming]);
  });
});
