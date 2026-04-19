import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const runtimeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CALLBACK_URL: z.string().url().default("http://localhost:3000/api/auth/google/callback"),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  COOKIE_DOMAIN: z.string().default("localhost"),
  ENABLE_E2E_AUTH: z
    .union([z.boolean(), z.string()])
    .optional()
    .default("false")
    .transform((value) => value === true || value === "true")
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

export type WorkerBindings = Record<string, unknown> & {
  HYPERDRIVE?: { connectionString: string };
};

let runtimeEnv: RuntimeEnv | null = null;

const getDotenvPath = () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));

  return process.env.DOTENV_CONFIG_PATH
    ? resolve(currentDir, "../../../", process.env.DOTENV_CONFIG_PATH)
    : resolve(currentDir, "../../../.env");
};

const normalizeSource = (source: Record<string, unknown>) => {
  const databaseUrl =
    typeof source.DATABASE_URL === "string" && source.DATABASE_URL.length > 0
      ? source.DATABASE_URL
      : typeof (source.HYPERDRIVE as { connectionString?: unknown } | undefined)?.connectionString === "string"
        ? String((source.HYPERDRIVE as { connectionString: string }).connectionString)
        : "";

  return runtimeEnvSchema.parse({
    ...source,
    DATABASE_URL: databaseUrl
  });
};

export const configureNodeEnv = (source: Record<string, unknown> = process.env) => {
  config({ path: getDotenvPath() });
  runtimeEnv = normalizeSource(source === process.env ? (process.env as Record<string, unknown>) : source);
  return runtimeEnv;
};

export const configureWorkerEnv = (source: WorkerBindings) => {
  runtimeEnv = normalizeSource(source);
  return runtimeEnv;
};

export const getEnv = () => {
  if (!runtimeEnv) {
    runtimeEnv = configureNodeEnv();
  }

  return runtimeEnv;
};

export const setEnvValueForTests = <K extends keyof RuntimeEnv>(key: K, value: RuntimeEnv[K]) => {
  const current = getEnv();
  runtimeEnv = {
    ...current,
    [key]: value
  };
};

export const resetRuntimeEnvForTests = () => {
  runtimeEnv = null;
};
