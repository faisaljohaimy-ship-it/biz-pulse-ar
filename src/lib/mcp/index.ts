import { auth, defineMcp } from "@lovable.dev/mcp-js";
import pingTool from "./tools/ping";
import askFinnTool from "./tools/ask-finn";
import hcisStatusTool from "./tools/hcis-status";
import ptwActiveTool from "./tools/ptw-active";
import { BUILTIN_PROJECT_REF, isIssuerResolved, resolveIssuer } from "./project-ref";

// The OAuth issuer MUST be the direct Supabase host; the .lovable.cloud proxy
// is rejected by RFC 8414 issuer verification.
//
// Resolution lives in ./project-ref so it can be tested without importing the
// MCP SDK. It prefers VITE_SUPABASE_PROJECT_ID and falls back to the project
// ref embedded in VITE_SUPABASE_URL — the previous code used only the former,
// which is set in no environment, so every build shipped an issuer pointing at
// `project-ref-unset.supabase.co` and no client could ever complete the OAuth
// handshake against /mcp.
// Members are read individually, not by handing over `import.meta.env` whole:
// that is the form Vite statically replaces, so the values are baked into the
// bundle instead of depending on an env object existing at runtime.
const issuer = resolveIssuer({
  VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
});
// The published build has shipped with neither variable inlined, producing an
// unresolvable issuer and a /mcp endpoint no client could authorise against.
// Fall back to the baked-in ref so discovery always points at a real host.
const oauthIssuer = isIssuerResolved({
  VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
})
  ? issuer
  : `https://${BUILTIN_PROJECT_REF}.supabase.co/auth/v1`;

export default defineMcp({
  name: "sadeed-finn-mcp",
  title: "SADEED — FINN",
  version: "0.1.0",
  instructions:
    "MCP server for SADEED OS. Use `ping` to verify connectivity, `ask_finn` to query FINN (the Executive AI Engine) for bilingual (AR/EN) executive briefings, `hcis_status` for HCIS industrial-security compliance (overall/per-region % + critical findings), and `ptw_active_permits` for currently active digital work permits by region/type.",
  auth: auth.oauth.issuer({
    issuer: oauthIssuer,
    acceptedAudiences: "authenticated",
  }),
  tools: [pingTool, askFinnTool, hcisStatusTool, ptwActiveTool],
});
