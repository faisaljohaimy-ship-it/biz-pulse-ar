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
  ...(process.env.VERCEL ? { nitro: { preset: "vercel" } } : {}),
  vite: {
    plugins: [mcpPlugin()],
    // Keep the heavy CLIENT-ONLY markdown/highlighter stack OUT of the SSR
    // (serverless) bundle. `MessageResponseImpl` is "use client" + lazy, so the
    // server never executes shiki/mermaid — but bundling & minifying shiki's
    // ~7 MB of language grammars (with oniguruma wasm inlined) into the server
    // was the peak build-memory consumer that OOM-killed the Vercel build.
    // Externalizing them cuts memory in BOTH the SSR render and the nitro
    // packaging stages, without bloating the function (loaded from node_modules
    // at runtime — though the server never actually calls them).
    ssr: {
      external: [
        "shiki",
        "@shikijs/langs",
        "@shikijs/themes",
        "@shikijs/core",
        "@shikijs/engine-javascript",
        "@shikijs/engine-oniguruma",
        "mermaid",
        "@mermaid-js/parser",
        "streamdown",
        "@streamdown/code",
        "@streamdown/mermaid",
        "@streamdown/math",
        "@streamdown/cjk",
        // Browser-only heavy libraries (WebGL / WebRTC / canvas / DOM-map /
        // PDF-viewer). They are ONLY reached from click handlers or lazy,
        // client-rendered scenes — the server never executes them — so keeping
        // them out of the SSR rollup render + minify (and the nitro packaging)
        // removes the remaining peak-memory that OOM-killed the Vercel build.
        // The Three.js chunk is additionally dead-code-eliminated at its lazy
        // import sites via `import.meta.env.SSR`; listing it here is defensive.
        "three",
        "@react-three/fiber",
        "@react-three/drei",
        "postprocessing",
        "pdfjs-dist",
        "livekit-client",
        "leaflet",
        "react-leaflet",
        "html2canvas",
        "canvg",
      ],
    },
    build: {
      // Source maps for 8000+ modules are a major build-memory consumer and
      // are not needed in production — disabling them is the biggest single
      // reduction in peak RSS (fixes Vercel Hobby OOM / SIGKILL).
      sourcemap: false,
      rollupOptions: {
        output: {
          // Only split framer-motion (broadly shared, genuinely eager) into its
          // own vendor chunk. Do NOT force-group three/charts/markdown: those
          // are reached ONLY via lazy boundaries (r3f scenes, lazy dashboards,
          // the lazy MessageResponse), so letting Rollup split them naturally
          // keeps them in async chunks. Force-grouping them into named vendor
          // chunks was pulling shared transitive deps (micromark/hast, also used
          // eagerly by react-markdown) into a 12.8 MB "markdown-vendor" chunk
          // that the shared/core bundle then imported EAGERLY on every page.
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return;
            if (/[\\/]framer-motion[\\/]/.test(id)) return "motion-vendor";
            return undefined;
          },
        },
      },
    },
  },
});
