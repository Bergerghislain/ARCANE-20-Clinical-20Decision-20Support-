import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./client/test/setup.ts"],
    // Les tests unitaires/composants vivent dans client/ et shared/.
    // Les tests E2E Playwright (e2e/) ne doivent pas etre executes par Vitest.
    include: ["{client,shared}/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "e2e"],
  },
});

