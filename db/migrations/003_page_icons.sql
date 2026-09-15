CREATE TABLE IF NOT EXISTS page_icons (
  instance_id INT NOT NULL REFERENCES nc_instances(id) ON DELETE CASCADE,
  collective_id INT NOT NULL,
  page_id INT NOT NULL,
  owner_page_id INT NOT NULL,
  icon TEXT NOT NULL,
  PRIMARY KEY (instance_id, collective_id, page_id)
);

CREATE INDEX IF NOT EXISTS page_icons_instance_collective_idx
  ON page_icons(instance_id, collective_id);

CREATE INDEX IF NOT EXISTS page_icons_collective_level_idx
  ON page_icons(instance_id, collective_id)
  WHERE page_id = 0;
