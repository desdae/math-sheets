import pg from "pg";
import { env } from "../config/env.js";

let sharedPool: pg.Pool | null = null;

export const getPool = () => {
  if (!sharedPool) {
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

export const pool = new Proxy({} as pg.Pool, {
  get(_target, property) {
    const currentPool = getPool();
    const value = currentPool[property as keyof pg.Pool];

    return typeof value === "function" ? value.bind(currentPool) : value;
  }
});
