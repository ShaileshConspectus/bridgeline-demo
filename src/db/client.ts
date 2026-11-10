import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "fs";
import path from "path";
import * as schema from "./schema";
import { BetterSqliteCompatShim } from "./node-sqlite-shim";

// Local file-based SQLite DB, per the spec's least-cost/local-prototype
// stack decision (Section 9.2) — zero setup, zero hosting cost.
//
// Driver note: this runs on Node's built-in `node:sqlite` (via
// node-sqlite-shim.ts), not the `better-sqlite3` native addon. The two
// behave the same from the app's point of view — drizzle still talks to
// `better-sqlite3`'s driver/session code, just against a shim object that
// mimics the handful of methods it actually calls (prepare/run/all/get/
// raw/pragma/close). This sidesteps a native-module compile step
// (node-gyp needs to download Node's C headers, which isn't always
// possible depending on network policy) in exchange for zero functional
// difference for a single-process SQLite file like this one.
const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "mel-tool.db");

// Create the parent directory ourselves so a fresh checkout (or a
// deleted/reset data/ folder) doesn't crash on first run.
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new BetterSqliteCompatShim(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite as never, { schema });
export { sqlite };

// Auto-apply migrations on every import of this module (dev server start,
// `npm run db:seed`, `npm run build`, etc.) so a fresh checkout — or a
// deleted/reset data/ folder — just works without a separate manual
// `drizzle-kit migrate` step. Migrations are idempotent (Drizzle tracks
// what's applied in `__drizzle_migrations`), so this is a cheap no-op on
// every run after the first.
migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
