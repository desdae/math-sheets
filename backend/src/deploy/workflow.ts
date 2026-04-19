export type DeployCommand = {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
};

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

const getMigrationDatabaseUrl = (env: NodeJS.ProcessEnv) => env.MIGRATION_DATABASE_URL ?? env.DATABASE_URL;

export const buildBackendDeployCommands = (
  env: NodeJS.ProcessEnv,
  deployArgs: string[] = []
): DeployCommand[] => {
  const migrationDatabaseUrl = getMigrationDatabaseUrl(env);

  if (!migrationDatabaseUrl) {
    throw new Error("DATABASE_URL or MIGRATION_DATABASE_URL must be set before running backend deploy automation");
  }

  return [
    {
      command: npmCommand,
      args: ["run", "migrate"],
      env: {
        ...env,
        DATABASE_URL: migrationDatabaseUrl
      }
    },
    {
      command: npxCommand,
      args: ["wrangler", "deploy", ...deployArgs],
      env
    }
  ];
};
