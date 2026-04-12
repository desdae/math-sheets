import { readFileSync } from "node:fs";
import { pool } from "./pool.js";

const seed = readFileSync(new URL("../../../database/seed.sql", import.meta.url), "utf8");

await pool.query(seed);
await pool.end();

console.log("database seeded");
