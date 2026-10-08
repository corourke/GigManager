-- #171 (10-08, Cameron): "Store time unit, choices are Hr, Day, 1/2 Day."
--
-- 1. gig_staff_assignments.rate_unit: the time unit a rate is paid per, 'hour',
--    'day' or 'half_day'. units_completed counts units of it, so pay is still
--    rate × units_completed. Existing rows are hourly, which is what the app has
--    always shown. A fee is a flat amount and ignores the unit.
-- 2. Assignees still can't change their own pay terms: the unit joins rate and fee
--    in restrict_assignee_self_update (otherwise as in 20260925000000).

-- 1. Column ----------------------------------------------------------------------
ALTER TABLE public.gig_staff_assignments
  ADD COLUMN rate_unit text NOT NULL DEFAULT 'hour'
  CONSTRAINT gig_staff_assignments_rate_unit_values CHECK (rate_unit IN ('hour', 'day', 'half_day'));
COMMENT ON COLUMN public.gig_staff_assignments.rate_unit IS
  'Time unit the rate is paid per: hour, day or half_day. units_completed counts this unit. Not used for a fee.';

-- 2. Assignee self-update guard --------------------------------------------------
CREATE OR REPLACE FUNCTION public.restrict_assignee_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL
     OR user_is_admin_or_manager_of_org(gig_staff_slot_org_id(OLD.slot_id), auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF (NEW.id, NEW.slot_id, NEW.user_id, NEW.rate, NEW.rate_unit, NEW.fee, NEW.notes, NEW.assigned_at,
      NEW.completed_at, NEW.units_completed, NEW.gig_financial_id)
     IS DISTINCT FROM
     (OLD.id, OLD.slot_id, OLD.user_id, OLD.rate, OLD.rate_unit, OLD.fee, OLD.notes, OLD.assigned_at,
      OLD.completed_at, OLD.units_completed, OLD.gig_financial_id) THEN
    RAISE EXCEPTION 'Staff can only confirm or decline their own assignment'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
