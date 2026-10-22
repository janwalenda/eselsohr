CREATE TABLE IF NOT EXISTS nc_instances (
  id SERIAL PRIMARY KEY,
  nc_url TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_shares (
  token TEXT PRIMARY KEY,
  instance_id INT NOT NULL REFERENCES nc_instances(id) ON DELETE CASCADE,
  collective_id INT NOT NULL,
  page_id INT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_shares_instance_id_idx ON public_shares(instance_id);

