import pg from "pg";

export const getMigrationDatabaseUrl = (source: NodeJS.ProcessEnv) => {
  const databaseUrl = source.DATABASE_URL ?? source.MIGRATION_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL or MIGRATION_DATABASE_URL must be set before running database migrations");
  }

  return databaseUrl;
};

export const createMigrationPool = (source: NodeJS.ProcessEnv = process.env) =>
  new pg.Pool({
    connectionString: getMigrationDatabaseUrl(source)
  });
