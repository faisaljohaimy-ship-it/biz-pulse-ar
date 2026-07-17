import { auth, defineMcp } from "@lovable.dev/mcp-js";
import pingTool from "./tools/ping";
import askAriaTool from "./tools/ask-aria";
import hcisStatusTool from "./tools/hcis-status";
import ptwActiveTool from "./tools/ptw-active";

// The OAuth issuer MUST be the direct Supabase host; the .lovable.cloud proxy
// is rejected by RFC 8414 issuer verification. VITE_SUPABASE_PROJECT_ID is
// inlined by Vite at build time; the fallback keeps the entry import-safe
// during manifest extraction.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nexus-aria-mcp",
  title: "NEXUS AI OS — ARIA",
  version: "0.1.0",
  instructions:
    "MCP server for NEXUS AI OS. Use `ping` to verify connectivity, `ask_aria` to query ARIA (the Executive AI Engine) for bilingual (AR/EN) executive briefings, `hcis_status` for HCIS industrial-security compliance (overall/per-region % + critical findings), and `ptw_active_permits` for currently active digital work permits by region/type.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [pingTool, askAriaTool, hcisStatusTool, ptwActiveTool],
});
