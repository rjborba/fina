import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.FINA_BROWSER_TEST_PORT ?? 4180);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error(
    "FINA_BROWSER_TEST_PORT must be a port between 1024 and 65535.",
  );
}
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: "list",
  use: {
    baseURL: origin,
    ...devices["Desktop Chrome"],
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: "node scripts/browser-test-server.mjs",
    url: `${origin}/login`,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
