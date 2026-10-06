import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const requireFromApi = createRequire(
  join(repositoryRoot, "apps/api/package.json"),
);
const { Client } = requireFromApi("pg");

function parseEnvironmentFile(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
      .map((line) => {
        const separator = line.indexOf("=");
        const name = line.slice(0, separator);
        const rawValue = line.slice(separator + 1);

        try {
          return [name, JSON.parse(rawValue)];
        } catch {
          return [name, rawValue.replace(/^['"]|['"]$/g, "")];
        }
      }),
  );
}

function runTests(environment) {
  const result = spawnSync(pnpm, ["turbo", "run", "test:integration"], {
    cwd: repositoryRoot,
    stdio: "inherit",
    env: environment,
  });

  if (result.error) {
    throw new Error(`${pnpm} is unavailable: ${result.error.message}`);
  }

  return result.status ?? 1;
}

function assertLocalSupabase(databaseUrl) {
  const url = new URL(databaseUrl);
  const localHosts = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

  if (!localHosts.has(url.hostname) || url.port !== "54322") {
    throw new Error(
      "Local integration tests require the Supabase PostgreSQL endpoint on 127.0.0.1:54322",
    );
  }

  return url;
}

async function main() {
  if (process.env.TEST_DATABASE_URL) {
    process.exitCode = runTests(process.env);
    return;
  }

  let localEnvironment;
  try {
    localEnvironment = parseEnvironmentFile(
      join(repositoryRoot, "apps/api/.env.local"),
    );
  } catch {
    throw new Error(
      "Local Supabase configuration is missing. Run `pnpm infra:start` first.",
    );
  }

  if (!localEnvironment.DATABASE_URL) {
    throw new Error(
      "apps/api/.env.local does not contain the local Supabase DATABASE_URL.",
    );
  }

  const adminUrl = assertLocalSupabase(localEnvironment.DATABASE_URL);
  const databaseName = `fina_test_${process.pid}_${Date.now()}`;
  const testUrl = new URL(adminUrl);
  testUrl.pathname = `/${databaseName}`;

  const administrator = new Client({ connectionString: adminUrl.toString() });
  await administrator.connect();

  try {
    await administrator.query(
      `CREATE DATABASE "${databaseName}" TEMPLATE template0`,
    );
    console.log("Created an isolated database in local Supabase PostgreSQL.");

    process.exitCode = runTests({
      ...process.env,
      TEST_DATABASE_URL: testUrl.toString(),
    });
  } finally {
    await administrator.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [databaseName],
    );
    await administrator.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await administrator.end();
    console.log("Dropped the isolated integration-test database.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
