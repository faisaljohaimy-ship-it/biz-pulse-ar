/**
 * Deprecated compatibility route.
 *
 * ARIA has one authenticated voice runtime at `/api/aria/tts`. A permanent
 * method-preserving redirect keeps older clients functional without owning a
 * second voice, rate-limit, or provider implementation.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const target = new URL("/api/aria/tts", request.url);
        return new Response(null, {
          status: 308,
          headers: {
            Location: target.toString(),
            Deprecation: "true",
            Link: `<${target.toString()}>; rel="successor-version"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
