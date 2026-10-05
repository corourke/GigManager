-- Migration: simplify gig financials to two directions with stages (Design A)
--
-- Before: every row had one of 25 `fin_type` values, and a single deal was
-- spread over several rows (Informal Terms + Invoice Issued + Payment Received).
-- After: each row is money coming in or going out (`direction`) and sits at one
-- `stage` of its lifecycle. One row per payment; a partial payment splits a row.
--
--   amount          the agreed amount (NULL only while a bid is requested)
--   amount_settled  what actually changed hands (set once stage = 'paid')
--   date            when the item started (first fee row's date)
--   due_date        when payment is due (NULL = due once the gig is over)
--   paid_at         when it was paid
--
-- Existing rows are converted per gig and organization:
--   * money in: the fee rows (terms, bids, contracts, invoices) collapse into
--     the most recent one, at the most advanced stage reached. Payments are
--     folded in: the last payment settles the fee row, earlier ones stay as
--     their own paid rows, and if less than the fee was received the fee row
--     keeps the unpaid remainder at its stage.
--   * money out: one row each, mapped by type. Expenses with no paid_at were
--     spent on their date, so they become paid on that date.
-- Each surviving row gets a `financial.converted` activity_log entry listing
-- the old rows it came from, so History can show the original trail.
--
-- The old column is kept as `legacy_type` (nullable, unused by the app) so the
-- conversion can be audited; a later migration drops it.

-- ─── 1. Types and columns ────────────────────────────────────────────────────

CREATE TYPE "public"."fin_direction" AS ENUM ('in', 'out');

CREATE TYPE "public"."fin_stage" AS ENUM (
    'requested',      -- bid requested, no amount yet
    'quoted',         -- bid sent (in) / bid received (out)
    'accepted',
    'contract_sent',
    'contracted',
    'invoiced',       -- "Invoiced" (in) / "Owed" (out)
    'paid',
    'declined',
    'cancelled'
);

ALTER TABLE "public"."gig_financials"
    ADD COLUMN "direction" "public"."fin_direction",
    ADD COLUMN "stage" "public"."fin_stage",
    ADD COLUMN "amount_settled" numeric(10,2);

ALTER TABLE "public"."gig_financials" RENAME COLUMN "type" TO "legacy_type";
ALTER TABLE "public"."gig_financials" ALTER COLUMN "legacy_type" DROP NOT NULL;
ALTER TABLE "public"."gig_financials" ALTER COLUMN "amount" DROP NOT NULL;

-- ─── 2. Convert existing rows ────────────────────────────────────────────────

-- Old row id → the row that carries it after conversion.
CREATE TEMP TABLE fin_conv (
    source_id uuid PRIMARY KEY,
    target_id uuid NOT NULL,
    source    jsonb NOT NULL
);

INSERT INTO fin_conv (source_id, target_id, source)
SELECT f.id, f.id, jsonb_strip_nulls(jsonb_build_object(
           'id', f.id, 'type', f.legacy_type, 'amount', f.amount, 'date', f.date,
           'due_date', f.due_date, 'paid_at', f.paid_at,
           'description', NULLIF(btrim(f.description), ''),
           'notes', NULLIF(btrim(f.notes), '')))
FROM "public"."gig_financials" f;

-- 2a. Money out, and money in that is never merged: one row each.
UPDATE "public"."gig_financials" f
SET direction = m.direction::"public"."fin_direction",
    stage = m.stage::"public"."fin_stage"
FROM (VALUES
    ('Expense Incurred',       'out', 'paid'),
    ('Payment Sent',           'out', 'paid'),
    ('Deposit Sent',           'out', 'paid'),
    ('Deposit Refunded',       'out', 'paid'),
    ('Sub-Contract Submitted', 'out', 'quoted'),
    ('Sub-Contract Revised',   'out', 'quoted'),
    ('Sub-Contract Signed',    'out', 'contracted'),
    ('Sub-Contract Rejected',  'out', 'declined'),
    ('Sub-Contract Cancelled', 'out', 'cancelled'),
    ('Sub-Contract Settled',   'out', 'paid'),
    ('Expense Reimbursed',     'in',  'paid')
) AS m(legacy_type, direction, stage)
WHERE f.legacy_type::text = m.legacy_type;

UPDATE "public"."gig_financials"
SET paid_at = COALESCE(paid_at, date::timestamptz),
    amount_settled = amount
WHERE stage = 'paid';

-- 2b. Money in: fee rows and payments, merged per gig and organization.
CREATE TEMP TABLE fin_fee (id uuid, stage "public"."fin_stage", rnk int, date date, created_at timestamptz);

DO $$
DECLARE
    grp        record;
    fee        record;   -- the surviving fee row
    pay        record;
    v_stage    "public"."fin_stage";
    v_fee      numeric;
    v_total    numeric;
    v_before   numeric;  -- paid by payments other than the last
    v_last     uuid;
    v_count    int;
    v_notes    text;
BEGIN
    FOR grp IN
        SELECT DISTINCT f.gig_id, f.organization_id, g.status::text AS gig_status
        FROM "public"."gig_financials" f
        JOIN "public"."gigs" g ON g.id = f.gig_id
        WHERE f.direction IS NULL
    LOOP
        -- Fee rows, ranked: latest date wins, then the more advanced type.
        TRUNCATE fin_fee;
        INSERT INTO fin_fee
        SELECT f.id, m.stage::"public"."fin_stage", m.rnk, f.date, f.created_at
        FROM "public"."gig_financials" f
        JOIN (VALUES
            ('Bid Submitted',      'quoted',        1),
            ('Informal Terms',     'accepted',      2),
            ('Bid Accepted',       'accepted',      2),
            ('Contract Submitted', 'contract_sent', 3),
            ('Contract Revised',   'contract_sent', 3),
            ('Contract Signed',    'contracted',    4),
            ('Invoice Issued',     'invoiced',      5),
            ('Contract Settled',   'paid',          6),
            ('Invoice Settled',    'paid',          6),
            ('Bid Rejected',       'declined',      0),
            ('Contract Rejected',  'declined',      0),
            ('Contract Cancelled', 'cancelled',     0)
        ) AS m(legacy_type, stage, rnk) ON f.legacy_type::text = m.legacy_type
        WHERE f.gig_id = grp.gig_id
          AND f.organization_id IS NOT DISTINCT FROM grp.organization_id
          AND f.direction IS NULL;

        SELECT count(*) INTO v_count FROM fin_fee;

        IF v_count = 0 THEN
            -- Payments with no fee row (imported history): each is a paid row.
            UPDATE "public"."gig_financials"
            SET direction = 'in', stage = 'paid',
                paid_at = COALESCE(paid_at, date::timestamptz),
                amount_settled = amount
            WHERE gig_id = grp.gig_id
              AND organization_id IS NOT DISTINCT FROM grp.organization_id
              AND direction IS NULL;
            CONTINUE;
        END IF;

        SELECT f.* INTO fee
        FROM fin_fee x JOIN "public"."gig_financials" f ON f.id = x.id
        ORDER BY x.date DESC, x.rnk DESC, x.created_at DESC
        LIMIT 1;

        -- Stage: the latest row if it ended the deal, else the furthest reached.
        SELECT x.stage INTO v_stage FROM fin_fee x WHERE x.id = fee.id;
        IF v_stage NOT IN ('declined', 'cancelled') THEN
            SELECT x.stage INTO v_stage FROM fin_fee x ORDER BY x.rnk DESC LIMIT 1;
        END IF;
        v_fee := fee.amount;

        -- Fold the other fee rows into the surviving one.
        UPDATE "public"."gig_financials" s
        SET direction = 'in',
            stage = v_stage,
            date = (SELECT min(x.date) FROM fin_fee x),
            due_date = COALESCE(s.due_date, (SELECT f.due_date FROM fin_fee x JOIN "public"."gig_financials" f ON f.id = x.id
                                             WHERE f.due_date IS NOT NULL ORDER BY x.rnk DESC, x.date DESC LIMIT 1)),
            description = COALESCE(NULLIF(btrim(s.description), ''),
                                   (SELECT btrim(f.description) FROM fin_fee x JOIN "public"."gig_financials" f ON f.id = x.id
                                    WHERE NULLIF(btrim(f.description), '') IS NOT NULL ORDER BY x.date DESC LIMIT 1)),
            reference_number = COALESCE(s.reference_number, (SELECT f.reference_number FROM fin_fee x JOIN "public"."gig_financials" f ON f.id = x.id
                                                              WHERE f.reference_number IS NOT NULL ORDER BY x.date DESC LIMIT 1)),
            counterparty_id = COALESCE(s.counterparty_id, (SELECT f.counterparty_id FROM fin_fee x JOIN "public"."gig_financials" f ON f.id = x.id
                                                            WHERE f.counterparty_id IS NOT NULL ORDER BY x.date DESC LIMIT 1)),
            external_entity_name = COALESCE(NULLIF(btrim(s.external_entity_name), ''),
                                            (SELECT f.external_entity_name FROM fin_fee x JOIN "public"."gig_financials" f ON f.id = x.id
                                             WHERE NULLIF(btrim(f.external_entity_name), '') IS NOT NULL ORDER BY x.date DESC LIMIT 1)),
            notes = (SELECT NULLIF(string_agg(DISTINCT btrim(f.notes), E'\n'), '') FROM fin_fee x JOIN "public"."gig_financials" f ON f.id = x.id
                     WHERE NULLIF(btrim(f.notes), '') IS NOT NULL),
            paid_at = NULL,
            amount_settled = NULL
        WHERE s.id = fee.id;

        UPDATE fin_conv c SET target_id = fee.id
        FROM fin_fee x WHERE c.source_id = x.id;

        -- Payments.
        SELECT COALESCE(sum(amount), 0), count(*) INTO v_total, v_count
        FROM "public"."gig_financials"
        WHERE gig_id = grp.gig_id
          AND organization_id IS NOT DISTINCT FROM grp.organization_id
          AND direction IS NULL
          AND legacy_type IN ('Payment Received', 'Deposit Received');

        -- Every payment becomes a paid row of its own...
        UPDATE "public"."gig_financials"
        SET direction = 'in', stage = 'paid',
            paid_at = COALESCE(paid_at, date::timestamptz),
            amount_settled = amount,
            description = COALESCE(NULLIF(btrim(description), ''),
                                   CASE WHEN legacy_type = 'Deposit Received' THEN 'Deposit' END)
        WHERE gig_id = grp.gig_id
          AND organization_id IS NOT DISTINCT FROM grp.organization_id
          AND direction IS NULL
          AND legacy_type IN ('Payment Received', 'Deposit Received');

        IF v_count > 0 AND v_stage NOT IN ('declined', 'cancelled') THEN
            IF v_total < v_fee THEN
                -- ...and the fee row keeps the unpaid remainder.
                UPDATE "public"."gig_financials" SET amount = v_fee - v_total WHERE id = fee.id;
            ELSE
                -- ...except the last, which settles the fee row itself.
                SELECT f.* INTO pay FROM "public"."gig_financials" f
                JOIN fin_conv c ON c.source_id = f.id
                WHERE f.gig_id = grp.gig_id
                  AND f.organization_id IS NOT DISTINCT FROM grp.organization_id
                  AND f.legacy_type IN ('Payment Received', 'Deposit Received')
                ORDER BY f.paid_at DESC, f.created_at DESC
                LIMIT 1;
                v_before := v_total - pay.amount;
                v_notes := NULLIF(btrim(pay.description), '');

                UPDATE "public"."gig_financials" s
                SET stage = 'paid',
                    amount = CASE WHEN v_fee - v_before > 0 THEN v_fee - v_before ELSE pay.amount END,
                    amount_settled = pay.amount,
                    paid_at = pay.paid_at,
                    reference_number = COALESCE(s.reference_number, pay.reference_number),
                    counterparty_id = COALESCE(s.counterparty_id, pay.counterparty_id),
                    notes = CASE
                        WHEN v_notes IS NULL OR v_notes = 'Deposit' THEN s.notes
                        ELSE concat_ws(E'\n', s.notes, 'Payment: ' || v_notes)
                    END
                WHERE s.id = fee.id;

                UPDATE fin_conv SET target_id = fee.id WHERE source_id = pay.id;
                UPDATE "public"."entity_attachments" SET entity_id = fee.id
                    WHERE entity_type = 'gig_financial' AND entity_id = pay.id;
                UPDATE "public"."gig_staff_assignments" SET gig_financial_id = fee.id
                    WHERE gig_financial_id = pay.id;
                DELETE FROM "public"."gig_financials" WHERE id = pay.id;
            END IF;
        ELSIF grp.gig_status = 'Cancelled' AND v_stage NOT IN ('paid', 'declined') THEN
            -- A fee on a cancelled gig with nothing paid is cancelled.
            UPDATE "public"."gig_financials" SET stage = 'cancelled' WHERE id = fee.id;
        END IF;

        -- Drop the fee rows that were folded in.
        UPDATE "public"."entity_attachments" a SET entity_id = fee.id
            FROM fin_fee x
            WHERE a.entity_type = 'gig_financial' AND a.entity_id = x.id AND x.id <> fee.id;
        UPDATE "public"."gig_staff_assignments" a SET gig_financial_id = fee.id
            FROM fin_fee x
            WHERE a.gig_financial_id = x.id AND x.id <> fee.id;
        DELETE FROM "public"."gig_financials" f
            USING fin_fee x
            WHERE f.id = x.id AND x.id <> fee.id;
    END LOOP;

    -- Anything left (payments on a gig whose fee rows were all money out, or
    -- types not listed above) is treated as received money.
    UPDATE "public"."gig_financials"
    SET direction = 'in', stage = 'paid',
        paid_at = COALESCE(paid_at, date::timestamptz),
        amount_settled = amount
    WHERE direction IS NULL;
END $$;

-- 2c. History: one entry per surviving row, listing the old rows it came from.
INSERT INTO "public"."activity_log"
    (organization_id, actor_id, event_type, entity_type, entity_id, gig_id, context)
SELECT f.organization_id, NULL, 'financial.converted', 'financial', f.id, f.gig_id,
       jsonb_build_object(
           'context_version', 1,
           'actor_display_name', 'GigWrangler',
           'actor_org_name', '',
           'gig_title', g.title,
           'description', f.description,
           'direction', f.direction,
           'stage', f.stage,
           'amount', f.amount,
           'amount_settled', f.amount_settled,
           'sources', (SELECT jsonb_agg(c.source ORDER BY (c.source->>'date'), (c.source->>'type'))
                       FROM fin_conv c WHERE c.target_id = f.id))
FROM "public"."gig_financials" f
JOIN "public"."gigs" g ON g.id = f.gig_id;

-- ─── 3. Constraints ──────────────────────────────────────────────────────────

ALTER TABLE "public"."gig_financials"
    ALTER COLUMN "direction" SET NOT NULL,
    ALTER COLUMN "stage" SET NOT NULL,
    ADD CONSTRAINT "gig_financials_amount_present"
        CHECK ("amount" IS NOT NULL OR "stage" = 'requested'),
    ADD CONSTRAINT "gig_financials_paid_has_settlement"
        CHECK ("stage" <> 'paid' OR ("paid_at" IS NOT NULL AND "amount_settled" IS NOT NULL));

CREATE INDEX IF NOT EXISTS "idx_gig_financials_gig_direction_stage"
    ON "public"."gig_financials" ("gig_id", "direction", "stage");

COMMENT ON COLUMN "public"."gig_financials"."direction" IS 'in = money coming to the organization, out = money it pays';
COMMENT ON COLUMN "public"."gig_financials"."stage" IS 'Lifecycle stage; every stage except paid is optional';
COMMENT ON COLUMN "public"."gig_financials"."amount" IS 'Agreed amount; NULL only while a bid is requested';
COMMENT ON COLUMN "public"."gig_financials"."amount_settled" IS 'Amount actually paid or received; set when stage = paid';
COMMENT ON COLUMN "public"."gig_financials"."legacy_type" IS 'Pre-2026-10 fin_type, kept for audit; not used by the app. Dropped in a later migration.';

DROP TABLE fin_conv;
DROP TABLE fin_fee;
