import pg from "pg";
import { env } from "../config/env.js";

type PgClient = InstanceType<typeof pg.Client>;
type ReleasableClient = PgClient & {
  release: () => Promise<void>;
};

const createClient = () => {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured for the current runtime");
  }

  return new pg.Client({
    connectionString: env.DATABASE_URL
  });
};

const connectClient = async (): Promise<ReleasableClient> => {
  const client = createClient();
  await client.connect();

  return Object.assign(client, {
    release: () => client.end()
  });
};

export const getPool = () => ({
  query: async (...args: Parameters<PgClient["query"]>) => {
    const client = await connectClient();

    try {
      return await client.query(...args);
    } finally {
      await client.release();
    }
  },
  connect: connectClient
});

type PoolFacade = ReturnType<typeof getPool>;

export const closePool = async () => {
  // Hyperdrive performs the pooling; Worker requests should use short-lived clients.
};

export const resetPoolForTests = () => {
  // No shared state to reset.
};

export const pool = new Proxy({} as PoolFacade, {
  get(_target, property) {
    const currentPool = getPool();
    const value = currentPool[property as keyof PoolFacade];

    return typeof value === "function" ? value.bind(currentPool) : value;
  }
});
