import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // `n8n/tests` اختبارات مسارات n8n المولَّدة والمحرّك المصغّر (بيئة node، بلا DOM).
    include: ["src/**/*.{test,spec}.{ts,tsx}", "n8n/**/*.{test,spec}.{ts,tsx}"],
    // طبقة التكامل الحقيقية (Postgres + PostgREST) لها إعدادها الخاص
    // `vitest.integration.config.ts` — `npm test` يبقى بلا قاعدة.
    exclude: [...configDefaults.exclude, "**/*.integration.test.ts"],
    css: false,
  },
});
