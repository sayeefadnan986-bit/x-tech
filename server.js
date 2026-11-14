const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'db.json');
const validCollections = new Set(['websites', 'reviews', 'notices', 'education', 'videos', 'forms', 'projects', 'notes', 'files', 'submissions', 'activity']);
const initialData = {
  profile: { name: 'Sayeef Adnan', title: '', intro: '', location: '', email: '', website: '' },
  settings: { theme: 'dark', accent: '#7c6cff', language: 'en' },
  websites: [],
  reviews: [],
  notices: [],
  education: [],
  videos: [],
  forms: [],
  projects: [],
  notes: [],
  files: [],
  submissions: [],
  activity: [{ id: crypto.randomUUID(), title: 'Your universe is ready', detail: 'Start by adding your first link, note, project, or announcement.', createdAt: new Date().toISOString() }]
};
let writeQueue = Promise.resolve();

async function ensureDb() {
  await fs.mkdir(dataDir, { recursive: true });
  try { await fs.access(dbFile); } catch { await fs.writeFile(dbFile, JSON.stringify(initialData, null, 2)); }
}

async function readDb() {
  await ensureDb();
  return JSON.parse(await fs.readFile(dbFile, 'utf8'));
}

async function writeDb(data) {
  writeQueue = writeQueue.then(async () => {
    await ensureDb();
    const temp = `${dbFile}.tmp`;
    await fs.writeFile(temp, JSON.stringify(data, null, 2));
    await fs.rename(temp, dbFile);
  });
  return writeQueue;
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

async function logActivity(title, detail = '') {
  const db = await readDb();
  db.activity = db.activity || [];
  db.activity.unshift({ id: crypto.randomUUID(), title, detail, createdAt: new Date().toISOString() });
  db.activity = db.activity.slice(0, 100);
  await writeDb(db);
}

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: process.env.APP_NAME || 'Generation X' });
});

app.get('/api/data', async (_req, res, next) => {
  try {
    res.json(await readDb());
  } catch (error) {
    next(error);
  }
});

app.get('/api/:collection', async (req, res, next) => {
  try {
    if (!validCollections.has(req.params.collection)) return res.status(404).json({ error: 'Collection not found' });
    const db = await readDb();
    res.json(db[req.params.collection] || []);
  } catch (error) {
    next(error);
  }
});

app.post('/api/:collection', async (req, res, next) => {
  try {
    const { collection } = req.params;
    if (!validCollections.has(collection) || ['activity', 'submissions'].includes(collection)) {
      return res.status(404).json({ error: 'Collection not found or not directly writable' });
    }

    const db = await readDb();
    const item = { ...req.body, id: crypto.randomUUID(), createdAt: new Date().toISOString() };

    if (collection === 'websites') {
      item.title = cleanString(item.title, 160);
      item.url = validUrl(item.url);
      if (!item.title || !item.url) {
        return res.status(400).json({ error: 'A title and valid http(s) URL are required.' });
      }
    }

    if (collection === 'notices' && !cleanString(item.title, 160)) {
      return res.status(400).json({ error: 'A notice title is required.' });
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

    if (collection === 'videos' || collection === 'projects' || collection === 'education') {
      if (item.url) {
        const url = validUrl(item.url);
        if (!url) return res.status(400).json({ error: 'Use a valid http(s) URL.' });
        item.url = url;
      }
    }

    db[collection] ||= [];
    db[collection].unshift(item);
    await writeDb(db);
    await logActivity(`Added ${collection.slice(0, -1)}`, item.title || item.name || '');
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.put('/api/:collection/:id', async (req, res, next) => {
  try {
    const { collection, id } = req.params;
    if (!validCollections.has(collection) || ['activity', 'submissions'].includes(collection)) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const db = await readDb();
    const list = db[collection] || [];
    const index = list.findIndex((entry) => entry.id === id);
    if (index < 0) return res.status(404).json({ error: 'Item not found' });

    const updates = { ...req.body };
    delete updates.id;
    delete updates.createdAt;

    if (collection === 'websites' && updates.url) {
      updates.url = validUrl(updates.url);
      if (!updates.url) return res.status(400).json({ error: 'Use a valid http(s) URL.' });
    }

    list[index] = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
    await writeDb(db);
    res.json(list[index]);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/:collection/:id', async (req, res, next) => {
  try {
    const { collection, id } = req.params;
    if (!validCollections.has(collection) || ['activity', 'submissions'].includes(collection)) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const db = await readDb();
    const before = (db[collection] || []).length;
    db[collection] = (db[collection] || []).filter((entry) => entry.id !== id);
    if (db[collection].length === before) return res.status(404).json({ error: 'Item not found' });
    await writeDb(db);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.put('/api/profile', async (req, res, next) => {
  try {
    const db = await readDb();
    db.profile = { ...db.profile, ...req.body };
    await writeDb(db);
    res.json(db.profile);
  } catch (error) {
    next(error);
  }
});

app.put('/api/settings', async (req, res, next) => {
  try {
    const db = await readDb();
    db.settings = { ...db.settings, ...req.body };
    await writeDb(db);
    res.json(db.settings);
  } catch (error) {
    next(error);
  }
});

app.post('/api/forms/:id/submit', async (req, res, next) => {
  try {
    const db = await readDb();
    const form = (db.forms || []).find((item) => item.id === req.params.id);
    if (!form) return res.status(404).json({ error: 'Form not found.' });

    const submission = {
      id: crypto.randomUUID(),
      formId: form.id,
      values: req.body.values || {},
      createdAt: new Date().toISOString()
    };

    db.submissions ||= [];
    db.submissions.unshift(submission);
    await writeDb(db);
    await logActivity('Form submission received', form.title);
    res.status(201).json({ ok: true, submissionId: submission.id });
  } catch (error) {
    next(error);
  }
});

app.get('/api/export', async (_req, res, next) => {
  try {
    const db = await readDb();
    res.setHeader('Content-Disposition', 'attachment; filename="generation-x-backup.json"');
    res.json(db);
  } catch (error) {
    next(error);
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

ensureDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Generation X running at http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
