// Fixture-only diagnostic controls. Ordinary E2E requests retain their existing
// behavior. No production config, browser profile or provider is changed here.
export const fixtureOnly = process.env.SADEED_E2E_FIXTURE_ONLY === "true";

function loopbackOrigin(value) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Fixture-only targets require explicit loopback origins and ports");
  }
  return url.origin;
}

export function createFixturePolicy({ enabled, baseURL, supabaseURL }) {
  if (!enabled) return null;
  const appOrigin = loopbackOrigin(baseURL);
  const origins = new Set([appOrigin, loopbackOrigin(supabaseURL)]);
  return {
    appOrigin,
    origins: [...origins],
    allows(value, webSocket = false) {
      try {
        const url = new URL(value);
        if (url.username || url.password) return false;
        if (!webSocket && (url.protocol === "data:" || url.href === "about:blank")) {
          return true; // Inline resources make no upstream connection.
        }
        if (!webSocket && url.protocol === "blob:") return origins.has(url.origin);
        if (webSocket) {
          if (!["ws:", "wss:"].includes(url.protocol)) return false;
          url.protocol = url.protocol === "ws:" ? "http:" : "https:";
        } else if (!["http:", "https:"].includes(url.protocol)) return false;
        return origins.has(url.origin);
      } catch {
        return false;
      }
    },
  };
}

export function fixturePolicyFromEnvironment(baseURL, env = process.env) {
  const enabled = env.SADEED_E2E_FIXTURE_ONLY === "true";
  if (enabled) {
    // Require both sides before any browser/API request; a missing Vite value
    // must never silently select its last-resort production fallback.
    if (
      env.VITE_SUPABASE_URL !== env.SUPABASE_URL ||
      env.VITE_SUPABASE_PUBLISHABLE_KEY !== "fixture-only-publishable-key" ||
      env.SUPABASE_PUBLISHABLE_KEY !== "fixture-only-publishable-key" ||
      env.VITE_SUPABASE_PROJECT_ID !== "fixture-only-local" ||
      env.SUPABASE_PROJECT_ID !== "fixture-only-local"
    ) {
      throw new Error("Fixture-only browser and server settings must use the disposable fixture");
    }
  }
  return createFixturePolicy({ enabled, baseURL, supabaseURL: env.VITE_SUPABASE_URL });
}

export async function installFixtureBrowserGuard(context, policy) {
  if (!policy) return;
  if (context.browser()?.browserType().name() === "chromium") {
    // Fetch/fulfill gives Chromium a synthetic document, which otherwise loses
    // loopback address-space trust and blocks the allowed local HMR socket.
    // Scope this temporary context permission to the validated app origin;
    // HTTP, redirect, WebSocket and service-worker restrictions remain in place.
    await context.grantPermissions(["local-network-access"], { origin: policy.appOrigin });
  }
  await context.routeWebSocket("**/*", (socket) => {
    if (policy.allows(socket.url(), true)) socket.connectToServer();
    else socket.close({ code: 1008, reason: "Fixture-only upstream denied" });
  });
  await context.route("**/*", async (route) => {
    if (!policy.allows(route.request().url())) return route.abort("blockedbyclient");
    try {
      // Playwright does not route the next URL in a redirect chain again.
      // Only direct fixture responses are accepted; never follow a redirect.
      // Vite may reset a local module connection while rebuilding its cold
      // optimizer graph. The native API retries ECONNRESET only, never HTTP
      // errors; bound retries to safe reads and keep the same request deadline.
      const maxRetries = ["GET", "HEAD"].includes(route.request().method()) ? 2 : 0;
      const response = await route.fetch({ maxRedirects: 0, maxRetries, timeout: 15_000 });
      if (response.status() >= 300 && response.status() < 400 && response.status() !== 304) {
        return route.abort("blockedbyclient");
      }
      return route.fulfill({ response });
    } catch {
      return route.abort("blockedbyclient");
    }
  });
}

export async function fixtureAwareGet(request, path, policy) {
  if (!policy) return request.get(path);
  const url = new URL(path, policy.appOrigin);
  if (!["http:", "https:"].includes(url.protocol) || !policy.allows(url.href)) {
    throw new Error("Fixture-only API request denied before contacting an upstream");
  }
  const response = await request.get(url.href, { maxRedirects: 0 });
  if (response.status() >= 300 && response.status() < 400 && response.status() !== 304) {
    throw new Error("Fixture-only API requests do not follow redirects");
  }
  return response;
}
