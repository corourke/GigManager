-- Add missing RLS policy for asset_status_history to allow status changes
-- This policy allows inserting into asset_status_history if the user has permission to manage the asset
CREATE POLICY "Admins and Managers can insert asset status history" ON "public"."asset_status_history"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assets a
            WHERE a.id = asset_status_history.asset_id
            AND public.user_is_admin_or_manager_of_org(a.organization_id, auth.uid())
        )
    );
