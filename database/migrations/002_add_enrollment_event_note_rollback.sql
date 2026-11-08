-- Bai 4 - week 4: rollback migration 002; du lieu trong cot note se bi mat.
BEGIN;

ALTER TABLE enrollment_events
    DROP COLUMN note;

DELETE FROM schema_migrations
WHERE version = '002';

COMMIT;
