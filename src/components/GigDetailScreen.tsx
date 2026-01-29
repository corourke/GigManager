import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import AppHeader from './AppHeader';
import { ChevronLeft, Calendar, Clock, MapPin, User as UserIcon, Tag } from 'lucide-react';
import { Organization, User, UserRole } from '../utils/supabase/types';
import { GIG_STATUS_CONFIG } from '../utils/supabase/constants';
import type { Gig } from './GigListScreen';

interface GigDetailScreenProps {
  gigId: string;
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onBack: () => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
}

// Mock gig data (in a real app, would fetch by ID)
const MOCK_GIG: Gig = {
  id: '1',
  title: 'Summer Music Festival 2025',
  date: '2025-07-15',
  start_time: '14:00',
  end_time: '23:00',
  timezone: 'America/Los_Angeles',
  status: 'Booked',
  tags: ['Festival', 'Outdoor', 'Multi-Day'],
  notes: '# Event Details\n\nThis is a major summer festival with multiple stages.\n\n## Requirements\n- Full sound system\n- Lighting for 3 stages\n- Crew of 20+\n\n## Notes\n- Setup starts 2 days prior\n- Strike happens next day',
  amount_paid: 25000,
  venue: {
    id: 'v1',
    name: 'Central Park Amphitheater',
    type: 'Venue',
    city: 'Los Angeles',
    state: 'CA',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  act: {
    id: 'a1',
    name: 'The Midnight Riders',
    type: 'Act',
    city: 'Nashville',
    state: 'TN',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
};

export default function GigDetailScreen({
  gigId,
  organization,
  user,
  userRole,
  onBack,
  onSwitchOrganization,
  onLogout,
}: GigDetailScreenProps) {
  const gig = MOCK_GIG; // In real app: fetch gig by gigId

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="gig-detail"
        onSwitchOrganization={onSwitchOrganization}
        onLogout={onLogout}
      />

      {/* Page Title Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back to Gigs
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Edit</Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700">
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Title and Status */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-gray-900">{gig.title}</h1>
              <Badge variant="outline" className={GIG_STATUS_CONFIG[gig.status].color}>
                {GIG_STATUS_CONFIG[gig.status].label}
              </Badge>
            </div>
            <p className="text-gray-600">{organization.name}</p>
          </div>

          {/* Basic Info Card */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="text-gray-900">{new Date(gig.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Time</p>
                  <p className="text-gray-900">{gig.start_time} - {gig.end_time}</p>
                  <p className="text-sm text-gray-500">{gig.timezone}</p>
                </div>
              </div>

              {gig.venue && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Venue</p>
                    <p className="text-gray-900">{gig.venue.name}</p>
                    {(gig.venue.city || gig.venue.state) && (
                      <p className="text-sm text-gray-500">
                        {[gig.venue.city, gig.venue.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {gig.act && (
                <div className="flex items-start gap-3">
                  <UserIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Act</p>
                    <p className="text-gray-900">{gig.act.name}</p>
                    {(gig.act.city || gig.act.state) && (
                      <p className="text-sm text-gray-500">
                        {[gig.act.city, gig.act.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Tags */}
          {gig.tags.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5 text-gray-400" />
                <h3 className="text-gray-900">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {gig.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-sky-100 text-sky-700">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Financial Info */}
          {gig.amount_paid && (
            <Card className="p-6">
              <h3 className="text-gray-900 mb-4">Financial Information</h3>
              <div>
                <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
                <p className="text-gray-900">
                  ${gig.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </Card>
          )}

          {/* Notes */}
          {gig.notes && (
            <Card className="p-6">
              <h3 className="text-gray-900 mb-4">Notes</h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{gig.notes}</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}