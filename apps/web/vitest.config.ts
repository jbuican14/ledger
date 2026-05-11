import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Tests live next to their source files.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
