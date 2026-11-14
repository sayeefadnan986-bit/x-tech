# Generation X — Personal Digital Universe

A responsive personal dashboard for websites, reviews, announcements, learning resources, videos, forms and submissions, projects, notes, file references, favorites, and activity. Created by **Sayeef Adnan**.

## Run locally

Requires Node.js 18+ and a PostgreSQL database (Supabase works well).

1. Install packages: `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string.
3. Start the server: `npm start`
4. Open <http://localhost:3000>.

The app creates its tables and initial blank profile/settings the first time its API is used. The optional schema is in `database/schema.sql`.

## Deploy to Vercel with Supabase Postgres

1. Create a Supabase project and open **Connect**. Copy the **Session pooler / Transaction pooler** connection string (port 6543 is recommended for serverless use). Use the transaction-pooler connection string from the Supabase dashboard. Do not commit the password or URL.
2. In Vercel, import the repository and set the project root to the repository root.
3. In **Project → Settings → Environment Variables**, add:
   - `DATABASE_URL` = the Supabase Postgres pooler connection string
   - `APP_NAME` = `Generation X` (optional)
   - `DATABASE_SSL` = `true` (optional; SSL is enabled by default)
4. Apply the deployment to Production and redeploy after adding or changing environment variables.
5. Open the Vercel deployment URL. The first API request creates the database tables automatically. Verify `/api/health` and add a test entry; it should remain after refresh and redeploy.

The root `index.js` exports the Express app for Vercel's Node runtime. `app.listen()` runs only in local development. Static frontend assets remain in `public/`.

## Persistence and backup

Application records, profile/settings, notices, and form submissions are stored in Supabase Postgres, not in the serverless function filesystem. Use the download icon or `/api/export` to export a JSON backup. Files in the file library are currently references/metadata; binary upload and cloud object storage are not implemented.

## Public access and security

This version does **not** implement login or admin authorization. Its write APIs are reachable by visitors to a public deployment, so do not deploy it publicly with private data until authentication and write-access controls are added. Keep `DATABASE_URL` only in Vercel's server-side environment variables and never put it in frontend code or Git. For a public production app, add authentication/authorization, rate limiting, and restricted form-submission access.

## Structure

```text
.
├── index.js                 # Vercel Express entry point
├── server.js                # Express API and local server
├── database/schema.sql      # PostgreSQL schema
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── package.json
└── .env.example
```
