/**
 * Deprecated compatibility route.
 *
 * SADEED has one authenticated voice runtime at `/api/sadeed/tts`. A permanent
 * method-preserving redirect keeps older clients functional without owning a
 * second voice, rate-limit, or provider implementation.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const target = new URL("/api/sadeed/tts", request.url);
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
