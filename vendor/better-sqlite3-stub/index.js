// Stub for the real `better-sqlite3` native addon — see package.json for
// why this exists. drizzle-orm/better-sqlite3/driver.js imports the
// default export unconditionally; this app passes its own node:sqlite
// shim object into drizzle() instead, so the real constructor is never
// called. If it ever IS called, fail loudly rather than silently doing
// nothing.
class BetterSqlite3Stub {
  constructor() {
    throw new Error(
      "better-sqlite3 stub was instantiated directly. This app runs on " +
        "node:sqlite via src/db/node-sqlite-shim.ts — if you're seeing " +
        "this, something is constructing the sqlite client without going " +
        "through src/db/client.ts.",
    );
  }
}

module.exports = BetterSqlite3Stub;
module.exports.default = BetterSqlite3Stub;
