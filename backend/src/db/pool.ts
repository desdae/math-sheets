import pg from "pg";
import { env } from "../config/env.js";

type PgPool = InstanceType<typeof pg.Pool>;

let sharedPool: PgPool | null = null;

export const getPool = () => {
  if (!sharedPool) {
    if (!env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not configured for the current runtime");
    }

    sharedPool = new pg.Pool({
      connectionString: env.DATABASE_URL
    });
  }

  return sharedPool;
};

export const closePool = async () => {
  if (!sharedPool) {
    return;
  }

  const currentPool = sharedPool;
  sharedPool = null;
  await currentPool.end();
};

export const resetPoolForTests = () => {
  sharedPool = null;
};

export const pool = new Proxy({} as PgPool, {
  get(_target, property) {
    const currentPool = getPool();
    const value = currentPool[property as keyof PgPool];

    return typeof value === "function" ? value.bind(currentPool) : value;
  }
});
