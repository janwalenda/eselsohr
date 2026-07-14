CREATE TABLE IF NOT EXISTS page_tags (
  instance_id INT NOT NULL REFERENCES nc_instances(id) ON DELETE CASCADE,
  collective_id INT NOT NULL,
  page_id INT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (instance_id, collective_id, page_id, tag)
);

CREATE INDEX IF NOT EXISTS page_tags_tag_idx ON page_tags(tag);

CREATE INDEX IF NOT EXISTS page_tags_instance_collective_idx
  ON page_tags(instance_id, collective_id);
