import { beforeEach, describe, expect, it } from "vitest";
import {
  configureNodeEnv,
  configureWorkerEnv,
  getEnv,
  resetRuntimeEnvForTests
} from "../config/runtime-env.js";

const baseValues = {
  NODE_ENV: "development",
  APP_BASE_URL: "http://localhost:5173",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  GOOGLE_CALLBACK_URL: "http://localhost:3000/api/auth/google/callback",
  JWT_ACCESS_SECRET: "access-secret",
  JWT_REFRESH_SECRET: "refresh-secret",
  COOKIE_DOMAIN: "localhost"
};

describe("runtime env loaders", () => {
  beforeEach(() => {
    resetRuntimeEnvForTests();
  });

  it("loads node-style environment values and preserves DATABASE_URL", () => {
    configureNodeEnv({
      ...baseValues,
      DATABASE_URL: "postgres://postgres:postgres@localhost:5433/mathsheets"
    });

    expect(getEnv().DATABASE_URL).toBe("postgres://postgres:postgres@localhost:5433/mathsheets");
    expect(getEnv().NODE_ENV).toBe("development");
  });

  it("prefers the Hyperdrive connection string when Worker bindings are installed", () => {
    configureWorkerEnv({
      ...baseValues,
      NODE_ENV: "production",
      HYPERDRIVE: {
        connectionString: "postgres://hyperdrive-user:secret@hyperdrive.cloudflare.com:5432/mathsheets"
      }
    });

    expect(getEnv().DATABASE_URL).toBe(
      "postgres://hyperdrive-user:secret@hyperdrive.cloudflare.com:5432/mathsheets"
    );
    expect(getEnv().NODE_ENV).toBe("production");
  });
});
