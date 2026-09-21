# Twenty server + client project

Two independent projects:

- `server/` — official Twenty CRM `docker-compose.yml` (server, worker, Postgres, Redis)
- `client/` — a Vitest project that talks to that server via `twenty-client-sdk`

## 1. Start the server

```bash
cd server
docker compose up -d
```

First boot can take a minute (DB migrations run automatically). Check status:

```bash
curl http://localhost:3000/healthz
```

Once it responds, open http://localhost:3000 in a browser and create your
workspace/account through the UI (first run only).

Before going further, edit `server/.env` and set a real `PG_DATABASE_PASSWORD`
(only if this is the very first `docker compose up` — changing it later won't
update Postgres's existing password). The `ENCRYPTION_KEY` is already filled
in with a freshly generated value; keep it secret and don't reuse it in
production.

## 2. Get an API key

In the Twenty UI: **Settings → Developers → API Keys** → create one, copy the
token.

## 3. Configure and run the client

```bash
cd client
npm install
cp .env.example .env   # already done for you; edit TWENTY_API_KEY
npm run check-env      # confirms dotenv is actually loading TWENTY_API_URL
npm test
```

`vitest.config.ts` calls `dotenv.config()` at the top — this is the fix for
the earlier bug where the client silently fell back to `http://localhost:2020`
because `.env` was never being loaded into `process.env` in the first place.

## Notes

- `client/src/__tests__/global-setup.ts` pings `/healthz` before any test
  runs, so a down server fails fast with a clear message instead of a raw
  `ECONNREFUSED` buried in a test.
- Don't commit `.env` in either folder — both `.gitignore` files already
  exclude it.
- `twenty-client-sdk` version in `client/package.json` is a placeholder;
  pin it to whatever version matches your running Twenty server version.
