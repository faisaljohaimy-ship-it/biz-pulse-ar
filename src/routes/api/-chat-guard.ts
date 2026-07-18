const MAX_REQUEST_BYTES = 24 * 1024 * 1024;
const MAX_MESSAGES = 24;
const MAX_TEXT_CHARS = 200_000;
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_TOTAL_BYTES = 20 * 1024 * 1024;
const FILE_MEDIA_TYPES = new Set([
  "application/json",
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/markdown",
  "text/plain",
]);

type ChatBody = {
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    parts: Array<Record<string, unknown>>;
  }>;
  threadId?: string;
  model?: string;
  grounded?: boolean;
  replyMode?: "text" | "voice";
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getChatRequestId(request: Request): string {
  const supplied = request.headers.get("x-aria-request-id")?.trim();
  return supplied && /^[\w.-]{8,128}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

export function chatResponseHeaders(requestId: string): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-ARIA-Request-ID": requestId,
    "X-Content-Type-Options": "nosniff",
  };
}

export function chatJsonError(
  error: string,
  status: number,
  requestId: string,
): Response {
  return Response.json(
    { ok: false, error, requestId },
    { status, headers: chatResponseHeaders(requestId) },
  );
}

function parseDataUrl(
  url: string,
): { bytes: number; mediaType: string } | null {
  const match = /^data:([^;,]+);base64,([a-z0-9+/=]+)$/i.exec(url);
  if (!match) return null;
  if (match[2].length % 4 !== 0) return null;
  const padding = match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0;
  return {
    bytes: Math.max(0, Math.floor((match[2].length * 3) / 4) - padding),
    mediaType: match[1].toLowerCase(),
  };
}

function validateMessages(value: unknown): ChatBody["messages"] | string {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_MESSAGES
  ) {
    return `messages must contain between 1 and ${MAX_MESSAGES} items.`;
  }

  let textChars = 0;
  let fileCount = 0;
  let fileBytes = 0;
  let lastUserIndex = -1;
  value.forEach((item, index) => {
    if (
      item &&
      typeof item === "object" &&
      (item as { role?: unknown }).role === "user"
    ) {
      lastUserIndex = index;
    }
  });
  const messages: ChatBody["messages"] = [];
  for (const [messageIndex, raw] of value.entries()) {
    if (!raw || typeof raw !== "object")
      return "Each message must be an object.";
    const message = raw as Record<string, unknown>;
    if (
      typeof message.id !== "string" ||
      message.id.length < 1 ||
      message.id.length > 128
    ) {
      return "Each message requires a valid id.";
    }
    if (message.role !== "user" && message.role !== "assistant") {
      return "Message role must be user or assistant.";
    }
    if (!Array.isArray(message.parts) || message.parts.length > 50) {
      return "Message parts are invalid.";
    }

    const parts: Array<Record<string, unknown>> = [];
    for (const rawPart of message.parts) {
      if (!rawPart || typeof rawPart !== "object")
        return "Message part is invalid.";
      const part = rawPart as Record<string, unknown>;
      if (part.type === "text") {
        if (typeof part.text !== "string") return "Text part is invalid.";
        textChars += part.text.length;
        if (textChars > MAX_TEXT_CHARS) return "Chat text is too large.";
        parts.push({ type: "text", text: part.text });
        continue;
      }
      if (part.type === "file") {
        if (
          typeof part.filename !== "string" ||
          part.filename.length < 1 ||
          part.filename.length > 255 ||
          /[\r\n\0]/.test(part.filename)
        ) {
          return "Attachment filename is invalid.";
        }
        if (
          typeof part.mediaType !== "string" ||
          !FILE_MEDIA_TYPES.has(part.mediaType)
        ) {
          return "Attachment type is not supported.";
        }
        if (messageIndex !== lastUserIndex) {
          parts.push({
            type: "text",
            text: `[Attachment metadata: ${part.filename}; ${part.mediaType}]`,
          });
          continue;
        }
        if (typeof part.url !== "string") return "Attachment data is missing.";
        const parsedFile = parseDataUrl(part.url);
        if (!parsedFile)
          return "Only base64 data URL attachments are accepted.";
        if (parsedFile.mediaType !== part.mediaType.toLowerCase()) {
          return "Attachment media type does not match its data URL.";
        }
        if (parsedFile.bytes > MAX_FILE_BYTES)
          return "An attachment exceeds 10 MiB.";
        fileCount += 1;
        fileBytes += parsedFile.bytes;
        if (fileCount > MAX_FILES) return "Too many attachments.";
        if (fileBytes > MAX_FILE_TOTAL_BYTES)
          return "Attachment total exceeds 20 MiB.";
        parts.push({
          type: "file",
          filename: part.filename,
          mediaType: part.mediaType,
          url: part.url,
        });
        continue;
      }
      // Tool calls/results are server authority. Never accept client-forged
      // tool parts back into model context on a later request.
    }
    messages.push({ id: message.id, role: message.role, parts });
  }
  if (!messages.some((message) => message.role === "user")) {
    return "At least one user message is required.";
  }
  if (messages[messages.length - 1]?.role !== "user") {
    return "The chat request must end with the current user message.";
  }
  const lastUser = messages[lastUserIndex];
  if (!lastUser || lastUser.role !== "user" || lastUser.parts.length === 0) {
    return "The latest user message must contain text or an attachment.";
  }
  return messages;
}

export async function validateChatRequest(
  request: Request,
): Promise<
  | { ok: true; data: ChatBody; authHeader: string | null; requestId: string }
  | { ok: false; response: Response }
> {
  const requestId = getChatRequestId(request);
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  ) {
    return {
      ok: false,
      response: chatJsonError(
        "Content-Type must be application/json.",
        415,
        requestId,
      ),
    };
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return {
      ok: false,
      response: chatJsonError("Chat request is too large.", 413, requestId),
    };
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: chatJsonError("Invalid JSON body.", 400, requestId),
    };
  }
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      response: chatJsonError("Chat body is invalid.", 400, requestId),
    };
  }
  const input = raw as Record<string, unknown>;
  const messages = validateMessages(input.messages);
  if (typeof messages === "string") {
    return { ok: false, response: chatJsonError(messages, 400, requestId) };
  }

  const rawThreadId =
    typeof input.threadId === "string"
      ? input.threadId
      : typeof input.id === "string"
        ? input.id
        : undefined;
  const threadId =
    rawThreadId && UUID_RE.test(rawThreadId) ? rawThreadId : undefined;
  const model =
    typeof input.model === "string" && input.model.length <= 100
      ? input.model
      : undefined;
  const grounded =
    typeof input.grounded === "boolean" ? input.grounded : undefined;
  if (
    input.replyMode !== undefined &&
    input.replyMode !== "text" &&
    input.replyMode !== "voice"
  ) {
    return {
      ok: false,
      response: chatJsonError("Reply mode is invalid.", 400, requestId),
    };
  }
  const replyMode = input.replyMode === "voice" ? "voice" : "text";

  const authorization = request.headers.get("authorization")?.trim() ?? null;
  if (
    authorization &&
    (!/^Bearer\s+\S{20,8192}$/i.test(authorization) ||
      /[\r\n]/.test(authorization))
  ) {
    return {
      ok: false,
      response: chatJsonError(
        "Authorization header is invalid.",
        401,
        requestId,
      ),
    };
  }

  return {
    ok: true,
    data: {
      messages,
      ...(threadId ? { threadId } : {}),
      ...(model ? { model } : {}),
      ...(grounded !== undefined ? { grounded } : {}),
      replyMode,
    },
    authHeader: authorization,
    requestId,
  };
}
