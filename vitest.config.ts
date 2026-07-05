import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // "server-only" poisons non-RSC imports; stub it so server libs are testable
      "server-only": path.resolve(__dirname, "__tests__/stubs/server-only.ts"),
      "@": path.resolve(__dirname, "."),
    },
  },
});
