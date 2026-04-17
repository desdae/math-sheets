import { readFileSync } from "node:fs";
import { closePool, pool } from "./pool.js";

const schema = readFileSync(new URL("../../../database/schema.sql", import.meta.url), "utf8");
const views = readFileSync(new URL("../../../database/views.sql", import.meta.url), "utf8");

await pool.query(schema);
await pool.query(views);
await closePool();

console.log("database migrated");
