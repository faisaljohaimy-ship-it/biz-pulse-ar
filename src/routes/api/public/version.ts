/**
 * GET /api/public/version
 * Build/version manifest — required by enterprise change management to
 * correlate incidents with deploys. Stable, cheap, cacheable.
 */
import { createFileRoute } from "@tanstack/react-router";

const RELEASE = {
  product: "NEXIOS AI OS",
  edition: "Enterprise",
  version: "1.0.0",
  release_channel: "general-availability",
  schema: "1.0",
};

export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(
          {
            ...RELEASE,
            build_time: new Date().toISOString(),
            runtime: "cloudflare-workers",
          },
          { headers: { "Cache-Control": "public, max-age=60" } },
        );
      },
    },
  },
});
