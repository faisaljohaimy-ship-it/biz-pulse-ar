// SADEED owns its build pipeline. No hosted editor or Lovable build wrapper
// is required. Runtime MCP routes remain compatible during the staged detach.
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig(({ command, mode }) => {
  // Only public VITE_ values are eligible for client replacement. Preserve
  // the original explicit Supabase fallbacks below; never expose server keys.
  const publicEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine = Object.fromEntries(
    Object.entries(publicEnv).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  );

  return {
    ...(command === "build" && mode === "development"
      ? {
          environments: {
            client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } },
          },
          esbuild: { keepNames: true },
        }
      : {}),
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
    server: { host: "::", port: 8080 },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      ...(command === "build"
        ? [
            nitro({
              defaultPreset: "cloudflare-module",
              ...(process.env.VERCEL ? { preset: "vercel" } : {}),
            }),
          ]
        : []),
      react(),
      mcpPlugin(),
    ],
    // Publishable (public) Supabase config baked in as a LAST-RESORT fallback.
    // The published build was shipping without VITE_SUPABASE_* injected, so the
    // browser client fell back to the "unconfigured" host and every auth/data
    // call failed. Platform-provided env still wins; these literals only fill
    // the gap. Both values are public/publishable — no secret is exposed.
    // They name the independent production project (cnaevysaoimzusnvpazr), not
    // the frozen Lovable Cloud copy — see docs/operations/LOVABLE_DETACH_2026-11-03.md.
    define: {
      ...envDefine,
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        process.env.VITE_SUPABASE_URL ||
          process.env.SUPABASE_URL ||
          "https://cnaevysaoimzusnvpazr.supabase.co",
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          "sb_publishable_1p_17X2c_IAC280bLHv8lQ_D9HaPYGn",
      ),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
        process.env.VITE_SUPABASE_PROJECT_ID ||
          process.env.SUPABASE_PROJECT_ID ||
          "cnaevysaoimzusnvpazr",
      ),
    },

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
  };
});
