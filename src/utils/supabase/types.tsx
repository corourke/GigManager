import { OrganizationRole, UserRole, GigStatus, FinType, FinCategory, AssetStatus, PurchaseRowType, EntityType } from './constants';
import type { Database } from './database.types';

// Re-export constants types for convenience
export type { OrganizationRole, UserRole, GigStatus, FinType, FinCategory, AssetStatus, PurchaseRowType, EntityType };

// Database types for Supabase tables

type Tables = Database['public']['Tables'];

// Database row types — aliased to the generated schema types so they cannot
// drift from the live database (see ./database.types.ts)
export type DbUser = Tables['users']['Row'] & {
  // Enriched from auth by the server edge function; not a users column
  last_sign_in_at?: string | null;
};

// Aliases for core entities
export type User = DbUser;

export type DbOrganization = Tables['organizations']['Row'];

export type Organization = DbOrganization;

export type DbOrganizationMember = Tables['organization_members']['Row'];

export type DbGig = Tables['gigs']['Row'];

export type DbStaffRole = Tables['staff_roles']['Row'];

export type DbGigStatusHistory = Tables['gig_status_history']['Row'];

export type DbGigParticipant = Tables['gig_participants']['Row'];

export type DbGigStaffSlot = Tables['gig_staff_slots']['Row'];

export type DbGigStaffAssignment = Tables['gig_staff_assignments']['Row'];

export type DbGigFinancial = Tables['gig_financials']['Row'];

export type DbInvitation = Tables['invitations']['Row'];

export type Invitation = DbInvitation;

export type DbAsset = Tables['assets']['Row'];

export type DbPurchase = Tables['purchases']['Row'];

export type DbAttachment = Tables['attachments']['Row'];

export type DbEntityAttachment = Tables['entity_attachments']['Row'];

export type DbAssetStatusHistory = Tables['asset_status_history']['Row'] & {
  // Enriched via join in asset.service (users relation)
  changed_by_user?: Partial<DbUser> | null;
};

export type DbInventoryTracking = Tables['inventory_tracking']['Row'] & {
  // Enriched via joins in inventoryTracking.service
  gig?: Partial<DbGig> | null;
  kit?: Partial<DbKit> | null;
  scanned_by_user?: Partial<DbUser> | null;
};

export type DbKit = Tables['kits']['Row'];

export type DbKitAsset = Tables['kit_assets']['Row'];

export type DbGigKitAssignment = Tables['gig_kit_assignments']['Row'];

export type Asset = DbAsset;
export type Purchase = DbPurchase;
export type Attachment = DbAttachment;
export type EntityAttachment = DbEntityAttachment;
export type Kit = DbKit;

// Joined query types
export interface PurchaseWithItems extends DbPurchase {
  items?: DbPurchase[];
  assets?: DbAsset[];
  attachments?: (DbAttachment & { entity_attachment_id: string })[];
}

export interface AssetWithAttachments extends DbAsset {
  attachments?: (DbAttachment & { entity_attachment_id: string })[];
}

// Staff slot as returned by getGig (joined + post-processed)
export interface GigStaffSlotView extends Partial<DbGigStaffSlot> {
  id?: string;
  role?: string;
  count?: number;
  role_info?: { name: string } | null;
  assignments?: (Partial<DbGigStaffAssignment> & { user?: Partial<DbUser> | null })[];
  staff_assignments?: (Partial<DbGigStaffAssignment> & { user?: Partial<DbUser> | null })[];
}

export interface Gig extends Partial<DbGig> {
  id: string;
  title: string;
  status: GigStatus;
  start: string;
  end: string;
  timezone: string;
  tags: string[];
  venue?: Partial<Organization>;
  act?: Partial<Organization>;
  participants?: (DbGigParticipant & { organization?: Partial<Organization> })[];
  financials?: DbGigFinancial[];
  staff_slots?: GigStaffSlotView[];
}

export interface GigWithParticipants extends DbGig {
  participants?: (DbGigParticipant & { organization?: DbOrganization })[];
}

// Shape returned by get_user_organizations_secure / get_complete_user_data
// RPCs (note: joined_at is aliased from organization_members.created_at)
export interface OrganizationMembershipWithOrg {
  user_id: string;
  organization_id: string;
  role: UserRole;
  joined_at: string;
  organization: DbOrganization;
}

export interface OrganizationMembership {
  organization: Organization;
  role: UserRole;
}

export interface OrganizationMemberWithUser extends DbOrganizationMember {
  user: User;
}

export interface InvitationWithInviter extends Invitation {
  invited_by_user: {
    first_name: string;
    last_name: string;
  };
}

// Google Calendar Integration Types — aliased to generated schema types
export type DbUserGoogleCalendarSettings = Tables['user_google_calendar_settings']['Row'];

export type DbGigSyncStatus = Tables['gig_sync_status']['Row'];

export type UserGoogleCalendarSettings = DbUserGoogleCalendarSettings;
export type GigSyncStatus = DbGigSyncStatus;

export type PaymentHealth = 'all-clear' | 'revenue-outstanding' | 'payments-due' | 'both';

export interface GigAccountingSummary {
  gigId: string;
  gigTitle: string;
  gigStatus: GigStatus;
  gigStart: string;
  gigEnd: string;

  contractAmount: number;
  received: number;
  outstandingRevenue: number;

  actualCosts: number;
  expectedStaffCosts: number;
  expectedSubContractCosts: number;
  totalCosts: number;

  paymentsToMake: number;

  profit: number;
  margin: number;

  paymentHealth: PaymentHealth;
}

// The Supabase client's Database type is generated from the live schema —
// see ./database.types.ts (`supabase gen types typescript --linked`).
