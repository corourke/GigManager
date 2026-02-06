-- Migration: Centralize Gig Financial Information
-- Created at: 2026-02-05

-- 1. Create Enums
CREATE TYPE fin_type AS ENUM (
  'Bid Submitted',
  'Bid Accepted',
  'Bid Rejected',
  'Contract Submitted',
  'Contract Revised',
  'Contract Signed',
  'Contract Rejected',
  'Contract Cancelled',
  'Contract Settled',
  'Sub-Contract Submitted',
  'Sub-Contract Revised',
  'Sub-Contract Signed',
  'Sub-Contract Rejected',
  'Sub-Contract Cancelled',
  'Sub-Contract Settled',
  'Deposit Received',
  'Deposit Sent',
  'Deposit Refunded',
  'Payment Sent',
  'Payment Recieved',
  'Expense Incurred',
  'Expense Reimbursed',
  'Invoice Issued',
  'Invoice Settled'
);

CREATE TYPE fin_category AS ENUM (
  'Labor',
  'Equipment',
  'Transportation',
  'Venue',
  'Production',
  'Insurance',
  'Rebillable',
  'Other'
);

-- 2. Rename gig_bids to gig_financials
ALTER TABLE gig_bids RENAME TO gig_financials;
ALTER INDEX idx_gig_bids_gig_id RENAME TO idx_gig_financials_gig_id;
ALTER INDEX idx_gig_bids_org_id RENAME TO idx_gig_financials_org_id;

-- 3. Update gig_financials table structure
ALTER TABLE gig_financials 
  RENAME COLUMN date_given TO date;

ALTER TABLE gig_financials
  DROP COLUMN result,
  ADD COLUMN type fin_type NOT NULL DEFAULT 'Bid Submitted',
  ADD COLUMN category fin_category NOT NULL DEFAULT 'Other',
  ADD COLUMN reference_number TEXT,
  ADD COLUMN counterparty_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN external_entity_name TEXT,
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN description TEXT,
  ADD COLUMN due_date DATE,
  ADD COLUMN paid_at TIMESTAMPTZ,
  ADD COLUMN updated_by UUID REFERENCES users(id),
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Migrate existing gigs.amount_paid to gig_financials
-- We'll assume the amount_paid in gigs represents a 'Payment Recieved' for 'Production'
INSERT INTO gig_financials (
  gig_id,
  organization_id,
  amount,
  date,
  type,
  category,
  description,
  created_by,
  updated_by
)
SELECT 
  id,
  created_by, -- Use the gig creator's organization? 
              -- Actually, we should probably find the primary organization from gig_participants
              -- But for simplicity in migration, we can try to find one participant
  amount_paid,
  created_at::DATE,
  'Payment Recieved',
  'Production',
  'Legacy amount_paid from gigs table',
  created_by,
  updated_by
FROM gigs
WHERE amount_paid IS NOT NULL AND amount_paid > 0;

-- Note: The organization_id might be tricky if a gig has multiple participants.
-- Let's try to refine the organization_id selection.
UPDATE gig_financials gf
SET organization_id = (
  SELECT organization_id 
  FROM gig_participants gp 
  WHERE gp.gig_id = gf.gig_id 
  LIMIT 1
)
WHERE gf.organization_id IS NULL OR gf.organization_id NOT IN (SELECT id FROM organizations);

-- 5. Drop gigs.amount_paid
ALTER TABLE gigs DROP COLUMN amount_paid;

-- 6. Update create_gig_complex RPC
CREATE OR REPLACE FUNCTION create_gig_complex(
  p_gig_data JSONB,
  p_participants JSONB DEFAULT '[]'::JSONB,
  p_staff_slots JSONB DEFAULT '[]'::JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gig_id UUID;
  v_user_id UUID;
  v_participant JSONB;
  v_slot JSONB;
  v_assignment JSONB;
  v_role_id UUID;
  v_slot_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert Gig
  INSERT INTO gigs (
    title, 
    start, 
    "end", 
    timezone, 
    status, 
    venue_address,
    notes,
    settlement_type,
    settlement_amount,
    tags, 
    parent_gig_id, 
    hierarchy_depth, 
    created_by, 
    updated_by
  ) VALUES (
    p_gig_data->>'title',
    (p_gig_data->>'start')::TIMESTAMPTZ,
    (p_gig_data->>'end')::TIMESTAMPTZ,
    COALESCE(p_gig_data->>'timezone', 'UTC'),
    COALESCE(p_gig_data->>'status', 'DateHold')::gig_status,
    p_gig_data->>'venue_address',
    p_gig_data->>'notes',
    (p_gig_data->>'settlement_type')::settlement_type,
    (p_gig_data->>'settlement_amount')::DECIMAL,
    COALESCE((SELECT array_agg(x) FROM jsonb_array_elements_text(p_gig_data->'tags') x), ARRAY[]::TEXT[]),
    (p_gig_data->>'parent_gig_id')::UUID,
    COALESCE((p_gig_data->>'hierarchy_depth')::INTEGER, 0),
    v_user_id,
    v_user_id
  ) RETURNING id INTO v_gig_id;

  -- Insert Participants
  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants) LOOP
    INSERT INTO gig_participants (gig_id, organization_id, role, notes)
    VALUES (
      v_gig_id, 
      (v_participant->>'organization_id')::UUID, 
      v_participant->>'role', 
      v_participant->>'notes'
    );
  END LOOP;

  -- Insert Staff Slots and Assignments
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_staff_slots) LOOP
    -- Handle Staff Role (Insert if not exists)
    INSERT INTO staff_roles (name)
    VALUES (v_slot->>'role')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_role_id;

    INSERT INTO gig_staff_slots (gig_id, organization_id, staff_role_id, required_count, notes)
    VALUES (
      v_gig_id, 
      COALESCE((v_slot->>'organization_id')::UUID, (p_gig_data->>'primary_organization_id')::UUID),
      v_role_id,
      COALESCE((v_slot->>'count')::INTEGER, (v_slot->>'required_count')::INTEGER, 1),
      v_slot->>'notes'
    ) RETURNING id INTO v_slot_id;

    -- Insert Assignments for this slot
    IF v_slot ? 'assignments' THEN
      FOR v_assignment IN SELECT * FROM jsonb_array_elements(v_slot->'assignments') LOOP
        IF v_assignment->>'user_id' IS NOT NULL THEN
          INSERT INTO gig_staff_assignments (slot_id, user_id, status, rate, fee, notes)
          VALUES (
            v_slot_id,
            (v_assignment->>'user_id')::UUID,
            COALESCE(v_assignment->>'status', 'Requested'),
            (v_assignment->>'rate')::DECIMAL,
            (v_assignment->>'fee')::DECIMAL,
            v_assignment->>'notes'
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Return the created gig ID
  RETURN jsonb_build_object('id', v_gig_id);
END;
$$;

-- 7. RLS Policies for gig_financials
ALTER TABLE gig_financials ENABLE ROW LEVEL SECURITY;

-- Admins and Managers can see all financials for their organization
CREATE POLICY "Admins and Managers can view their organization's financials"
  ON gig_financials
  FOR SELECT
  TO authenticated
  USING (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
  );

CREATE POLICY "Admins and Managers can insert their organization's financials"
  ON gig_financials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
  );

CREATE POLICY "Admins and Managers can update their organization's financials"
  ON gig_financials
  FOR UPDATE
  TO authenticated
  USING (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
  )
  WITH CHECK (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
  );

CREATE POLICY "Admins and Managers can delete their organization's financials"
  ON gig_financials
  FOR DELETE
  TO authenticated
  USING (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
  );

-- Triggers for updated_at
CREATE TRIGGER update_gig_financials_updated_at
  BEFORE UPDATE ON gig_financials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
