import postgres from "postgres";
import { readFile } from "node:fs/promises";
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is required to apply migrations."); process.exit(1); }
const sql = postgres(url, { max: 1, connect_timeout: 10, ssl: "require" });
try { await sql.unsafe(await readFile(new URL("../db/migrations/0001_orbit.sql", import.meta.url), "utf8")); console.log("ORBIT schema migration applied."); }
catch (error) { console.error("Migration failed:", error instanceof Error ? error.message : "unknown error"); process.exitCode = 1; }
finally { await sql.end(); }
