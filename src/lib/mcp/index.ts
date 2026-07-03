import { defineMcp } from "@lovable.dev/mcp-js";
import pingTool from "./tools/ping";
import askAriaTool from "./tools/ask-aria";

export default defineMcp({
  name: "nexus-aria-mcp",
  title: "NEXUS AI OS — ARIA",
  version: "0.1.0",
  instructions:
    "MCP server for NEXUS AI OS. Use `ping` to verify connectivity, and `ask_aria` to query ARIA, the Executive AI Engine, for bilingual (AR/EN) executive briefings.",
  tools: [pingTool, askAriaTool],
});
