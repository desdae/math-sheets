import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const endMock = vi.fn();
const poolConstructor = vi.fn(() => ({
  query: queryMock,
  end: endMock
}));

vi.mock("pg", () => ({
  default: {
    Pool: poolConstructor
  }
}));

vi.mock("../config/env.js", () => ({
  env: {
    DATABASE_URL: "postgres://postgres:postgres@localhost:5433/mathsheets"
  }
}));

describe("db pool", () => {
  beforeEach(() => {
    queryMock.mockReset();
    endMock.mockReset();
    poolConstructor.mockClear();
  });

  it("creates the Pool lazily and reuses it across queries", async () => {
    const { pool, resetPoolForTests } = await import("../db/pool.js");

    resetPoolForTests();
    queryMock.mockResolvedValue({ rows: [{ value: 1 }] });

    await pool.query("select 1");
    await pool.query("select 1");

    expect(poolConstructor).toHaveBeenCalledTimes(1);
    expect(poolConstructor).toHaveBeenCalledWith({
      connectionString: "postgres://postgres:postgres@localhost:5433/mathsheets"
    });
  });
});
