-- 1. Create purchases table
CREATE TABLE IF NOT EXISTS "public"."purchases" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL PRIMARY KEY,
    "organization_id" "uuid" NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "gig_id" "uuid" REFERENCES "public"."gigs"("id") ON DELETE SET NULL,
    "parent_id" "uuid" REFERENCES "public"."purchases"("id") ON DELETE CASCADE,
    "row_type" "text" NOT NULL CHECK ("row_type" IN ('header', 'item')),
    "purchase_date" "date",
    "vendor" "text",
    "total_inv_amount" numeric(10,2),
    "payment_method" "text",
    "line_amount" numeric(10,2),
    "line_cost" numeric(10,2),
    "quantity" numeric(12,4),
    "item_price" numeric(10,2),
    "item_cost" numeric(10,2),
    "description" "text",
    "category" "text",
    "sub_category" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid" DEFAULT "auth"."uid"()
);

-- 2. Create attachments table
CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL PRIMARY KEY,
    "organization_id" "uuid" NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"()
);

-- 3. Create entity_attachments table
CREATE TABLE IF NOT EXISTS "public"."entity_attachments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL PRIMARY KEY,
    "attachment_id" "uuid" NOT NULL REFERENCES "public"."attachments"("id") ON DELETE CASCADE,
    "entity_type" "text" NOT NULL CHECK ("entity_type" IN ('asset', 'gig', 'purchase')),
    "entity_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"()
);

-- 4. Update assets table
DO $$
BEGIN
    -- Rename cost to item_cost if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'cost') THEN
        ALTER TABLE "public"."assets" RENAME COLUMN "cost" TO "item_cost";
    END IF;
END $$;

ALTER TABLE "public"."assets" ADD COLUMN IF NOT EXISTS "item_price" numeric(10,2);
ALTER TABLE "public"."assets" ADD COLUMN IF NOT EXISTS "retired_on" "date";
ALTER TABLE "public"."assets" ADD COLUMN IF NOT EXISTS "purchase_id" "uuid" REFERENCES "public"."purchases"("id") ON DELETE SET NULL;

-- Ensure numeric types match spec
ALTER TABLE "public"."assets" ALTER COLUMN "quantity" TYPE numeric(12,4);
ALTER TABLE "public"."assets" ALTER COLUMN "service_life" TYPE numeric;

-- 5. RLS Policies for purchases
ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Managers can manage purchases" ON "public"."purchases"
    FOR ALL USING (public.user_is_admin_or_manager_of_org(organization_id, auth.uid()));

CREATE POLICY "Users can view their organization's purchases" ON "public"."purchases"
    FOR SELECT USING (public.user_is_member_of_org(organization_id, auth.uid()));

-- 6. RLS Policies for attachments
ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Managers can manage attachments" ON "public"."attachments"
    FOR ALL USING (public.user_is_admin_or_manager_of_org(organization_id, auth.uid()));

CREATE POLICY "Users can view their organization's attachments" ON "public"."attachments"
    FOR SELECT USING (public.user_is_member_of_org(organization_id, auth.uid()));

-- 7. RLS Policies for entity_attachments
ALTER TABLE "public"."entity_attachments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Managers can manage entity attachments" ON "public"."entity_attachments"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.attachments a
            WHERE a.id = entity_attachments.attachment_id
            AND public.user_is_admin_or_manager_of_org(a.organization_id, auth.uid())
        )
    );

CREATE POLICY "Users can view entity attachments" ON "public"."entity_attachments"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.attachments a
            WHERE a.id = entity_attachments.attachment_id
            AND public.user_is_member_of_org(a.organization_id, auth.uid())
        )
    );

-- 8. Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage (Bucket: attachments)
-- Simplified policies for now
CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attachments');

CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'attachments' AND owner = auth.uid());

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'attachments' AND owner = auth.uid());

-- 9. Trigger for updated_at on purchases
CREATE TRIGGER "update_purchases_updated_at"
    BEFORE UPDATE ON "public"."purchases"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();

-- 10. Grants
GRANT ALL ON TABLE "public"."purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."purchases" TO "service_role";
GRANT ALL ON TABLE "public"."attachments" TO "service_role";
GRANT ALL ON TABLE "public"."entity_attachments" TO "service_role";
