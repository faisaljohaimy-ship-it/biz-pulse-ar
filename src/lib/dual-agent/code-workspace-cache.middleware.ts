import { createMiddleware } from "@tanstack/react-start";
import { getResponseHeader, setResponseHeader } from "@tanstack/react-start/server";

function protectCodeResponse(): void {
  setResponseHeader("Cache-Control", "private, no-store");
  setResponseHeader("Vercel-CDN-Cache-Control", "no-store");
  const vary = getResponseHeader("Vary");
  const fields = (vary ?? "")
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  if (!fields.some((field) => field === "*" || field.toLowerCase() === "authorization")) {
    setResponseHeader("Vary", [...fields, "Authorization"].join(", "));
  }
}

/** Runs before authentication, including denials and downstream failures. */
export const privateCodeResponse = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    protectCodeResponse();
    try {
      return await next();
    } finally {
      // Downstream handlers can add Vary fields or replace cache directives.
      protectCodeResponse();
    }
  },
);
