-- Expected rows after the conversion. Raises with the differences if not exact.
CREATE TEMP TABLE expected (id text, direction text, stage text, amount numeric, amount_settled numeric,
                            date date, due_date date, paid_on date, description text, notes text);
INSERT INTO expected VALUES
  ('101', 'in',  'paid',      250.00,  250.00,  '2025-05-03', NULL,         '2025-05-03', 'Payment from import', NULL),
  ('201', 'in',  'paid',      1000.00, 1000.00, '2026-07-26', NULL,         '2026-08-22', 'Sound only', 'Payment: By Check'),
  ('301', 'in',  'paid',      300.00,  450.00,  '2026-05-29', NULL,         '2026-06-04', NULL, NULL),
  ('402', 'in',  'accepted',  1000.00, NULL,    '2026-07-22', NULL,         NULL,         'All day festival', 'Scaled back to one day'),
  ('502', 'in',  'invoiced',  750.00,  NULL,    '2026-09-16', '2026-10-26', NULL,         'Per Argyl', NULL),
  ('601', 'in',  'cancelled', 1000.00, NULL,    '2026-09-06', NULL,         NULL,         NULL, NULL),
  ('701', 'in',  'paid',      1500.00, 1500.00, '2026-05-01', NULL,         '2026-07-26', 'Wedding', 'Payment: Zelle'),
  ('702', 'in',  'paid',      500.00,  500.00,  '2026-05-10', NULL,         '2026-05-10', 'Deposit', NULL),
  ('801', 'in',  'accepted',  600.00,  NULL,    '2026-09-01', NULL,         NULL,         NULL, NULL),
  ('802', 'in',  'paid',      400.00,  400.00,  '2026-09-20', NULL,         '2026-09-20', NULL, NULL),
  ('901', 'out', 'paid',      51.30,   51.30,   '2026-09-01', NULL,         '2026-09-01', 'Mileage', NULL),
  ('902', 'out', 'paid',      200.00,  200.00,  '2026-09-02', NULL,         '2026-09-01', 'Labor: Stage Hand', NULL),
  ('a02', 'in',  'declined',  900.00,  NULL,    '2026-10-01', NULL,         NULL,         NULL, NULL);

CREATE TEMP VIEW actual AS
SELECT right(id::text, 3) AS id, direction::text, stage::text, amount, amount_settled, date, due_date,
       (paid_at AT TIME ZONE 'UTC')::date AS paid_on, description, notes
FROM gig_financials;

DO $$
DECLARE
    missing text;
    extra   text;
BEGIN
    SELECT string_agg(format('%s', e), E'\n') INTO missing FROM (SELECT * FROM expected EXCEPT SELECT * FROM actual) e;
    SELECT string_agg(format('%s', a), E'\n') INTO extra   FROM (SELECT * FROM actual EXCEPT SELECT * FROM expected) a;
    IF missing IS NOT NULL OR extra IS NOT NULL THEN
        RAISE EXCEPTION E'Converted rows differ.\nExpected but missing:\n%\nPresent but not expected:\n%',
            COALESCE(missing, '(none)'), COALESCE(extra, '(none)');
    END IF;

    -- The attachment on the folded payment row follows it to the fee row.
    IF NOT EXISTS (SELECT 1 FROM entity_attachments
                   WHERE entity_type = 'gig_financial' AND entity_id = '00000000-0000-0000-0000-000000000201') THEN
        RAISE EXCEPTION 'Attachment was not moved to the surviving row';
    END IF;

    -- One history entry per surviving row; the merged one lists both old rows.
    IF (SELECT count(*) FROM activity_log WHERE event_type = 'financial.converted') <> 13 THEN
        RAISE EXCEPTION 'Expected 13 financial.converted entries, got %',
            (SELECT count(*) FROM activity_log WHERE event_type = 'financial.converted');
    END IF;
    IF (SELECT jsonb_path_query_array(context, '$.sources[*].type')
        FROM activity_log WHERE event_type = 'financial.converted'
          AND entity_id = '00000000-0000-0000-0000-000000000402')
       <> '["Informal Terms", "Bid Accepted"]'::jsonb THEN
        RAISE EXCEPTION 'History for the revised fee does not list its old rows in order';
    END IF;

    -- New rows must say where they stand.
    BEGIN
        INSERT INTO gig_financials (gig_id, organization_id, amount, date, created_by, direction, stage)
        VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 10, '2026-10-05',
                '00000000-0000-0000-0000-0000000000a1', 'in', 'paid');
        RAISE EXCEPTION 'A paid row without paid_at was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO gig_financials (gig_id, organization_id, amount, date, created_by, direction, stage)
        VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', NULL, '2026-10-05',
                '00000000-0000-0000-0000-0000000000a1', 'out', 'quoted');
        RAISE EXCEPTION 'A quoted row without an amount was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    INSERT INTO gig_financials (gig_id, organization_id, amount, date, created_by, direction, stage)
    VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', NULL, '2026-10-05',
            '00000000-0000-0000-0000-0000000000a1', 'out', 'requested');

    RAISE NOTICE 'fin_direction_stage conversion: ok';
END $$;
