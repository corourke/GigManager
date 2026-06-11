-- Migration to clean up "Synthesized Purchase Header" rows by merging them into real headers
-- This handles the case where items were imported with a synthesized header even when a real header existed.

DO $$
DECLARE
    v_synth_record RECORD;
    v_real_header_id UUID;
BEGIN
    -- Find all synthesized headers with $0.00 amount
    FOR v_synth_record IN 
        SELECT id, organization_id, purchase_date, vendor, description
        FROM public.purchases
        WHERE row_type = 'header' 
          AND description = 'Synthesized Purchase Header'
          AND (total_inv_amount = 0 OR total_inv_amount IS NULL)
    LOOP
        -- Look for a "real" header for the same organization, date, and vendor
        -- that is NOT synthesized and has a total amount > 0
        SELECT id INTO v_real_header_id
        FROM public.purchases
        WHERE organization_id = v_synth_record.organization_id
          AND purchase_date = v_synth_record.purchase_date
          AND vendor = v_synth_record.vendor
          AND row_type = 'header'
          AND description != 'Synthesized Purchase Header'
          AND total_inv_amount > 0
        LIMIT 1;

        -- If a real header is found, move items and assets to it
        IF v_real_header_id IS NOT NULL THEN
            -- 1. Update purchase items to point to the real header
            UPDATE public.purchases
            SET parent_id = v_real_header_id
            WHERE parent_id = v_synth_record.id;

            -- 2. Update assets to point to the real header
            UPDATE public.assets
            SET purchase_id = v_real_header_id
            WHERE purchase_id = v_synth_record.id;

            -- 3. Move any attachments from the synthesized header to the real one
            UPDATE public.entity_attachments
            SET entity_id = v_real_header_id
            WHERE entity_type = 'purchase' 
              AND entity_id = v_synth_record.id;

            -- 4. Delete the synthesized header row
            DELETE FROM public.purchases
            WHERE id = v_synth_record.id;
            
            RAISE NOTICE 'Merged synthesized header % for % on % into real header %', 
                v_synth_record.id, v_synth_record.vendor, v_synth_record.purchase_date, v_real_header_id;
        END IF;
    END LOOP;
END $$;
