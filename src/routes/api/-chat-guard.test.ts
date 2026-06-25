import { describe, it, expect } from "vitest";
import { validateChatRequest } from "./chat-guard";

function makeRequest(init: { body?: unknown; auth?: string | null }) {
  const headers = new Headers({ "content-type": "application/json" });
  if (init.auth) headers.set("authorization", init.auth);
  return new Request("https://app.test/api/chat", {
    method: "POST",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

describe("/api/chat guard", () => {
  it("rejects missing bearer with JSON 401 and clear message", async () => {
    const req = makeRequest({ body: { messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }] } });
    const result = await validateChatRequest(req);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("content-type")).toMatch(/application\/json/);
    const body = await result.response.json();
    expect(body).toMatchObject({ ok: false });
    expect(typeof body.error).toBe("string");
    expect(body.error).toMatch(/sign in/i);
    expect(typeof body.requestId).toBe("string");
  });

  it("rejects non-Bearer auth header with 401 JSON", async () => {
    const req = makeRequest({
      body: { messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }] },
      auth: "Basic abc",
    });
    const result = await validateChatRequest(req);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    const body = await result.response.json();
    expect(body.error).toMatch(/sign in/i);
  });

  it("rejects invalid JSON body with 400", async () => {
    const req = new Request("https://app.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer x" },
      body: "not-json",
    });
    const result = await validateChatRequest(req);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
  });

  it("rejects payload missing messages with 400", async () => {
    const req = makeRequest({ body: { foo: "bar" }, auth: "Bearer x" });
    const result = await validateChatRequest(req);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
  });

  it("accepts a well-formed bearer request", async () => {
    const req = makeRequest({
      body: { messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }] },
      auth: "Bearer token-xyz",
    });
    const result = await validateChatRequest(req);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.authHeader).toBe("Bearer token-xyz");
    expect(result.data.messages.length).toBe(1);
    expect(typeof result.requestId).toBe("string");
  });
});
