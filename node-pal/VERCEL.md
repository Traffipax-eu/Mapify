# Deploy Mapify to Vercel

## Recommended: connect Vercel to this repo

Import **`Traffipax-eu/node-pal`** (not the parent `Mapify` repo).

1. Vercel → **Add New Project** → import `node-pal`
2. Framework preset: **TanStack Start** (auto-detected)
3. Root Directory: **`.`** (repo root)
4. Build command: `npm run build`
5. Add env vars if using cloud: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
6. Deploy

Push your latest commits to GitHub before deploying (`git push origin main`).

## Alternative: parent `Mapify` repo

The `Mapify` repo only contains `node-pal` as a git submodule. If you use that repo on Vercel:

1. **Settings → Git → Include Git Submodules**: ON
2. **Settings → General → Root Directory**: `node-pal`
3. Ensure `.gitmodules` exists at the repo root (see parent `Mapify` folder)

Without submodules, Vercel clones an **empty** `node-pal` folder → “No code found”.
