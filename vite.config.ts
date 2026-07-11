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
            return undefined;
          },
        },
      },
    },
  },
});
