import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "ping",
  title: "Ping NEXUS",
  description:
    "Health check that returns the current server time and app name. Use to verify connectivity.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({ app: "NEXUS AI OS", ok: true, ts: new Date().toISOString() }),
      },
    ],
  }),
});
