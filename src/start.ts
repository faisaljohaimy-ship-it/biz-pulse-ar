import { createStart, createMiddleware } from "@tanstack/react-start";

import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { renderErrorPage } from "./lib/error-page";

/**
 * Security response headers — safe cross-cutting hardening.
 * CSP is intentionally omitted here: a strict Content-Security-Policy
 * without a per-app audit of inline scripts, third-party fonts, images,
 * and edge widgets is a white-screen risk. Ship it in a dedicated turn.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const errorMiddleware = createMiddleware().server(async ({ request, next }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/lovable/")) {
    return next();
  }
  try {
    const res = await next();
    // TanStack request middleware returns `{ response, request, pathname, context }`.
    // Rewrap the response with hardened headers, preserving the rest of the shape.
    return { ...res, response: withSecurityHeaders(res.response) };
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return withSecurityHeaders(
      new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
  }
});


export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));

