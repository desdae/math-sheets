import { beforeEach, describe, expect, it, vi } from "vitest";

const listenMock = vi.fn();
const httpServerHandlerMock = vi.fn(() => ({
  fetch: vi.fn()
}));
const configureWorkerEnvMock = vi.fn();

vi.mock("cloudflare:node", () => ({
  httpServerHandler: httpServerHandlerMock
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    NODE_ENV: "production",
    APP_BASE_URL: "https://app.mathsheets.example",
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "secret",
    GOOGLE_CALLBACK_URL: "https://api.mathsheets.example/api/auth/google/callback",
    JWT_ACCESS_SECRET: "access-secret",
    JWT_REFRESH_SECRET: "refresh-secret",
    COOKIE_DOMAIN: ".mathsheets.example",
    HYPERDRIVE: {
      connectionString: "postgres://worker@hyperdrive.cloudflare.com:5432/mathsheets"
    }
  }
}));

vi.mock("../config/env.js", async () => {
  const actual = await vi.importActual<typeof import("../config/env.js")>("../config/env.js");

  return {
    ...actual,
    configureWorkerEnv: configureWorkerEnvMock
  };
});

vi.mock("../app.js", () => ({
  createApp: () => ({
    listen: listenMock
  })
}));

describe("worker bootstrap", () => {
  beforeEach(() => {
    listenMock.mockReset();
    httpServerHandlerMock.mockClear();
    configureWorkerEnvMock.mockReset();
  });

  it("installs worker bindings, starts the express app, and exports a Cloudflare handler", async () => {
    const workerModule = await import("../worker.js");

    expect(configureWorkerEnvMock).toHaveBeenCalledTimes(1);
    expect(listenMock).toHaveBeenCalledWith(3000);
    expect(httpServerHandlerMock).toHaveBeenCalledWith({ port: 3000 });
    expect(workerModule.default).toBeDefined();
  });
});
