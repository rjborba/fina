import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnvironment(text) {
  return Object.fromEntries(
    text.split("\n").flatMap((line) => {
      const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
      if (!match) return [];
      try {
        return [[match[1], JSON.parse(match[2])]];
      } catch {
        return [[match[1], match[2].replace(/^['"]|['"]$/g, "")]];
      }
    }),
  );
}

/** Administrative connection only; callers must create a disposable database. */
export async function localTestDatabaseUrl() {
  let databaseUrl;
  try {
    databaseUrl = parseEnvironment(
      await readFile(join(root, "apps/api/.env.local"), "utf8"),
    ).DATABASE_URL;
  } catch (error) {
    if (error.code !== "ENOENT")
      throw new Error("Local test configuration could not be read");
    // A new worktree may share the running stack without generated app config.
    // Capture status privately; never print keys or connection credentials.
    const status = spawnSync(
      "pnpm",
      ["exec", "supabase", "status", "--output", "env"],
      { cwd: root, encoding: "utf8" },
    );
    if (status.status !== 0)
      throw new Error(
        "Local Supabase is unavailable. Run pnpm infra:start first.",
      );
    databaseUrl = parseEnvironment(status.stdout).DB_URL;
  }
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("Local Supabase test database configuration is invalid");
  }
  if (
    !["127.0.0.1", "localhost", "[::1]", "::1"].includes(url.hostname) ||
    url.port !== "54322"
  ) {
    throw new Error("Tests require local Supabase PostgreSQL on port 54322");
  }
  return url;
}
