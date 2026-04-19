import { beforeEach, describe, expect, it, vi } from "vitest";

const listenMock = vi.fn();
const handlerFetchMock = vi.fn(async () => new Response("ok"));
const httpServerHandlerMock = vi.fn(() => ({
  fetch: handlerFetchMock
}));
const configureWorkerEnvMock = vi.fn();
const workerEnv = {
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
};

vi.mock("cloudflare:node", () => ({
  httpServerHandler: httpServerHandlerMock
}));

vi.mock("cloudflare:workers", () => ({
  env: workerEnv
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
    handlerFetchMock.mockClear();
    configureWorkerEnvMock.mockReset();
  });

  it("installs worker bindings only when handling a request", async () => {
    const workerModule = await import("../worker.js");
    const request = new Request("https://api.mathsheets.example/api/health");

    expect(configureWorkerEnvMock).not.toHaveBeenCalled();
    expect(listenMock).not.toHaveBeenCalled();
    expect(httpServerHandlerMock).not.toHaveBeenCalled();

    await workerModule.default.fetch(request, workerEnv, {} as ExecutionContext);

    expect(configureWorkerEnvMock).toHaveBeenCalledTimes(1);
    expect(configureWorkerEnvMock).toHaveBeenCalledWith(workerEnv);
    expect(listenMock).toHaveBeenCalledWith(3000);
    expect(httpServerHandlerMock).toHaveBeenCalledWith({ port: 3000 });
    expect(handlerFetchMock).toHaveBeenCalledTimes(1);
  });
});
