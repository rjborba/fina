import { spawnSync } from "node:child_process";

const requiredNode = "24.21.0";
const requiredPnpm = "10.0.0";

if (process.versions.node !== requiredNode) {
  console.error(
    `Fina requires Node ${requiredNode}; current runtime is ${process.versions.node}. Run \`nvm use\` and retry.`,
  );
  process.exit(1);
}

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.error) {
    console.error(`${command} is unavailable: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run("corepack", ["enable"]);
run("corepack", ["prepare", `pnpm@${requiredPnpm}`, "--activate"]);
run("pnpm", ["install", "--frozen-lockfile"]);

console.log("Setup complete.");
console.log("Run `pnpm infra:start` to configure local Supabase and the apps.");
console.log("Never use production credentials locally.");
