-- Bai 3 - week 4: do truy van truoc va sau khi them index thu hai.
-- Run database/11_generate_performance_events.sql first for a representative dataset.
-- The first EXPLAIN is the baseline; the second measures the added index.
EXPLAIN (ANALYZE, BUFFERS)
SELECT class_section_id,
       event_type,
       date_trunc('month', occurred_at) AS event_month,
       COUNT(*) AS event_count
FROM enrollment_events
WHERE class_section_id = 'WEB-01'
  AND event_type = 'CREATED'
  AND occurred_at >= TIMESTAMP '2025-12-20 00:00:00'
GROUP BY class_section_id, event_type, date_trunc('month', occurred_at)
ORDER BY event_month DESC;

CREATE INDEX IF NOT EXISTS idx_enrollment_events_section_type_time
    ON enrollment_events (class_section_id, event_type, occurred_at DESC);

ANALYZE enrollment_events;

EXPLAIN (ANALYZE, BUFFERS)
SELECT class_section_id,
       event_type,
       date_trunc('month', occurred_at) AS event_month,
       COUNT(*) AS event_count
FROM enrollment_events
WHERE class_section_id = 'WEB-01'
  AND event_type = 'CREATED'
  AND occurred_at >= TIMESTAMP '2025-12-20 00:00:00'
GROUP BY class_section_id, event_type, date_trunc('month', occurred_at)
ORDER BY event_month DESC;
