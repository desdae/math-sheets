import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
const dotenvPath = process.env.DOTENV_CONFIG_PATH
  ? resolve(currentDir, "../../../", process.env.DOTENV_CONFIG_PATH)
  : resolve(currentDir, "../../../.env");

config({ path: dotenvPath });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1).optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional().default(""),
  GOOGLE_CALLBACK_URL: z.string().url().optional().default("http://localhost:3000/api/auth/google/callback"),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  COOKIE_DOMAIN: z.string().default("localhost"),
  ENABLE_E2E_AUTH: z
    .string()
    .optional()
    .default("false")
    .transform((value) => value === "true")
});

export const env = envSchema.parse(process.env);
