import { defineConfig, devices } from "@playwright/test";

const browserPort = Number(process.env.FINA_BROWSER_PORT ?? "4180");
if (
  !Number.isInteger(browserPort) ||
  browserPort < 1024 ||
  browserPort > 65535
) {
  throw new Error("FINA_BROWSER_PORT must be a port between 1024 and 65535");
}
const browserOrigin = `http://127.0.0.1:${browserPort}`;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: "list",
  use: {
    baseURL: browserOrigin,
    ...devices["Desktop Chrome"],
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: "node scripts/browser-test-server.mjs",
    url: `${browserOrigin}/login`,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
