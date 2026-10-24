// @vitest-environment node
import { strict as assert } from "node:assert";
import { test } from "vitest";
import {
  TRANSIENT_RETRY_MAX,
  abortableDelay,
  hasTimeForRetry,
  isTransientOverload,
  transientBackoffMs,
} from "./transient-retry.server";

const overloaded = (responseHeaders?: Record<string, string> | Headers, statusCode = 503) =>
  Object.assign(new Error("Service unavailable; try again later"), {
    statusCode,
    responseHeaders,
  });

for (const seconds of ["2", "120", "43200", "9999999999999999999999999999999"]) {
  test(`does not retry before Retry-After: ${seconds} seconds`, () => {
    assert.equal(isTransientOverload(overloaded({ "retry-after": seconds })), false);
  });
}

for (const seconds of ["0", "1", " 1 "]) {
  test(`preserves the bounded retry for a short delay: ${JSON.stringify(seconds)}`, () => {
    assert.equal(isTransientOverload(overloaded({ "retry-after": seconds })), true);
    assert.ok(transientBackoffMs(0, 0) >= Number(seconds) * 1_000);
  });
}

test("reads mixed-case SDK response headers", () => {
  assert.equal(isTransientOverload(overloaded({ "Retry-After": "120" })), false);
});

test("reads a native Headers response", () => {
  assert.equal(isTransientOverload(overloaded(new Headers({ "Retry-After": "120" }))), false);
});

test("honors a future HTTP-date instead of retrying after 1.5 seconds", () => {
  const date = new Date(Date.now() + 120_000).toUTCString();
  assert.equal(isTransientOverload(overloaded({ "retry-after": date })), false);
});

test("allows an expired HTTP-date", () => {
  const date = new Date(Date.now() - 120_000).toUTCString();
  assert.equal(isTransientOverload(overloaded({ "retry-after": date })), true);
});

test("does not shorten a provider delay when the local clock is ahead", () => {
  const now = Date.now();
  assert.equal(
    isTransientOverload(
      overloaded({
        date: new Date(now - 300_000).toUTCString(),
        "retry-after": new Date(now - 180_000).toUTCString(),
      }),
    ),
    false,
  );
});

for (const value of ["-1", "1.5", "invalid", "Infinity", "1e3"]) {
  test(`malformed Retry-After fails closed: ${value}`, () => {
    assert.equal(isTransientOverload(overloaded({ "retry-after": value })), false);
  });
}

for (const status of [400, 401, 402, 403, 404, 405, 408, 409, 410, 422, 429, 451]) {
  test(`HTTP ${status} is not retried merely because its message says unavailable`, () => {
    assert.equal(isTransientOverload(overloaded(undefined, status)), false);
  });
}

test("preserves recognized transient overloads without response headers", () => {
  for (const status of [500, 502, 503, 504]) {
    assert.equal(isTransientOverload(overloaded(undefined, status)), true);
  }
  assert.equal(isTransientOverload(new Error("This model is experiencing high demand")), true);
});

test("preserves quota rejection even with HTTP 503 and a short Retry-After", () => {
  for (const message of ["quota exhausted", "RESOURCE_EXHAUSTED", "rate limit reached"]) {
    const error = Object.assign(new Error(message), {
      statusCode: 503,
      responseHeaders: { "retry-after": "0" },
    });
    assert.equal(isTransientOverload(error), false);
  }
});

test("preserves cancellation and unknown-error rejection", () => {
  assert.equal(isTransientOverload(new DOMException("unavailable", "AbortError")), false);
  assert.equal(isTransientOverload(new DOMException("unavailable", "TimeoutError")), false);
  assert.equal(isTransientOverload(new Error("unknown failure")), false);
  assert.equal(isTransientOverload(null), false);
});

test("does not extend the existing retry count, jitter or deadline budget", () => {
  assert.equal(TRANSIENT_RETRY_MAX, 1);
  assert.equal(transientBackoffMs(0, 0), 1_500);
  assert.equal(transientBackoffMs(0, 1), 1_900);
  assert.equal(hasTimeForRetry(45_000, 31_500, 1_500), true);
  assert.equal(hasTimeForRetry(45_000, 31_501, 1_500), false);
});

test("cancels an outstanding delay without issuing a provider request", async () => {
  const controller = new AbortController();
  const pending = abortableDelay(60_000, controller.signal);
  controller.abort(new DOMException("client left", "AbortError"));
  await assert.rejects(pending, { name: "AbortError" });
});

test("an already cancelled delay rejects immediately", async () => {
  const controller = new AbortController();
  controller.abort(new DOMException("client left", "AbortError"));
  await assert.rejects(abortableDelay(60_000, controller.signal), { name: "AbortError" });
});
