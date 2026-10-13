import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// The app under test talks to the LOCAL Supabase only (.env.test).
// Process env beats Next's own .env loading, so .env / .env.local
// (cloud dev project keys) never reach the test server.
const testEnv = Object.fromEntries(
  readFileSync(".env.test", "utf8")
    .split("\n")
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)])
);

// The specs (e.g. isolation.spec) read the same keys.
for (const [k, v] of Object.entries(testEnv)) process.env[k] ??= v;

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.mjs/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { ...testEnv, NEXT_DIST_DIR: ".next-e2e" },
  },
});
