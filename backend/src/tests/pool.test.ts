import { beforeEach, describe, expect, it, vi } from "vitest";

const connectMock = vi.fn();
const queryMock = vi.fn();
const endMock = vi.fn();
const clientConstructor = vi.fn(() => ({
  connect: connectMock,
  query: queryMock,
  end: endMock
}));

vi.mock("pg", () => ({
  default: {
    Client: clientConstructor
  }
}));

vi.mock("../config/env.js", () => ({
  env: {
    DATABASE_URL: "postgres://postgres:postgres@localhost:5433/mathsheets"
  }
}));

describe("db pool", () => {
  beforeEach(() => {
    connectMock.mockReset();
    queryMock.mockReset();
    endMock.mockReset();
    clientConstructor.mockClear();
  });

  it("creates a fresh client for each standalone query", async () => {
    const { pool, resetPoolForTests } = await import("../db/pool.js");

    resetPoolForTests();
    connectMock.mockResolvedValue(undefined);
    queryMock.mockResolvedValue({ rows: [{ value: 1 }] });

    await pool.query("select 1");
    await pool.query("select 1");

    expect(clientConstructor).toHaveBeenCalledTimes(2);
    expect(clientConstructor).toHaveBeenCalledWith({
      connectionString: "postgres://postgres:postgres@localhost:5433/mathsheets"
    });
    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(endMock).toHaveBeenCalledTimes(2);
  });

  it("returns a releasable connected client for transaction flows", async () => {
    const { pool, resetPoolForTests } = await import("../db/pool.js");

    resetPoolForTests();
    connectMock.mockResolvedValue(undefined);
    queryMock.mockResolvedValue({ rows: [] });

    const client = await pool.connect();
    await client.query("BEGIN");
    await client.release();

    expect(clientConstructor).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledWith("BEGIN");
    expect(endMock).toHaveBeenCalledTimes(1);
  });
});
