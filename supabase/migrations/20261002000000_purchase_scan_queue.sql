-- Purchases → Scan invoices (approved 10-01): invoices waiting to be scanned or
-- reviewed. Each row is one uploaded invoice file (an attachment); the ai-scan
-- edge function reads it and stores what it found in scanned_data, and the row is
-- deleted once the purchase is saved or the invoice is discarded. Unreviewed
-- invoices stay here across reloads and devices.

CREATE TABLE public.purchase_scan_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attachment_id uuid NOT NULL REFERENCES public.attachments(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  -- queued → scanning → ready (or failed, with error)
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'scanning', 'ready', 'failed')),
  scanned_data jsonb,
  error text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX purchase_scan_queue_org_created_idx ON public.purchase_scan_queue (organization_id, created_at);

CREATE TRIGGER update_purchase_scan_queue_updated_at
  BEFORE UPDATE ON public.purchase_scan_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.purchase_scan_queue ENABLE ROW LEVEL SECURITY;

-- As with purchases: the org's Admins and Managers only. A queued invoice must be
-- one of that org's own files.
CREATE POLICY "Admins and Managers manage their org's scan queue" ON public.purchase_scan_queue
  FOR ALL TO authenticated
  USING (public.user_is_admin_or_manager_of_org(organization_id, auth.uid()))
  WITH CHECK (
    public.user_is_admin_or_manager_of_org(organization_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.attachments a
      WHERE a.id = attachment_id AND a.organization_id = purchase_scan_queue.organization_id
    )
  );

REVOKE ALL ON public.purchase_scan_queue FROM anon;
