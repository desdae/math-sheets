import { spawn } from "node:child_process";
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBackendDeployCommands } from "./deploy/workflow.js";

config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env")
});

const toSpawnEnv = (env: NodeJS.ProcessEnv) =>
  Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === "string"));

const runCommand = (command: string, args: string[], env: NodeJS.ProcessEnv) =>
  new Promise<void>((resolve, reject) => {
    const child =
      process.platform === "win32"
        ? spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], {
            stdio: "inherit",
            env: toSpawnEnv(env)
          })
        : spawn(command, args, {
            stdio: "inherit",
            env: toSpawnEnv(env)
          });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`));
    });
  });

for (const command of buildBackendDeployCommands(process.env, process.argv.slice(2))) {
  await runCommand(command.command, command.args, command.env);
}
