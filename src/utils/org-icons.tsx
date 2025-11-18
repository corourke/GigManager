import {
  Building2,
  Music,
  Lightbulb,
  Warehouse,
  MapPin,
  Volume2,
} from 'lucide-react';
import type { OrganizationType } from '../App';

export const ORG_TYPE_CONFIG: Record<OrganizationType, { label: string; icon: typeof Building2; color: string }> = {
  Production: { label: 'Production Company', icon: Building2, color: 'bg-purple-100 text-purple-700' },
  Sound: { label: 'Sound Company', icon: Volume2, color: 'bg-blue-100 text-blue-700' },
  Lighting: { label: 'Lighting Company', icon: Lightbulb, color: 'bg-yellow-100 text-yellow-700' },
  Staging: { label: 'Staging Company', icon: Warehouse, color: 'bg-indigo-100 text-indigo-700' },
  Rentals: { label: 'Rental Company', icon: Warehouse, color: 'bg-orange-100 text-orange-700' },
  Venue: { label: 'Venue', icon: MapPin, color: 'bg-green-100 text-green-700' },
  Act: { label: 'Act', icon: Music, color: 'bg-red-100 text-red-700' },
  Agency: { label: 'Agency', icon: Building2, color: 'bg-indigo-100 text-indigo-700' }
};

export function getOrgTypeIcon(type: OrganizationType) {
  return ORG_TYPE_CONFIG[type].icon;
}

export function getOrgTypeColor(type: OrganizationType) {
  return ORG_TYPE_CONFIG[type].color;
}

export function getOrgTypeLabel(type: OrganizationType) {
  return ORG_TYPE_CONFIG[type].label;
}