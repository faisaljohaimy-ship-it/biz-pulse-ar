// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Nitro deploy target. The wrapper defaults to Cloudflare and, inside the
  // Lovable sandbox, force-pins `cloudflare-module` regardless of what we set
  // here — so this only takes effect on real (non-sandbox) builds. On Vercel
  // (VERCEL=1 is injected into the build env) we switch nitro to its `vercel`
  // preset so it emits Build Output API v3 (`.vercel/output`) and the SSR +
  // /api routes actually run as serverless functions. Without this the pages
  // render blank and the chatbot returns "could not complete". The GitHub
  // Actions → Cloudflare path (no VERCEL env) keeps the Cloudflare default,
  // so no existing deploy target is disturbed.
  // `minify: false` on the server bundle: the SSR/serverless output does NOT
  // need minification (size is not perf-critical there), and minifying the huge
  // markdown/shiki chunk — with oniguruma wasm inlined in module mode — is the
  // peak build-memory consumer that OOM-kills the Vercel build. Turning it off
  // slashes peak RSS. The CLIENT bundle stays minified (Vite default).
  ...(process.env.VERCEL ? { nitro: { preset: "vercel" } } : {}),
  vite: {
    plugins: [mcpPlugin()],
    build: {
      // Source maps for 8000+ modules are a major build-memory consumer and
      // are not needed in production — disabling them is the biggest single
      // reduction in peak RSS (fixes Vercel Hobby OOM / SIGKILL).
      sourcemap: false,
      rollupOptions: {
        output: {
          // Split the heaviest vendors into their own chunks so Rollup renders
          // them separately and peak memory during "rendering chunks" stays low.
          // (SSR/server build ignores manualChunks — this only shapes the client.)
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return;
            if (/[\\/](three|@react-three)[\\/]/.test(id)) return "three-vendor";
            if (/[\\/](recharts|d3-[a-z]+|internmap|victory)[\\/]/.test(id)) return "charts-vendor";
            // Markdown/highlighter/diagram stack (reached only via the lazy
            // MessageResponse) — kept in dedicated async chunks.
            if (/[\\/](shiki|@shikijs|mermaid|streamdown|@streamdown)[\\/]/.test(id))
              return "markdown-vendor";
            if (/[\\/]framer-motion[\\/]/.test(id)) return "motion-vendor";
            return undefined;
          },
        },
      },
    },
  },
});
