import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "ping",
  title: "Ping منصة إنجاز الأعمال",
  description:
    "Health check that returns the current server time and app name. Use to verify connectivity.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({ app: "منصة إنجاز الأعمال", ok: true, ts: new Date().toISOString() }),
      },
    ],
  }),
});
