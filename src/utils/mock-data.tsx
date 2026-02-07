import type {
  User,
  OrganizationMembership,
  Organization,
  Gig,
  GigStatus,
} from "./supabase/types";

// Mock user data for demo/testing
export const MOCK_USER: User = {
  id: "1",
  email: "cameron.orourke+john@gmail.com",
  first_name: "John",
  last_name: "Doe",
  avatar_url:
    "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
};

// Mock organizations for venue/act selection
export const MOCK_VENUES: Organization[] = [
  {
    id: "v1",
    name: "Central Park Amphitheater",
    type: "Venue",
    city: "Los Angeles",
    state: "CA",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "v2",
    name: "Grand Ballroom Hotel",
    type: "Venue",
    city: "New York",
    state: "NY",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "v3",
    name: "Lakeside Garden Venue",
    type: "Venue",
    city: "Chicago",
    state: "IL",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "v4",
    name: "The Blue Note Jazz Club",
    type: "Venue",
    city: "New York",
    state: "NY",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "v5",
    name: "Metropolitan Center",
    type: "Venue",
    city: "Chicago",
    state: "IL",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "v6",
    name: "Red Rocks Amphitheatre",
    type: "Venue",
    city: "Morrison",
    state: "CO",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "v7",
    name: "Radio City Music Hall",
    type: "Venue",
    city: "New York",
    state: "NY",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "v8",
    name: "The Greek Theatre",
    type: "Venue",
    city: "Los Angeles",
    state: "CA",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "v9",
    name: "The Fillmore",
    type: "Venue",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "v10",
    name: "House of Blues",
    type: "Venue",
    city: "Boston",
    state: "MA",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
];

export const MOCK_ACTS: Organization[] = [
  {
    id: "a1",
    name: "The Midnight Riders",
    type: "Act",
    city: "Nashville",
    state: "TN",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "a2",
    name: "Sarah Johnson Quartet",
    type: "Act",
    city: "New York",
    state: "NY",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "a3",
    name: "Electric Dreams Band",
    type: "Act",
    city: "Los Angeles",
    state: "CA",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "a4",
    name: "Jazz Collective",
    type: "Act",
    city: "Chicago",
    state: "IL",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "a5",
    name: "The Acoustic Sessions",
    type: "Act",
    city: "Austin",
    state: "TX",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "a6",
    name: "Symphony Orchestra",
    type: "Act",
    city: "Boston",
    state: "MA",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "a7",
    name: "Rock Revolution",
    type: "Act",
    city: "Seattle",
    state: "WA",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "a8",
    name: "Country Roads Trio",
    type: "Act",
    city: "Nashville",
    state: "TN",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "a9",
    name: "The Blues Brothers Tribute",
    type: "Act",
    city: "Chicago",
    state: "IL",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "a10",
    name: "Classical Ensemble",
    type: "Act",
    city: "Philadelphia",
    state: "PA",
    country: "USA",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
];

export const MOCK_ORGANIZATIONS: OrganizationMembership[] = [
  {
    organization: {
      id: "1",
      name: "Soundwave Productions",
      type: "Production",
      url: "https://soundwaveprod.com",
      city: "Los Angeles",
      state: "CA",
      country: "USA",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
    },
    role: "Admin",
  },
  {
    organization: {
      id: "2",
      name: "Lumina Lighting Co.",
      type: "Lighting",
      url: "https://luminalighting.com",
      city: "Nashville",
      state: "TN",
      country: "USA",
      created_at: "2024-02-20T10:00:00Z",
      updated_at: "2024-02-20T10:00:00Z",
    },
    role: "Manager",
  },
  {
    organization: {
      id: "3",
      name: "The Roxy Theater",
      type: "Venue",
      address_line1: "9009 Sunset Blvd",
      city: "West Hollywood",
      state: "CA",
      postal_code: "90069",
      country: "USA",
      created_at: "2024-03-10T10:00:00Z",
      updated_at: "2024-03-10T10:00:00Z",
    },
    role: "Staff",
  },
];

// Mock gigs data - updated to match new schema with start/end DateTime
export const MOCK_GIGS_DATA: Gig[] = [
  {
    id: "1",
    title: "Summer Music Festival 2025",
    start: "2025-07-15T14:00:00",
    end: "2025-07-15T23:00:00",
    timezone: "America/Los_Angeles",
    status: "Booked",
    tags: ["Festival", "Outdoor", "Multi-Day"],
    financials: [
      {
        id: "f1",
        gig_id: "1",
        organization_id: "1",
        amount: 25000,
        type: "Payment Received",
        category: "Production",
        date: "2025-01-15",
        currency: "USD",
        created_by: "1",
        created_at: "2025-01-15T10:00:00Z"
      }
    ],
    venue: MOCK_VENUES[0],
    act: MOCK_ACTS[0],
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2025-01-15T10:00:00Z",
    created_by: "1",
    updated_by: "1",
    hierarchy_depth: 0
  },
  {
    id: "2",
    title: "Corporate Holiday Gala",
    start: "2025-12-18T18:00:00",
    end: "2025-12-18T22:00:00",
    timezone: "America/New_York",
    status: "Proposed",
    tags: ["Corporate Event", "Holiday"],
    venue: MOCK_VENUES[1],
    created_at: "2025-01-20T14:30:00Z",
    updated_at: "2025-01-20T14:30:00Z",
    created_by: "1",
    updated_by: "1",
    hierarchy_depth: 0
  },
  {
    id: "3",
    title: "Spring Wedding Reception",
    start: "2025-05-10T17:00:00",
    end: "2025-05-11T01:00:00", // Crosses midnight
    timezone: "America/Chicago",
    status: "Booked",
    tags: ["Wedding", "Private Event"],
    financials: [
      {
        id: "f3",
        gig_id: "3",
        organization_id: "1",
        amount: 8500,
        type: "Payment Received",
        category: "Production",
        date: "2025-02-01",
        currency: "USD",
        created_by: "1",
        created_at: "2025-02-01T09:15:00Z"
      }
    ],
    venue: MOCK_VENUES[2],
    created_at: "2025-02-01T09:15:00Z",
    updated_at: "2025-02-01T09:15:00Z",
    created_by: "1",
    updated_by: "1",
    hierarchy_depth: 0
  },
  {
    id: "4",
    title: "Tech Conference 2025",
    start: "2025-11-05T08:00:00",
    end: "2025-11-05T18:00:00",
    timezone: "America/Los_Angeles",
    status: "DateHold",
    tags: ["Conference", "Corporate Event"],
    created_at: "2025-01-25T16:00:00Z",
    updated_at: "2025-01-25T16:00:00Z",
    created_by: "1",
    updated_by: "1",
    hierarchy_depth: 0
  },
  {
    id: "5",
    title: "Jazz Night at The Blue Note",
    start: "2025-03-22T20:00:00",
    end: "2025-03-22T23:30:00",
    timezone: "America/New_York",
    status: "Completed",
    tags: ["Concert", "Jazz"],
    financials: [
      {
        id: "f5",
        gig_id: "5",
        organization_id: "1",
        amount: 3500,
        type: "Payment Received",
        category: "Production",
        date: "2025-01-10",
        currency: "USD",
        created_by: "1",
        created_at: "2025-01-10T11:00:00Z"
      }
    ],
    venue: MOCK_VENUES[3],
    act: MOCK_ACTS[1],
    created_at: "2025-01-10T11:00:00Z",
    updated_at: "2025-03-23T10:00:00Z",
    created_by: "1",
    updated_by: "1",
    hierarchy_depth: 0
  },
  {
    id: "6",
    title: "Charity Fundraiser Gala",
    start: "2025-10-15T18:30:00",
    end: "2025-10-15T23:00:00",
    timezone: "America/Chicago",
    status: "Settled",
    tags: ["Charity", "Gala", "Formal"],
    financials: [
      {
        id: "f6",
        gig_id: "6",
        organization_id: "1",
        amount: 15000,
        type: "Payment Received",
        category: "Production",
        date: "2025-08-01",
        currency: "USD",
        created_by: "1",
        created_at: "2025-08-01T13:00:00Z"
      }
    ],
    venue: MOCK_VENUES[4],
    created_at: "2025-08-01T13:00:00Z",
    updated_at: "2025-10-16T09:00:00Z",
    created_by: "1",
    updated_by: "1",
    hierarchy_depth: 0
  },
  {
    id: "7",
    title: "Rock Concert at Red Rocks",
    start: "2025-08-20T19:30:00",
    end: "2025-08-20T22:30:00",
    timezone: "America/Denver",
    status: "Proposed",
    tags: ["Concert", "Rock", "Outdoor"],
    venue: MOCK_VENUES[5],
    act: MOCK_ACTS[6],
    created_at: "2025-01-30T10:00:00Z",
    updated_at: "2025-01-30T10:00:00Z",
    created_by: "1",
    updated_by: "1",
    hierarchy_depth: 0
  },
  {
    id: "8",
    title: "Holiday Spectacular",
    start: "2025-12-24T20:00:00",
    end: "2025-12-24T22:00:00",
    timezone: "America/New_York",
    status: "DateHold",
    tags: ["Holiday", "Concert"],
    venue: MOCK_VENUES[6],
    act: MOCK_ACTS[5],
    created_at: "2025-02-15T09:00:00Z",
    updated_at: "2025-02-15T09:00:00Z",
    created_by: "1",
    updated_by: "1",
    hierarchy_depth: 0
  },
];

// Mock Google Places data
export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  editorial_summary?: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export const MOCK_PLACES: GooglePlace[] = [
  {
    place_id: '1',
    name: 'Soundwave Productions LLC',
    formatted_address: '1234 Music Ave, Los Angeles, CA 90028, USA',
    formatted_phone_number: '+1 (323) 555-0123',
    website: 'https://soundwaveprod.com',
    editorial_summary: 'Full-service production company specializing in live events, concerts, and corporate productions. Award-winning team with over 20 years of experience.',
    address_components: [
      { long_name: '1234', short_name: '1234', types: ['street_number'] },
      { long_name: 'Music Avenue', short_name: 'Music Ave', types: ['route'] },
      { long_name: 'Los Angeles', short_name: 'LA', types: ['locality'] },
      { long_name: 'California', short_name: 'CA', types: ['administrative_area_level_1'] },
      { long_name: '90028', short_name: '90028', types: ['postal_code'] },
      { long_name: 'United States', short_name: 'US', types: ['country'] },
    ]
  },
  {
    place_id: '2',
    name: 'The Roxy Theatre',
    formatted_address: '9009 Sunset Blvd, West Hollywood, CA 90069, USA',
    formatted_phone_number: '+1 (310) 555-0199',
    website: 'https://theroxy.com',
    editorial_summary: 'Historic music venue on the Sunset Strip. Intimate 500-capacity room featuring live music and performances since 1973.',
    address_components: [
      { long_name: '9009', short_name: '9009', types: ['street_number'] },
      { long_name: 'Sunset Boulevard', short_name: 'Sunset Blvd', types: ['route'] },
      { long_name: 'West Hollywood', short_name: 'West Hollywood', types: ['locality'] },
      { long_name: 'California', short_name: 'CA', types: ['administrative_area_level_1'] },
      { long_name: '90069', short_name: '90069', types: ['postal_code'] },
      { long_name: 'United States', short_name: 'US', types: ['country'] },
    ]
  },
  {
    place_id: '3',
    name: 'Lumina Lighting Solutions',
    formatted_address: '567 Broadway, Nashville, TN 37203, USA',
    formatted_phone_number: '+1 (615) 555-0187',
    website: 'https://luminalighting.com',
    editorial_summary: 'Professional lighting and sound equipment rental company. Serving concerts, theaters, and corporate events throughout the Southeast.',
    address_components: [
      { long_name: '567', short_name: '567', types: ['street_number'] },
      { long_name: 'Broadway', short_name: 'Broadway', types: ['route'] },
      { long_name: 'Nashville', short_name: 'Nashville', types: ['locality'] },
      { long_name: 'Tennessee', short_name: 'TN', types: ['administrative_area_level_1'] },
      { long_name: '37203', short_name: '37203', types: ['postal_code'] },
      { long_name: 'United States', short_name: 'US', types: ['country'] },
    ]
  },
];

// Common tags
export const COMMON_TAGS = [
  "Wedding",
  "Concert",
  "Corporate Event",
  "Festival",
  "Conference",
  "Private Event",
  "Charity",
  "Gala",
  "Holiday",
  "Outdoor",
  "Multi-Day",
  "Jazz",
  "Rock",
  "Classical",
  "VIP",
];