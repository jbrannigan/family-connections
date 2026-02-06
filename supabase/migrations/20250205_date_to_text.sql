-- Migration: Change date columns to text for ISO 8601 reduced precision support
-- This allows storing dates like "1958" (year only), "1958-03" (year-month),
-- or "1958-03-15" (full date) per ISO 8601

-- Alter persons table
ALTER TABLE persons
  ALTER COLUMN birth_date TYPE text USING birth_date::text,
  ALTER COLUMN death_date TYPE text USING death_date::text;

-- Alter relationships table (for marriage dates, etc.)
ALTER TABLE relationships
  ALTER COLUMN start_date TYPE text USING start_date::text,
  ALTER COLUMN end_date TYPE text USING end_date::text;

-- Add comments explaining the format
COMMENT ON COLUMN persons.birth_date IS 'ISO 8601 date with reduced precision support: YYYY, YYYY-MM, or YYYY-MM-DD';
COMMENT ON COLUMN persons.death_date IS 'ISO 8601 date with reduced precision support: YYYY, YYYY-MM, or YYYY-MM-DD';
COMMENT ON COLUMN relationships.start_date IS 'ISO 8601 date with reduced precision support: YYYY, YYYY-MM, or YYYY-MM-DD';
COMMENT ON COLUMN relationships.end_date IS 'ISO 8601 date with reduced precision support: YYYY, YYYY-MM, or YYYY-MM-DD';
