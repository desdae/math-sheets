import { describe, expect, it } from "vitest";
import { buildBackendDeployCommands } from "../deploy/workflow.js";

describe("backend deploy workflow", () => {
  it("runs migrations before deploying and prefers MIGRATION_DATABASE_URL", () => {
    const commands = buildBackendDeployCommands(
      {
        MIGRATION_DATABASE_URL: "postgres://migration-user:migration-pass@db.example.com:5432/mathsheets",
        DATABASE_URL: "postgres://local-user:local-pass@localhost:5433/mathsheets",
        NODE_ENV: "production"
      },
      ["--dry-run"]
    );

    expect(commands).toHaveLength(2);
    expect(commands[0]).toMatchObject({
      command: expect.stringMatching(/npm(?:\.cmd)?$/),
      args: ["run", "migrate"],
      env: expect.objectContaining({
        DATABASE_URL: "postgres://migration-user:migration-pass@db.example.com:5432/mathsheets"
      })
    });
    expect(commands[1]).toMatchObject({
      command: expect.stringMatching(/npx(?:\.cmd)?$/),
      args: ["wrangler", "deploy", "--dry-run"]
    });
  });

  it("falls back to DATABASE_URL when no migration override is provided", () => {
    const commands = buildBackendDeployCommands({
      DATABASE_URL: "postgres://fallback-user:fallback-pass@localhost:5433/mathsheets"
    });

    expect(commands[0].env.DATABASE_URL).toBe(
      "postgres://fallback-user:fallback-pass@localhost:5433/mathsheets"
    );
  });

  it("fails clearly when no database url is available for migrations", () => {
    expect(() => buildBackendDeployCommands({})).toThrowError(
      "DATABASE_URL or MIGRATION_DATABASE_URL must be set before running backend deploy automation"
    );
  });
});
