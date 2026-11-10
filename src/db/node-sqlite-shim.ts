// A thin compatibility layer that lets drizzle-orm's `better-sqlite3`
// driver (session.js) run against Node's built-in `node:sqlite` module
// instead of the `better-sqlite3` native addon.
//
// Why: `better-sqlite3` is a native addon — installing it compiles C++
// against Node's headers via node-gyp. That step needs to fetch Node's
// headers from nodejs.org, which isn't reachable from every environment
// this app gets built in. `node:sqlite` ships inside Node itself (stable
// since Node 22.5, marked experimental but functionally complete for
// what this app needs), so there's nothing to compile.
//
// Scope: this only implements the handful of methods drizzle-orm's
// better-sqlite3 session actually calls — `prepare().run/all/get`,
// `prepare().raw().all/get` (used when a query needs field-mapped
// results), `.pragma()`, and `.close()`. It deliberately does NOT
// implement `.transaction()` (better-sqlite3's higher-order transaction
// API) — this app never calls `db.transaction()`, and the migrator uses
// plain BEGIN/COMMIT/ROLLBACK statements instead, so it's not needed.
// If a future change starts using `db.transaction()`, this shim will
// need that method added.
import { DatabaseSync, type StatementSync } from "node:sqlite";

type Row = Record<string, unknown>;

class RawStatement {
  constructor(private readonly stmt: StatementSync) {}

  private columnOrder(): string[] {
    return this.stmt.columns().map((c: { name: unknown }) => c.name as string);
  }

  private toRow(values: unknown[]): unknown[] {
    return values;
  }

  all(...params: unknown[]): unknown[][] {
    const rows = this.stmt.all(...(params as never[])) as Row[];
    const order = this.columnOrder();
    return rows.map((row) => order.map((col) => row[col]));
  }

  get(...params: unknown[]): unknown[] | undefined {
    const row = this.stmt.get(...(params as never[])) as Row | undefined;
    if (!row) return undefined;
    const order = this.columnOrder();
    return this.toRow(order.map((col) => row[col]));
  }
}

class StatementWrapper {
  constructor(private readonly stmt: StatementSync) {}

  run(...params: unknown[]) {
    return this.stmt.run(...(params as never[]));
  }

  all(...params: unknown[]) {
    return this.stmt.all(...(params as never[]));
  }

  get(...params: unknown[]) {
    return this.stmt.get(...(params as never[]));
  }

  raw() {
    return new RawStatement(this.stmt);
  }
}

export class BetterSqliteCompatShim {
  private readonly db: DatabaseSync;

  constructor(filePath: string) {
    this.db = new DatabaseSync(filePath);
    // Set this before anything else touches the connection. Next.js's
    // build step ("collecting page data") loads every route's modules in
    // several parallel worker processes, and each one imports
    // src/db/client.ts — which opens its own connection to this same
    // file and immediately tries to apply migrations. Against a brand
    // new, not-yet-migrated database, those workers race to take the
    // first write lock; without a busy timeout, SQLite makes the losers
    // fail immediately with "database is locked" instead of waiting.
    // With this set, a losing worker just waits (up to 5s) for the lock
    // to clear, then finds the migration already applied and moves on.
    this.db.exec("PRAGMA busy_timeout = 5000");
  }

  prepare(sql: string) {
    return new StatementWrapper(this.db.prepare(sql));
  }

  pragma(pragmaString: string) {
    this.db.exec(`PRAGMA ${pragmaString}`);
  }

  exec(sql: string) {
    this.db.exec(sql);
  }

  close() {
    this.db.close();
  }
}
