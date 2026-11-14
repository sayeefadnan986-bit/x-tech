-- Generation X schema. The Node application also creates these tables on first API request.
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
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gx_activity_created_idx ON gx_activity (created_at DESC);
