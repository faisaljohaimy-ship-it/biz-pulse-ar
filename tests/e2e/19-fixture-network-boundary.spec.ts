import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import type { Socket } from "node:net";
import { createFixturePolicy, installFixtureBrowserGuard } from "./support/fixture-network.mjs";

test("fixture guard permits local HMR while denying other upstreams and redirects", async ({
  browser,
}) => {
  let canaryHits = 0;
  let canaryUpgrades = 0;
  const sockets = new Set<Socket>();
  const canary = createServer((_request, response) => {
    canaryHits += 1;
    response.end("inert local canary");
  });
  canary.on("upgrade", (_request, socket) => {
    canaryUpgrades += 1;
    socket.destroy();
  });
  await new Promise<void>((resolve) => canary.listen(0, "127.0.0.1", resolve));
  const canaryAddress = canary.address();
  if (!canaryAddress || typeof canaryAddress === "string") throw new Error("Missing canary port");
  const deniedOrigin = `http://127.0.0.1:${canaryAddress.port}`;
  const app = createServer((request, response) => {
    if (request.url === "/redirect") {
      response.writeHead(302, { location: `${deniedOrigin}/fixture` }).end();
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end("<!doctype html><html><title>Fixture</title><h1>Local fixture</h1></html>");
  });
  app.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  app.on("upgrade", (request, socket) => {
    const key = request.headers["sec-websocket-key"];
    if (!key || request.url !== "/hmr") {
      socket.destroy();
      return;
    }
    const accept = createHash("sha1")
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest("base64");
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    const message = Buffer.from("local-hmr-ready");
    socket.write(Buffer.concat([Buffer.from([0x81, message.length]), message]));
    socket.on("data", () => socket.destroy());
  });
  await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
  const appAddress = app.address();
  if (!appAddress || typeof appAddress === "string") throw new Error("Missing app port");
  const origin = `http://127.0.0.1:${appAddress.port}`;
  const context = await browser.newContext({ serviceWorkers: "block" });
  try {
    const policy = createFixturePolicy({
      enabled: true,
      baseURL: origin,
      supabaseURL: "http://127.0.0.1:54321",
    });
    await installFixtureBrowserGuard(context, policy);
    const page = await context.newPage();
    await page.goto(origin);
    await expect(page.getByRole("heading", { name: "Local fixture" })).toBeVisible();
    const localMessage = await page.evaluate(
      (url) =>
        new Promise<string>((resolve, reject) => {
          const socket = new WebSocket(url);
          socket.onmessage = (event) => {
            socket.close();
            resolve(String(event.data));
          };
          socket.onerror = () => reject(new Error("Allowed local HMR connection failed"));
        }),
      `${origin.replace("http:", "ws:")}/hmr`,
    );
    expect(localMessage).toBe("local-hmr-ready");
    const denied = await page.evaluate(async (url) => {
      try {
        await fetch(`${url}/fixture`);
        return false;
      } catch {
        return true;
      }
    }, deniedOrigin);
    expect(denied).toBe(true);
    // Isolate the intentional failed navigation from the live HMR page; an
    // aborted navigation can still be committing Chromium's internal error UI.
    const redirectPage = await context.newPage();
    try {
      await expect(redirectPage.goto(`${origin}/redirect`)).rejects.toThrow();
    } finally {
      await redirectPage.close();
    }
    await page.evaluate(
      (url) =>
        new Promise<void>((resolve) => {
          const socket = new WebSocket(url);
          socket.onerror = () => resolve();
          socket.onclose = () => resolve();
        }),
      `${deniedOrigin.replace("http:", "ws:")}/fixture`,
    );
    expect(canaryHits).toBe(0);
    expect(canaryUpgrades).toBe(0);
  } finally {
    await context.close();
    for (const socket of sockets) socket.destroy();
    app.closeAllConnections();
    canary.closeAllConnections();
    await Promise.all([
      new Promise<void>((resolve) => app.close(() => resolve())),
      new Promise<void>((resolve) => canary.close(() => resolve())),
    ]);
  }
});

test("fixture transport recovers local read resets with finite exhaustion and no HTTP-error retry", async ({
  browser,
}) => {
  const hits = { once: 0, always: 0, unavailable: 0, write: 0 };
  const app = createServer((request, response) => {
    if (request.url === "/reset-once" && ++hits.once === 1) {
      request.socket.destroy();
      return;
    }
    if (request.url === "/reset-always") {
      hits.always += 1;
      request.socket.destroy();
      return;
    }
    if (request.url === "/reset-write") {
      hits.write += 1;
      request.socket.destroy();
      return;
    }
    if (request.url === "/unavailable") {
      hits.unavailable += 1;
      response.writeHead(503).end("local unavailable");
      return;
    }
    response.writeHead(200, { "content-type": "text/html" }).end("local-ready");
  });
  await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
  const address = app.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture port");
  const origin = `http://127.0.0.1:${address.port}`;
  const context = await browser.newContext({ serviceWorkers: "block" });
  try {
    await installFixtureBrowserGuard(
      context,
      createFixturePolicy({
        enabled: true,
        baseURL: origin,
        supabaseURL: "http://127.0.0.1:54321",
      }),
    );
    const page = await context.newPage();
    await page.goto(origin);
    const recovered = await page.evaluate(async () => {
      try {
        return await (await fetch("/reset-once")).text();
      } catch {
        return "connection failed";
      }
    });
    expect(recovered).toBe("local-ready");
    expect(hits.once).toBe(2);
    const exhausted = await page.evaluate(async () => {
      try {
        await fetch("/reset-always");
        return false;
      } catch {
        return true;
      }
    });
    expect(exhausted).toBe(true);
    expect(hits.always).toBe(3);
    expect(await page.evaluate(async () => (await fetch("/unavailable")).status)).toBe(503);
    expect(hits.unavailable).toBe(1);
    await page.evaluate(async () => {
      try {
        await fetch("/reset-write", { method: "POST" });
      } catch {
        // The inert write-shaped control must not be replayed.
      }
    });
    expect(hits.write).toBe(1);
  } finally {
    await context.close();
    app.closeAllConnections();
    await new Promise<void>((resolve) => app.close(() => resolve()));
  }
});
