import { spawn } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = join(repositoryRoot, "apps/api");
const committedOpenApi = join(repositoryRoot, "apps/api/openapi.json");
const committedClient = join(repositoryRoot, "apps/web/src/api/generated");
const tsNode = join(apiRoot, "node_modules/.bin/ts-node");
const openApiTs = join(repositoryRoot, "node_modules/.bin/openapi-ts");

function run(command, args, cwd = repositoryRoot) {
  const childEnvironment = { ...process.env };
  delete childEnvironment.npm_command;
  delete childEnvironment.npm_lifecycle_event;
  delete childEnvironment.npm_lifecycle_script;

  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      env: childEnvironment,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", rejectRun);
    child.once("close", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} exited with status ${code ?? 1}`));
    });
  });
}

async function filesUnder(root) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

async function assertSameFile(actual, expected, label) {
  const [actualContent, expectedContent] = await Promise.all([
    readFile(actual).catch(() => undefined),
    readFile(expected).catch(() => undefined),
  ]);
  if (
    !actualContent ||
    !expectedContent ||
    !actualContent.equals(expectedContent)
  ) {
    throw new Error(`${label} is stale. Run pnpm api:client:generate.`);
  }
}

async function assertSameDirectory(actual, expected) {
  const [actualFiles, expectedFiles] = await Promise.all([
    filesUnder(actual).catch(() => []),
    filesUnder(expected).catch(() => []),
  ]);
  const actualRelative = actualFiles.map((file) => relative(actual, file));
  const expectedRelative = expectedFiles.map((file) =>
    relative(expected, file),
  );

  if (JSON.stringify(actualRelative) !== JSON.stringify(expectedRelative)) {
    throw new Error(
      "Generated API client file set is stale. Run pnpm api:client:generate.",
    );
  }

  await Promise.all(
    actualRelative.map((file) =>
      assertSameFile(join(actual, file), join(expected, file), file),
    ),
  );
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "generate" && mode !== "check") {
    console.error("Usage: node scripts/api-client.mjs <generate|check>");
    process.exit(2);
  }

  const temporaryRoot = await mkdtemp(join(tmpdir(), "fina-api-client-"));
  const temporaryOpenApi = join(temporaryRoot, "openapi.json");
  const temporaryClient = join(temporaryRoot, "generated");

  try {
    await run("pnpm", ["--filter", "@fina/types", "build"]);
    await run(
      tsNode,
      [
        "-r",
        "tsconfig-paths/register",
        "scripts/generate-openapi.ts",
        "--output",
        temporaryOpenApi,
      ],
      apiRoot,
    );
    await run(openApiTs, [
      "--output",
      temporaryClient,
      "--input",
      temporaryOpenApi,
      "--client",
      "legacy/fetch",
      "--no-log-file",
    ]);

    if (mode === "generate") {
      await rm(committedClient, { recursive: true, force: true });
      await mkdir(committedClient, { recursive: true });
      await cp(temporaryClient, committedClient, { recursive: true });
      await writeFile(committedOpenApi, await readFile(temporaryOpenApi));
      console.log("Generated OpenAPI and web API client artifacts.");
      return;
    }

    await assertSameFile(
      temporaryOpenApi,
      committedOpenApi,
      "Generated OpenAPI document",
    );
    await assertSameDirectory(temporaryClient, committedClient);
    console.log("Generated OpenAPI and API client artifacts are current.");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

await main();
