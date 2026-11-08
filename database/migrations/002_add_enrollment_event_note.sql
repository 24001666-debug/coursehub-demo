-- Bai 4 - week 4: them cot note cho enrollment_events.
BEGIN;

ALTER TABLE enrollment_events
    ADD COLUMN note VARCHAR(200);

INSERT INTO schema_migrations (version, description)
VALUES ('002', 'Add optional note to enrollment events');

COMMIT;
