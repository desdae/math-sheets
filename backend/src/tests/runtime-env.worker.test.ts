import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const workerStyleProcessEnv = {
  NODE_ENV: "production",
  APP_BASE_URL: "https://app.mathsheets.example",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  GOOGLE_CALLBACK_URL: "https://api.mathsheets.example/api/auth/google/callback",
  JWT_ACCESS_SECRET: "access-secret",
  JWT_REFRESH_SECRET: "refresh-secret",
  COOKIE_DOMAIN: ".mathsheets.example"
};

describe("runtime env worker import", () => {
  const originalProcessEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalProcessEnv };
  });

  afterEach(() => {
    process.env = originalProcessEnv;
    vi.resetModules();
    vi.unmock("node:url");
  });

  it("does not resolve dotenv paths when configuring worker env", async () => {
    vi.doMock("node:url", () => ({
      fileURLToPath: () => {
        throw new Error("fileURLToPath should not run during worker env setup");
      }
    }));

    const { configureWorkerEnv, getEnv, resetRuntimeEnvForTests } = await import("../config/runtime-env.js");

    resetRuntimeEnvForTests();
    configureWorkerEnv({
      NODE_ENV: "production",
      APP_BASE_URL: "https://app.mathsheets.example",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      GOOGLE_CALLBACK_URL: "https://api.mathsheets.example/api/auth/google/callback",
      JWT_ACCESS_SECRET: "access-secret",
      JWT_REFRESH_SECRET: "refresh-secret",
      COOKIE_DOMAIN: ".mathsheets.example",
      HYPERDRIVE: {
        connectionString: "postgres://hyperdrive-user:secret@hyperdrive.cloudflare.com:5432/mathsheets"
      }
    });

    expect(getEnv().DATABASE_URL).toBe(
      "postgres://hyperdrive-user:secret@hyperdrive.cloudflare.com:5432/mathsheets"
    );
  });

  it("reuses worker-populated process env without resolving dotenv paths", async () => {
    process.env = {
      ...originalProcessEnv,
      ...workerStyleProcessEnv
    };

    vi.doMock("node:url", () => ({
      fileURLToPath: () => {
        throw new Error("fileURLToPath should not run when worker bindings already populated process.env");
      }
    }));

    const { env, resetRuntimeEnvForTests } = await import("../config/env.js");

    resetRuntimeEnvForTests();

    expect(env.NODE_ENV).toBe("production");
    expect(env.APP_BASE_URL).toBe("https://app.mathsheets.example");
  });
});
