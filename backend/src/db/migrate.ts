import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createMigrationPool } from "./migration-connection.js";

config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env")
});

const schema = readFileSync(new URL("../../../database/schema.sql", import.meta.url), "utf8");
const views = readFileSync(new URL("../../../database/views.sql", import.meta.url), "utf8");
const pool = createMigrationPool();

await pool.query(schema);
await pool.query(views);
await pool.end();

console.log("database migrated");
