# Generation X — Personal Digital Universe

A responsive, dark/light personal hub for websites, reviews, announcements, learning resources, videos, forms, projects, notes, file references, favorites, and activity.

Created by Sayeef Adnan.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
cp .env.example .env
npm start
```

Open http://localhost:3000.

## What this includes

- Dashboard overview
- Website collection
- Review system
- Notice board
- Education hub
- Video library
- Form builder with real saved submissions
- Project center
- Notes and knowledge base
- File library
- Favorites and activity history
- Profile and settings
- Persistent JSON backup/export

## Data storage

Data is stored in `data/db.json` and persists across refreshes and server restarts. This is a lightweight single-user setup suitable for personal use and easy growth.

## Structure

```text
.
├── server.js
├── data/
│   └── db.json
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── package.json
├── .env.example
├── README.md
└── .gitignore
```

## Notes

This app intentionally leaves personal information blank where it was not provided, so you can fill it in manually later. The website is designed so each section can expand easily as needed.

## Deployment

This app is built for a Node server. It is not a static GitHub Pages only site because the server API is required.

For a production deployment, move from the JSON file store to PostgreSQL or Supabase and add authentication, authorization, and secure file-storage if required.
