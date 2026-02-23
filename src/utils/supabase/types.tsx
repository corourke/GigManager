import { OrganizationType, UserRole, GigStatus, FinType, FinCategory } from './constants';

// Re-export constants types for convenience
export type { OrganizationType, UserRole, GigStatus, FinType, FinCategory };

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

export type DbGigBid = DbGigFinancial; // For backward compatibility if needed, though we should update callers

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

export interface DbKvStore {
  key: string;
  value: any;
}

export interface DbAsset {
  id: string;
  organization_id: string;
  acquisition_date: string; // Date
  vendor?: string;
  cost?: number;
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
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
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

// Joined query types
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
