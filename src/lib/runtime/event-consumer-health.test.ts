import { describe, expect, it } from "vitest";
import { eventConsumerHealth } from "./event-consumer-health";

describe("event consumer backlog health", () => {
  it("reports unknown rather than healthy when the backlog query fails", () => {
    expect(eventConsumerHealth(null, true)).toBe("unknown");
    expect(eventConsumerHealth(0, true)).toBe("unknown");
    expect(eventConsumerHealth(101, true)).toBe("unknown");
  });

  it("does not invent an empty backlog for missing or invalid counts", () => {
    expect(eventConsumerHealth(null)).toBe("unknown");
    expect(eventConsumerHealth(undefined)).toBe("unknown");
    expect(eventConsumerHealth(-1)).toBe("unknown");
    expect(eventConsumerHealth(Number.NaN)).toBe("unknown");
    expect(eventConsumerHealth(Number.POSITIVE_INFINITY)).toBe("unknown");
  });

  it("retains the existing 100 pending-event warning threshold", () => {
    expect(eventConsumerHealth(0)).toBe("healthy");
    expect(eventConsumerHealth(100)).toBe("healthy");
    expect(eventConsumerHealth(101)).toBe("warning");
  });
});
