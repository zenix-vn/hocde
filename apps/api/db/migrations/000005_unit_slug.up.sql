-- slug ổn định cho chương, để công cụ nhập nội dung (content import) upsert được.
ALTER TABLE units ADD COLUMN slug TEXT;
UPDATE units SET slug = 'unit-' || substr(id::text, 1, 8) WHERE slug IS NULL;
ALTER TABLE units ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX units_course_slug_key ON units(course_id, slug);
