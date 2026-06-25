// Auth + payload guard for /api/chat. Extracted for unit testing.
import { z } from "zod";

const BodySchema = z
  .object({
    messages: z.array(z.any()).min(1),
    threadId: z.string().uuid().optional(),
    grounded: z.boolean().optional(),
    model: z.string().optional(),
  })
  .passthrough();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-ARIA-Request-ID, Accept",
  "Access-Control-Max-Age": "86400",
} as const;

export function chatResponseHeaders(requestId: string) {
  return {
    ...CORS_HEADERS,
    "Cache-Control": "no-store",
    "X-ARIA-Request-ID": requestId,
    "X-Accel-Buffering": "no",
  };
}

export function chatJsonError(message: string, status: number, requestId: string) {
  return Response.json(
    { ok: false, error: message, requestId },
    { status, headers: chatResponseHeaders(requestId) },
  );
}

export function getChatRequestId(request: Request) {
  return request.headers.get("x-aria-request-id") ?? crypto.randomUUID();
}

export type ChatGuardResult =
  | { ok: true; data: z.infer<typeof BodySchema>; authHeader: string; requestId: string }
  | { ok: false; response: Response };

/**
 * Validates the /api/chat request shape and bearer presence.
 * Returns a ready-to-send Response on failure with a clear JSON error
 * so the client can surface it in the chat UI instead of a raw 401.
 */
export async function validateChatRequest(request: Request): Promise<ChatGuardResult> {
  const requestId = getChatRequestId(request);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: chatJsonError("Invalid chat request body.", 400, requestId) };
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: chatJsonError("Invalid chat request payload.", 400, requestId) };
  }

  const authHeader =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: chatJsonError(
        "Please sign in again before sending a message.",
        401,
        requestId,
      ),
    };
  }

  return { ok: true, data: parsed.data, authHeader, requestId };
}
