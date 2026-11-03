BEGIN;
DROP TABLE enrollment_events;
DELETE FROM schema_migrations WHERE version = &#39;001&#39;;
COMMIT;