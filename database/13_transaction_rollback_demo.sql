-- Bai 2 - week 4: minh hoa rollback khi INSERT enrollment_events that bai.
DO $$
DECLARE
    demo_student_id VARCHAR(8);
    demo_section_id VARCHAR(20);
    enrollments_before BIGINT;
    enrollments_after BIGINT;
BEGIN
    SELECT s.id, cs.id
    INTO demo_student_id, demo_section_id
    FROM students AS s
    CROSS JOIN class_sections AS cs
    WHERE NOT EXISTS (
        SELECT 1
        FROM enrollments AS e
        WHERE e.student_id = s.id
          AND e.class_section_id = cs.id
    )
    ORDER BY s.id, cs.id
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No unused student/class-section pair is available';
    END IF;

    SELECT COUNT(*) INTO enrollments_before FROM enrollments;

    BEGIN
        INSERT INTO enrollments (student_id, class_section_id)
        VALUES (demo_student_id, demo_section_id);

        INSERT INTO enrollment_events
            (student_id, class_section_id, event_type, source, dataset)
        VALUES
            (demo_student_id, demo_section_id, 'INVALID_TEST', 'rollback-demo', 'demo');
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'Expected event_type constraint failure; subtransaction rolled back';
    END;

    SELECT COUNT(*) INTO enrollments_after FROM enrollments;

    IF enrollments_after <> enrollments_before THEN
        RAISE EXCEPTION
            'Rollback failed: enrollments count changed from % to %',
            enrollments_before,
            enrollments_after;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM enrollments
        WHERE student_id = demo_student_id
          AND class_section_id = demo_section_id
    ) THEN
        RAISE EXCEPTION 'Rollback failed: demo enrollment still exists';
    END IF;

    RAISE NOTICE
        'PASS: enrollment count stayed at % after enrollment_events insert failed',
        enrollments_after;
END
$$;
