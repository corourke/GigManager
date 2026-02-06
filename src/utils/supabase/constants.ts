import {
  Building2,
  Music,
  Lightbulb,
  Warehouse,
  MapPin,
  Volume2,
  Crown,
  Shield,
  User as UserIcon,
  Clock,
} from 'lucide-react';

export const ORG_TYPE_CONFIG = {
  Production: { label: 'Production Company', icon: Building2, color: 'bg-purple-100 text-purple-700' },
  Sound: { label: 'Sound Company', icon: Volume2, color: 'bg-blue-100 text-blue-700' },
  Lighting: { label: 'Lighting Company', icon: Lightbulb, color: 'bg-yellow-100 text-yellow-700' },
  Staging: { label: 'Staging Company', icon: Warehouse, color: 'bg-indigo-100 text-indigo-700' },
  Rentals: { label: 'Rental Company', icon: Warehouse, color: 'bg-orange-100 text-orange-700' },
  Venue: { label: 'Venue', icon: MapPin, color: 'bg-green-100 text-green-700' },
  Act: { label: 'Act', icon: Music, color: 'bg-red-100 text-red-700' },
  Agency: { label: 'Agency', icon: Building2, color: 'bg-indigo-100 text-indigo-700' },
} as const;

export type OrganizationType = keyof typeof ORG_TYPE_CONFIG;

export const USER_ROLE_CONFIG = {
  Admin: { label: 'Admin', icon: Crown, color: 'bg-purple-100 text-purple-700' },
  Manager: { label: 'Manager', icon: Shield, color: 'bg-blue-100 text-blue-700' },
  Staff: { label: 'Staff', icon: UserIcon, color: 'bg-gray-100 text-gray-700' },
  Viewer: { label: 'Viewer', icon: Clock, color: 'bg-gray-50 text-gray-600' },
} as const;

export type UserRole = keyof typeof USER_ROLE_CONFIG;

export const GIG_STATUS_CONFIG = {
  DateHold: { label: 'Date Hold', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  Proposed: { label: 'Proposed', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  Booked: { label: 'Booked', color: 'bg-green-100 text-green-800 border-green-300' },
  Completed: { label: 'Completed', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  Cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-300' },
  Settled: { label: 'Settled', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
} as const;

export type GigStatus = keyof typeof GIG_STATUS_CONFIG;

export const FIN_TYPE_CONFIG = {
  'Bid Submitted': { label: 'Bid Submitted' },
  'Bid Accepted': { label: 'Bid Accepted' },
  'Bid Rejected': { label: 'Bid Rejected' },
  'Contract Submitted': { label: 'Contract Submitted' },
  'Contract Revised': { label: 'Contract Revised' },
  'Contract Signed': { label: 'Contract Signed' },
  'Contract Rejected': { label: 'Contract Rejected' },
  'Contract Cancelled': { label: 'Contract Cancelled' },
  'Contract Settled': { label: 'Contract Settled' },
  'Sub-Contract Submitted': { label: 'Sub-Contract Submitted' },
  'Sub-Contract Revised': { label: 'Sub-Contract Revised' },
  'Sub-Contract Signed': { label: 'Sub-Contract Signed' },
  'Sub-Contract Rejected': { label: 'Sub-Contract Rejected' },
  'Sub-Contract Cancelled': { label: 'Sub-Contract Cancelled' },
  'Sub-Contract Settled': { label: 'Sub-Contract Settled' },
  'Deposit Received': { label: 'Deposit Received' },
  'Deposit Sent': { label: 'Deposit Sent' },
  'Deposit Refunded': { label: 'Deposit Refunded' },
  'Payment Sent': { label: 'Payment Sent' },
  'Payment Recieved': { label: 'Payment Received' },
  'Expense Incurred': { label: 'Expense Incurred' },
  'Expense Reimbursed': { label: 'Expense Reimbursed' },
  'Invoice Issued': { label: 'Invoice Issued' },
  'Invoice Settled': { label: 'Invoice Settled' },
} as const;

export type FinType = keyof typeof FIN_TYPE_CONFIG;

export const FIN_CATEGORY_CONFIG = {
  'Labor': { label: 'Labor' },
  'Equipment': { label: 'Equipment' },
  'Transportation': { label: 'Transportation' },
  'Venue': { label: 'Venue' },
  'Production': { label: 'Production' },
  'Insurance': { label: 'Insurance' },
  'Rebillable': { label: 'Rebillable' },
  'Other': { label: 'Other' },
} as const;

export type FinCategory = keyof typeof FIN_CATEGORY_CONFIG;

export function getOrgTypeIcon(type: OrganizationType) {
  return ORG_TYPE_CONFIG[type].icon;
}

export function getOrgTypeColor(type: OrganizationType) {
  return ORG_TYPE_CONFIG[type].color;
}

export function getOrgTypeLabel(type: OrganizationType) {
  return ORG_TYPE_CONFIG[type].label;
}
