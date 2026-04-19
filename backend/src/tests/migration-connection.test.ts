import { describe, expect, it } from "vitest";
import { getMigrationDatabaseUrl } from "../db/migration-connection.js";

describe("migration connection", () => {
  it("prefers DATABASE_URL when it is provided", () => {
    expect(
      getMigrationDatabaseUrl({
        DATABASE_URL: "postgres://db-user:db-pass@db.example.com:5432/mathsheets",
        MIGRATION_DATABASE_URL: "postgres://migration-user:migration-pass@db.example.com:5432/mathsheets"
      })
    ).toBe("postgres://db-user:db-pass@db.example.com:5432/mathsheets");
  });

  it("falls back to MIGRATION_DATABASE_URL when DATABASE_URL is absent", () => {
    expect(
      getMigrationDatabaseUrl({
        MIGRATION_DATABASE_URL: "postgres://migration-user:migration-pass@db.example.com:5432/mathsheets"
      })
    ).toBe("postgres://migration-user:migration-pass@db.example.com:5432/mathsheets");
  });

  it("fails clearly when no migration connection string is available", () => {
    expect(() => getMigrationDatabaseUrl({})).toThrowError(
      "DATABASE_URL or MIGRATION_DATABASE_URL must be set before running database migrations"
    );
  });
});
