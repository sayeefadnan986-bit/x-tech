const express = require('express');
const path = require('node:path');
const crypto = require('node:crypto');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const validCollections = new Set(['websites', 'reviews', 'notices', 'education', 'videos', 'forms', 'projects', 'notes', 'files', 'submissions', 'activity']);
const writableCollections = new Set(['websites', 'reviews', 'notices', 'education', 'videos', 'forms', 'projects', 'notes', 'files']);
const initialProfile = { name: 'Sayeef Adnan', title: '', intro: '', location: '', email: '', website: '' };
const initialSettings = { theme: 'dark', accent: '#7c6cff', language: 'en' };

let pool;
let schemaPromise;
function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured. Add your Supabase Postgres connection string to the Vercel project environment variables.');
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
    });
    pool.on('error', (error) => console.error('Unexpected Postgres pool error:', error.message));
  }
  return pool;
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const db = getPool();
      await db.query(`
        CREATE TABLE IF NOT EXISTS gx_settings (
          id text PRIMARY KEY CHECK (id = 'main'),
          profile jsonb NOT NULL DEFAULT '{}'::jsonb,
          settings jsonb NOT NULL DEFAULT '{}'::jsonb,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS gx_entries (
          id uuid PRIMARY KEY,
          collection text NOT NULL,
          payload jsonb NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS gx_entries_collection_created_idx ON gx_entries (collection, created_at DESC);
        CREATE TABLE IF NOT EXISTS gx_activity (
          id uuid PRIMARY KEY,
          payload jsonb NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS gx_activity_created_idx ON gx_activity (created_at DESC);
      `);
      await db.query(
        'INSERT INTO gx_settings (id, profile, settings) VALUES ($1, $2::jsonb, $3::jsonb) ON CONFLICT (id) DO NOTHING',
        ['main', JSON.stringify(initialProfile), JSON.stringify(initialSettings)]
      );
      const { rows } = await db.query('SELECT id FROM gx_activity LIMIT 1');
      if (rows.length === 0) {
        const welcome = { id: crypto.randomUUID(), title: 'Your universe is ready', detail: 'Start by adding your first link, note, project, or announcement.', createdAt: new Date().toISOString() };
        await db.query('INSERT INTO gx_activity (id, payload) VALUES ($1, $2::jsonb)', [welcome.id, JSON.stringify(welcome)]);
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function logActivity(title, detail = '') {
  const item = { id: crypto.randomUUID(), title, detail, createdAt: new Date().toISOString() };
  await getPool().query('INSERT INTO gx_activity (id, payload, created_at) VALUES ($1, $2::jsonb, $3)', [item.id, JSON.stringify(item), item.createdAt]);
  await getPool().query('DELETE FROM gx_activity WHERE id IN (SELECT id FROM gx_activity ORDER BY created_at DESC OFFSET 100)');
}

function cleanString(value, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', async (_req, _res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, app: process.env.APP_NAME || 'Generation X' }));

app.get('/api/data', async (_req, res, next) => {
  try {
    const db = getPool();
    const [settingsResult, entriesResult, activityResult] = await Promise.all([
      db.query('SELECT profile, settings FROM gx_settings WHERE id = $1', ['main']),
      db.query('SELECT collection, payload FROM gx_entries ORDER BY created_at DESC'),
      db.query('SELECT payload FROM gx_activity ORDER BY created_at DESC LIMIT 100')
    ]);
    const settings = settingsResult.rows[0] || { profile: initialProfile, settings: initialSettings };
    const data = {
      profile: settings.profile,
      settings: settings.settings,
      websites: [], reviews: [], notices: [], education: [], videos: [], forms: [], projects: [], notes: [], files: [], submissions: [],
      activity: activityResult.rows.map((row) => row.payload)
    };
    for (const row of entriesResult.rows) {
      if (data[row.collection]) data[row.collection].push(row.payload);
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.get('/api/export', async (_req, res, next) => {
  try {
    const db = getPool();
    const [settingsResult, entriesResult, activityResult] = await Promise.all([
      db.query('SELECT profile, settings FROM gx_settings WHERE id = $1', ['main']),
      db.query('SELECT collection, payload FROM gx_entries ORDER BY created_at DESC'),
      db.query('SELECT payload FROM gx_activity ORDER BY created_at DESC LIMIT 100')
    ]);
    const stored = settingsResult.rows[0] || { profile: initialProfile, settings: initialSettings };
    const data = { profile: stored.profile, settings: stored.settings, websites: [], reviews: [], notices: [], education: [], videos: [], forms: [], projects: [], notes: [], files: [], submissions: [], activity: activityResult.rows.map((row) => row.payload) };
    for (const row of entriesResult.rows) if (data[row.collection]) data[row.collection].push(row.payload);
    res.setHeader('Content-Disposition', 'attachment; filename="generation-x-backup.json"');
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.get('/api/profile', async (_req, res, next) => {
  try {
    const { rows } = await getPool().query('SELECT profile FROM gx_settings WHERE id = $1', ['main']);
    res.json(rows[0]?.profile || initialProfile);
  } catch (error) { next(error); }
});

app.put('/api/profile', async (req, res, next) => {
  try {
    const profile = Object.fromEntries(Object.entries(req.body || {}).map(([key, value]) => [key, cleanString(value, 2000)]));
    const { rows } = await getPool().query('UPDATE gx_settings SET profile = profile || $1::jsonb, updated_at = now() WHERE id = $2 RETURNING profile', [JSON.stringify(profile), 'main']);
    res.json(rows[0].profile);
  } catch (error) { next(error); }
});

app.get('/api/settings', async (_req, res, next) => {
  try {
    const { rows } = await getPool().query('SELECT settings FROM gx_settings WHERE id = $1', ['main']);
    res.json(rows[0]?.settings || initialSettings);
  } catch (error) { next(error); }
});

app.put('/api/settings', async (req, res, next) => {
  try {
    const updates = req.body || {};
    if (updates.theme && !['dark', 'light'].includes(updates.theme)) return res.status(400).json({ error: 'Theme must be dark or light.' });
    if (updates.accent && !/^#[0-9a-f]{6}$/i.test(updates.accent)) return res.status(400).json({ error: 'Accent must be a six-digit hex color.' });
    const { rows } = await getPool().query('UPDATE gx_settings SET settings = settings || $1::jsonb, updated_at = now() WHERE id = $2 RETURNING settings', [JSON.stringify(updates), 'main']);
    res.json(rows[0].settings);
  } catch (error) { next(error); }
});

app.get('/api/:collection', async (req, res, next) => {
  try {
    const { collection } = req.params;
    if (!validCollections.has(collection)) return res.status(404).json({ error: 'Collection not found' });
    const { rows } = collection === 'activity'
      ? await getPool().query('SELECT payload FROM gx_activity ORDER BY created_at DESC LIMIT 100')
      : await getPool().query('SELECT payload FROM gx_entries WHERE collection = $1 ORDER BY created_at DESC', [collection]);
    res.json(rows.map((row) => row.payload));
  } catch (error) { next(error); }
});

app.post('/api/:collection', async (req, res, next) => {
  try {
    const { collection } = req.params;
    if (!writableCollections.has(collection)) return res.status(404).json({ error: 'Collection not found or not directly writable' });
    const item = { ...req.body, id: crypto.randomUUID(), createdAt: new Date().toISOString() };

    if (collection === 'websites') {
      item.title = cleanString(item.title, 160);
      item.url = validUrl(item.url);
      if (!item.title || !item.url) return res.status(400).json({ error: 'A title and valid http(s) URL are required.' });
    }
    if (collection === 'notices') {
      item.title = cleanString(item.title, 160);
      if (!item.title) return res.status(400).json({ error: 'A notice title is required.' });
    }
    if (collection === 'forms') {
      item.title = cleanString(item.title, 160);
      item.fields = Array.isArray(item.fields) ? item.fields.slice(0, 30).map((field) => ({
        label: cleanString(field.label, 120),
        type: ['text', 'email', 'number', 'date', 'textarea'].includes(field.type) ? field.type : 'text',
        required: Boolean(field.required)
      })).filter((field) => field.label) : [];
      if (!item.title) return res.status(400).json({ error: 'A form title is required.' });
    }
    if (['videos', 'projects', 'education', 'files'].includes(collection) && item.url) {
      item.url = validUrl(item.url);
      if (!item.url) return res.status(400).json({ error: 'Use a valid http(s) URL.' });
    }

    await getPool().query('INSERT INTO gx_entries (id, collection, payload, created_at, updated_at) VALUES ($1, $2, $3::jsonb, $4, $4)', [item.id, collection, JSON.stringify(item), item.createdAt]);
    try { await logActivity(`Added ${collection.slice(0, -1)}`, item.title || item.name || ''); } catch (error) { console.error('Activity log failed:', error.message); }
    res.status(201).json(item);
  } catch (error) { next(error); }
});

app.put('/api/:collection/:id', async (req, res, next) => {
  try {
    const { collection, id } = req.params;
    if (!writableCollections.has(collection)) return res.status(404).json({ error: 'Collection not found' });
    const updates = { ...(req.body || {}) };
    delete updates.id;
    delete updates.createdAt;
    if (collection === 'websites' && updates.url) {
      updates.url = validUrl(updates.url);
      if (!updates.url) return res.status(400).json({ error: 'Use a valid http(s) URL.' });
    }
    const { rows } = await getPool().query(
      'UPDATE gx_entries SET payload = payload || $1::jsonb, updated_at = now() WHERE id = $2 AND collection = $3 RETURNING payload',
      [JSON.stringify({ ...updates, updatedAt: new Date().toISOString() }), id, collection]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0].payload);
  } catch (error) { next(error); }
});

app.delete('/api/:collection/:id', async (req, res, next) => {
  try {
    const { collection, id } = req.params;
    if (!writableCollections.has(collection)) return res.status(404).json({ error: 'Collection not found' });
    const { rowCount } = await getPool().query('DELETE FROM gx_entries WHERE id = $1 AND collection = $2', [id, collection]);
    if (!rowCount) return res.status(404).json({ error: 'Item not found' });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.post('/api/forms/:id/submit', async (req, res, next) => {
  try {
    const db = getPool();
    const { rows } = await db.query('SELECT payload FROM gx_entries WHERE id = $1 AND collection = $2', [req.params.id, 'forms']);
    const form = rows[0]?.payload;
    if (!form) return res.status(404).json({ error: 'Form not found.' });
    const values = req.body?.values;
    if (!values || typeof values !== 'object' || Array.isArray(values)) return res.status(400).json({ error: 'Submission values must be an object.' });
    const submission = { id: crypto.randomUUID(), formId: form.id, values, createdAt: new Date().toISOString() };
    await db.query('INSERT INTO gx_entries (id, collection, payload, created_at, updated_at) VALUES ($1, $2, $3::jsonb, $4, $4)', [submission.id, 'submissions', JSON.stringify(submission), submission.createdAt]);
    try { await logActivity('Form submission received', form.title); } catch (error) { console.error('Activity log failed:', error.message); }
    res.status(201).json({ ok: true, submissionId: submission.id });
  } catch (error) { next(error); }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((error, _req, res, _next) => {
  console.error(error);
  const message = error.message?.includes('DATABASE_URL') ? error.message : 'Something went wrong. Check the deployment logs and try again.';
  res.status(500).json({ error: message });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Generation X running at http://localhost:${port}`));
}

module.exports = app;
