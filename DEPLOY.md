# Deploying Bridgeline for external sharing

This build no longer needs a native-module compile step (`better-sqlite3`
was swapped for Node's built-in `node:sqlite`, see `src/db/client.ts` and
`src/db/node-sqlite-shim.ts`), so it deploys cleanly to any plain Node
host. It needs a host that keeps a **long-running Node process with a
persistent disk** — the SQLite database is a file on disk, so a stateless/
serverless host (plain Vercel functions, for example) will not persist
data between requests. Railway or Render (both have a free tier) are a
good fit.

## Important — no access control yet

This build has no login and no per-user permissions (see the project
spec's Section 11/12 for the full list of what's not built). Anyone with
the deployed link can view **and edit** the same shared demo data. That's
fine for showing someone around the product; it is not a substitute for
the access-control work scoped separately before this goes anywhere near
real client data.

## Option A — Railway (recommended)

1. `npm install -g @railway/cli` (or `npx @railway/cli`)
2. `railway login` — opens a browser to authenticate with your Railway account.
3. From this project's root: `railway init` (creates a new Railway project).
4. `railway up` — builds and deploys this directory as-is.
5. In the Railway dashboard, add a **volume** mounted at `/app/data` so the
   SQLite file survives restarts/redeploys (without this, every redeploy
   resets to the reseeded demo data — which may actually be what you want
   for a shared demo link, so this step is optional).
6. Set the environment variable `DATABASE_PATH=/app/data/mel-tool.db` if
   you added the volume above.
7. Railway gives you a public `*.up.railway.app` URL once the deploy
   finishes — that's the link to share.

## Option B — Render

1. Push this directory to a GitHub repo (or use Render's "deploy from a
   public Git URL").
2. In the Render dashboard: New → Web Service → point at the repo.
3. Build command: `npm install && npm run build`
4. Start command: `npm run start`
5. Add a persistent disk mounted at `/opt/render/project/src/data` if you
   want the data to survive restarts, and set `DATABASE_PATH` to match.
6. Render gives you a public `*.onrender.com` URL.

## Local sanity check before deploying

```bash
npm install
npm run db:seed     # resets to the canonical City EV / BRARE demo state
npm run build
npm run start -- -p 3000
```

Then open `http://localhost:3000` — you should see the Conspectus
Advisors-themed landing page with the City EV and BRARE reference
projects.
