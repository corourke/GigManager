import { OrganizationType, UserRole, GigStatus, FinType, FinCategory, AssetStatus, PurchaseRowType, EntityType } from './constants';

// Re-export constants types for convenience
export type { OrganizationType, UserRole, GigStatus, FinType, FinCategory, AssetStatus, PurchaseRowType, EntityType };

// Database types for Supabase tables

// Database row types
export interface DbUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  role_hint?: string;
  timezone?: string;
  user_status: 'active' | 'inactive' | 'pending';
  last_sign_in_at?: string;
  created_at: string;
  updated_at: string;
}

// Aliases for core entities
export type User = DbUser;

export interface DbOrganization {
  id: string;
  name: string;
  type: OrganizationType;
  url?: string;
  phone_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  description?: string;
  allowed_domains?: string;
  created_at: string;
  updated_at: string;
}

export type Organization = DbOrganization;

export interface DbOrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  default_staff_role_id?: string;
  created_at: string;
}

export interface DbGig {
  id: string;
  parent_gig_id?: string;
  hierarchy_depth: number;
  title: string;
  status: GigStatus;
  tags: string[];
  start: string; // ISO DateTime
  end: string; // ISO DateTime
  timezone: string;
  notes?: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbStaffRole {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DbGigStatusHistory {
  id: string;
  gig_id: string;
  from_status?: GigStatus;
  to_status: GigStatus;
  changed_by: string;
  changed_at: string;
}

export interface DbGigParticipant {
  id: string;
  gig_id: string;
  organization_id: string;
  role: OrganizationType;
  notes?: string;
}

export interface DbGigStaffSlot {
  id: string;
  organization_id: string;
  gig_id: string;
  staff_role_id: string;
  required_count: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DbGigStaffAssignment {
  id: string;
  slot_id: string;
  user_id: string;
  status: string;
  rate?: number;
  fee?: number;
  notes?: string;
  assigned_at: string;
  confirmed_at?: string;
}

export interface DbGigFinancial {
  id: string;
  gig_id: string;
  organization_id: string;
  date: string; // Date
  type: FinType;
  category: FinCategory;
  reference_number?: string;
  counterparty_id?: string;
  external_entity_name?: string;
  amount: number;
  currency: string;
  description?: string;
  notes?: string;
  due_date?: string;
  paid_at?: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface DbInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string;
  expires_at: string;
  accepted_at?: string;
  accepted_by?: string;
  created_at: string;
  updated_at: string;
}

export type Invitation = DbInvitation;

export interface DbAsset {
  id: string;
  organization_id: string;
  purchase_id?: string;
  acquisition_date: string; // Date
  vendor?: string;
  item_price?: number;
  item_cost?: number;
  category: string;
  sub_category?: string;
  insurance_policy_added: boolean;
  insurance_class?: string;
  manufacturer_model: string;
  type?: string;
  serial_number?: string;
  description?: string;
  replacement_value?: number;
  quantity?: number;
  tag_number?: string;
  status: AssetStatus;
  retired_on?: string; // Date
  service_life?: number;
  dep_method?: string;
  liquidation_amt?: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbPurchase {
  id: string;
  organization_id: string;
  gig_id?: string;
  parent_id?: string;
  asset_id?: string;
  row_type: PurchaseRowType;
  purchase_date: string; // Date
  vendor?: string;
  total_inv_amount?: number;
  payment_method?: string;
  line_amount?: number;
  line_cost?: number;
  quantity?: number;
  item_price?: number;
  item_cost?: number;
  description?: string;
  category?: string;
  sub_category?: string;
  created_at: string;
  updated_at: string;
}

export interface DbAttachment {
  id: string;
  organization_id: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

export interface DbEntityAttachment {
  id: string;
  attachment_id: string;
  entity_type: EntityType;
  entity_id: string;
  created_at: string;
}

export interface DbAssetStatusHistory {
  id: string;
  asset_id: string;
  from_status?: string;
  to_status: string;
  changed_by: string;
  changed_at: string;
  changed_by_user?: { first_name: string; last_name: string } | null;
}

export interface DbInventoryTracking {
  id: string;
  organization_id: string;
  gig_id: string;
  kit_id?: string | null;
  asset_id?: string | null;
  status: string;
  scanned_at: string;
  scanned_by: string;
  notes?: string | null;
  created_at: string;
  scanned_by_user?: { first_name: string; last_name: string } | null;
  gig?: { title: string } | null;
  kit?: { name: string } | null;
}

export interface DbKit {
  id: string;
  organization_id: string;
  name: string;
  category?: string;
  description?: string;
  tags: string[];
  tag_number?: string;
  rental_value?: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbKitAsset {
  id: string;
  kit_id: string;
  asset_id: string;
  quantity: number;
  notes?: string;
  created_at: string;
}

export interface DbGigKitAssignment {
  id: string;
  organization_id: string;
  gig_id: string;
  kit_id: string;
  notes?: string;
  assigned_by: string;
  assigned_at: string;
}

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
}

export interface GigWithParticipants extends DbGig {
  participants?: (DbGigParticipant & { organization?: DbOrganization })[];
}

export interface OrganizationMembershipWithOrg extends DbOrganizationMember {
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

// Google Calendar Integration Types
export interface DbUserGoogleCalendarSettings {
  id: string;
  user_id: string;
  calendar_id: string;
  calendar_name?: string;
  access_token: string; // Encrypted
  refresh_token: string; // Encrypted
  token_expires_at: string;
  is_enabled: boolean;
  sync_filters: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DbGigSyncStatus {
  id: string;
  gig_id: string;
  user_id: string;
  google_event_id?: string;
  last_synced_at?: string;
  sync_status: 'pending' | 'synced' | 'updated' | 'removed' | 'failed';
  sync_error?: string;
  created_at: string;
  updated_at: string;
}

export type UserGoogleCalendarSettings = DbUserGoogleCalendarSettings;
export type GigSyncStatus = DbGigSyncStatus;

export interface Database {
  public: {
    Tables: {
      users: {
        Row: DbUser;
        Insert: Omit<DbUser, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbUser, 'id' | 'created_at' | 'updated_at'>>;
      };
      organizations: {
        Row: DbOrganization;
        Insert: Omit<DbOrganization, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbOrganization, 'id' | 'created_at' | 'updated_at'>>;
      };
      organization_members: {
        Row: DbOrganizationMember;
        Insert: Omit<DbOrganizationMember, 'id' | 'created_at'>;
        Update: Partial<Omit<DbOrganizationMember, 'id' | 'created_at'>>;
      };
      gigs: {
        Row: DbGig;
        Insert: Omit<DbGig, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbGig, 'id' | 'created_at' | 'updated_at'>>;
      };
      staff_roles: {
        Row: DbStaffRole;
        Insert: Omit<DbStaffRole, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbStaffRole, 'id' | 'created_at' | 'updated_at'>>;
      };
      gig_status_history: {
        Row: DbGigStatusHistory;
        Insert: Omit<DbGigStatusHistory, 'id' | 'changed_at'>;
        Update: Partial<Omit<DbGigStatusHistory, 'id' | 'changed_at'>>;
      };
      gig_participants: {
        Row: DbGigParticipant;
        Insert: Omit<DbGigParticipant, 'id'>;
        Update: Partial<Omit<DbGigParticipant, 'id'>>;
      };
      gig_staff_slots: {
        Row: DbGigStaffSlot;
        Insert: Omit<DbGigStaffSlot, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbGigStaffSlot, 'id' | 'created_at' | 'updated_at'>>;
      };
      gig_staff_assignments: {
        Row: DbGigStaffAssignment;
        Insert: Omit<DbGigStaffAssignment, 'id' | 'assigned_at'>;
        Update: Partial<Omit<DbGigStaffAssignment, 'id' | 'assigned_at'>>;
      };
      gig_financials: {
        Row: DbGigFinancial;
        Insert: Omit<DbGigFinancial, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbGigFinancial, 'id' | 'created_at' | 'updated_at'>>;
      };
      invitations: {
        Row: DbInvitation;
        Insert: Omit<DbInvitation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbInvitation, 'id' | 'created_at' | 'updated_at'>>;
      };
      assets: {
        Row: DbAsset;
        Insert: Omit<DbAsset, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbAsset, 'id' | 'created_at' | 'updated_at'>>;
      };
      purchases: {
        Row: DbPurchase;
        Insert: Omit<DbPurchase, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbPurchase, 'id' | 'created_at' | 'updated_at'>>;
      };
      attachments: {
        Row: DbAttachment;
        Insert: Omit<DbAttachment, 'id' | 'created_at'>;
        Update: Partial<Omit<DbAttachment, 'id' | 'created_at'>>;
      };
      entity_attachments: {
        Row: DbEntityAttachment;
        Insert: Omit<DbEntityAttachment, 'id' | 'created_at'>;
        Update: Partial<Omit<DbEntityAttachment, 'id' | 'created_at'>>;
      };
      asset_status_history: {
        Row: DbAssetStatusHistory;
        Insert: Omit<DbAssetStatusHistory, 'id' | 'changed_at'>;
        Update: Partial<Omit<DbAssetStatusHistory, 'id' | 'changed_at'>>;
      };
      inventory_tracking: {
        Row: DbInventoryTracking;
        Insert: Omit<DbInventoryTracking, 'id' | 'created_at'>;
        Update: Partial<Omit<DbInventoryTracking, 'id' | 'created_at'>>;
      };
      kits: {
        Row: DbKit;
        Insert: Omit<DbKit, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbKit, 'id' | 'created_at' | 'updated_at'>>;
      };
      kit_assets: {
        Row: DbKitAsset;
        Insert: Omit<DbKitAsset, 'id' | 'created_at'>;
        Update: Partial<Omit<DbKitAsset, 'id' | 'created_at'>>;
      };
      gig_kit_assignments: {
        Row: DbGigKitAssignment;
        Insert: Omit<DbGigKitAssignment, 'id' | 'assigned_at'>;
        Update: Partial<Omit<DbGigKitAssignment, 'id' | 'assigned_at'>>;
      };
      user_google_calendar_settings: {
        Row: DbUserGoogleCalendarSettings;
        Insert: Omit<DbUserGoogleCalendarSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbUserGoogleCalendarSettings, 'id' | 'created_at' | 'updated_at'>>;
      };
      gig_sync_status: {
        Row: DbGigSyncStatus;
        Insert: Omit<DbGigSyncStatus, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbGigSyncStatus, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
