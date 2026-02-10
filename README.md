# SarahLibrary — Backend Setup (Neon/Postgres)

This tiny backend uses Node + Express + Postgres (Neon). It serves your static site and provides simple API endpoints to list and toggle book borrow status.

Steps to run locally with Neon:

1. Install dependencies

```bash
npm install
```

2. Set your Neon connection string in environment variable `DATABASE_URL`. Example (PowerShell):

```powershell
$env:DATABASE_URL = "postgres://<user>:<pass>@<host>:5432/<db>?sslmode=require"
npm start
```

3. Initialize DB (creates `books` table and inserts a small seed):

```bash
curl -X POST http://localhost:3000/api/init
```

4. Visit `http://localhost:3000/` to see your site; the frontend will fetch `/api/books` and render them.

Notes:
- Do NOT commit your `DATABASE_URL` into source control. Use environment variables or a secrets manager.
- Neon requires TLS; the server sets `ssl.rejectUnauthorized = false` when a connection string is present which works for many Neon setups. Adjust if your environment requires stricter TLS.
