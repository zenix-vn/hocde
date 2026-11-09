DROP INDEX IF EXISTS units_course_slug_key;
ALTER TABLE units DROP COLUMN IF EXISTS slug;
