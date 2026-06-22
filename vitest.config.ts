import { defineConfig } from "vitest/config";

// Convex functions run in the Convex runtime; `edge-runtime` is the closest
// match for tests (see the Convex testing guidelines). The module map passed to
// convexTest is built via import.meta.glob inside the test files themselves.
export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["convex/**/*.test.ts"],
  },
});
