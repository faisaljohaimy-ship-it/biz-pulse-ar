import { createStart, createMiddleware } from "@tanstack/react-start";

import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { renderErrorPage } from "./lib/error-page";

/** Security response headers applied to every application response. */
const SECURITY_HEADERS: Record<string, string> = {
  // ٢٠٢٦/٠٩/١٨ — DENY لا SAMEORIGIN: شاشة قيادةٍ تنفيذية لا تُضمَّن في
  // إطار، ولا حتى من أصلها. و`frame-ancestors 'none'` أدناه هو الضابط
  // الفعليّ في المتصفّحات الحديثة؛ هذا الرأس للقديمة التي لا تقرأ CSP.
  //
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Resource-Policy": "same-site",
  // ٢٠٢٦/٠٩/٢٩ — `geolocation=(self)` لا `()`: أمر المالك «اربط قوقل ماب
  // بموقع المستخدم ليحدد موقعه بالضبط عند البلاغات». للأصل نفسه وحده —
  // لا لإطار خرائط Google المضمَّن ولا لأي أصلٍ ثالث — والمتصفح يسأل
  // المستخدم إذنه عند أول ضغطٍ على «حدّد موقعي».
  "Permissions-Policy":
    "camera=(), microphone=(self), geolocation=(self), payment=(), usb=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' https:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https: wss:",
    "frame-src 'self' https:",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; "),
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

const errorMiddleware = createMiddleware().server(async ({ next }) => {
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
