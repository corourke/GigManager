import { useState, useRef, useEffect } from 'react';
import { Building2, Search, Loader2, MapPin, Phone, Globe, Check, AlertCircle, X, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { Organization, OrganizationType } from '../App';
import { useFormWithChanges } from '../utils/hooks/useFormWithChanges';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import MarkdownEditor from './MarkdownEditor';

interface CreateOrganizationScreenProps {
  organization?: Organization; // If provided, we're in edit mode
  onOrganizationCreated: (org: Organization) => void;
  onOrganizationUpdated?: (org: Organization) => void;
  onCancel: () => void;
  userId?: string;
  useMockData?: boolean;
}

interface FormData {
  name: string;
  type: OrganizationType | '';
  url: string;
  phone_number: string;
  description: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  allowed_domains: string;
}

interface FormErrors {
  name?: string;
  type?: string;
  url?: string;
  phone?: string;
  general?: string;
}

interface GooglePlace {
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

const ORG_TYPES: { value: OrganizationType; label: string }[] = [
  { value: 'Production', label: 'Production Company' },
  { value: 'Sound', label: 'Sound Company' },
  { value: 'Lighting', label: 'Lighting Company' },
  { value: 'Staging', label: 'Staging Company' },
  { value: 'Rentals', label: 'Rental Company' },
  { value: 'Venue', label: 'Venue' },
  { value: 'Act', label: 'Act' },
  { value: 'Agency', label: 'Agency' },
];



// Mock Google Places data
const MOCK_PLACES: GooglePlace[] = [
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

export default function CreateOrganizationScreen({
  organization,
  onOrganizationCreated,
  onOrganizationUpdated,
  onCancel,
  userId,
  useMockData = false,
}: CreateOrganizationScreenProps) {
  const isEditMode = !!organization;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GooglePlace[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<GooglePlace | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(isEditMode); // Show form directly in edit mode

  const [formData, setFormData] = useState<FormData>({
    name: organization?.name || '',
    type: organization?.type || '',
    url: organization?.url || '',
    phone_number: organization?.phone_number || '',
    description: organization?.description || '',
    address_line1: organization?.address_line1 || '',
    address_line2: organization?.address_line2 || '',
    city: organization?.city || '',
    state: organization?.state || '',
    postal_code: organization?.postal_code || '',
    country: organization?.country || '',
    allowed_domains: organization?.allowed_domains || '',
  });

  // Change detection for efficient updates
  const changeDetection = useFormWithChanges({
    initialData: {
      name: organization?.name || '',
      type: organization?.type || '',
      url: organization?.url || '',
      phone_number: organization?.phone_number || '',
      description: organization?.description || '',
      address_line1: organization?.address_line1 || '',
      address_line2: organization?.address_line2 || '',
      city: organization?.city || '',
      state: organization?.state || '',
      postal_code: organization?.postal_code || '',
      country: organization?.country || '',
      allowed_domains: organization?.allowed_domains || '',
    },
    currentData: formData,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoJoin, setAutoJoin] = useState(true);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchPlaces = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setShowResults(true);

    // Use mock data if flag is set
    if (useMockData) {
      setTimeout(() => {
        const query = searchQuery.toLowerCase();
        const results = MOCK_PLACES.filter(place =>
          place.name.toLowerCase().includes(query)
        );
        setSearchResults(results);
        setIsSearching(false);
      }, 800);
      return;
    }

    // Real API call
    try {
      // Get current session
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Not authenticated. Please sign in again.');
        setIsSearching(false);
        setShowResults(false);
        return;
      }

      // Get user's location for proximity-based sorting
      let userLocation: { latitude: number; longitude: number } | null = null;
      
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false,
            });
          });
          userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        }
      } catch (geoError) {
        // Silently fail - search will still work without location
        console.log('Geolocation not available or denied:', geoError);
      }

      // Build search URL with optional location parameters
      let searchUrl = `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4/integrations/google-places/search?query=${encodeURIComponent(searchQuery)}`;
      if (userLocation) {
        searchUrl += `&latitude=${userLocation.latitude}&longitude=${userLocation.longitude}`;
      }

      // Search places
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!searchResponse.ok) {
        const errorData = await searchResponse.json();
        console.error('Places search error:', errorData);
        toast.error(errorData.error || 'Failed to search places');
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const { results: placeResults } = await searchResponse.json();

      if (!placeResults || placeResults.length === 0) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      // Fetch details for each place to get phone, website, etc.
      const detailedResults = await Promise.all(
        placeResults.map(async (place: any) => {
          try {
            const detailsResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4/integrations/google-places/${place.place_id}`,
              {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
              }
            );

            if (detailsResponse.ok) {
              return await detailsResponse.json();
            }
            // If details fetch fails, return basic info
            return place;
          } catch {
            return place;
          }
        })
      );

      setSearchResults(detailedResults);
      setIsSearching(false);
    } catch (error) {
      console.error('Error searching places:', error);
      toast.error('Failed to search places. Please try again.');
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const parseAddressComponents = (components: GooglePlace['address_components']) => {
    const address: {
      street_number?: string;
      route?: string;
      locality?: string;
      administrative_area_level_1?: string;
      postal_code?: string;
      country?: string;
    } = {};

    components.forEach(component => {
      if (component.types.includes('street_number')) {
        address.street_number = component.long_name;
      } else if (component.types.includes('route')) {
        address.route = component.long_name;
      } else if (component.types.includes('locality')) {
        address.locality = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        address.administrative_area_level_1 = component.short_name;
      } else if (component.types.includes('postal_code')) {
        address.postal_code = component.long_name;
      } else if (component.types.includes('country')) {
        address.country = component.long_name;
      }
    });

    return address;
  };

  const handleSelectPlace = (place: GooglePlace) => {
    setSelectedPlace(place);
    setShowResults(false);
    setSearchQuery('');

    const addressParts = parseAddressComponents(place.address_components);
    const streetAddress = [addressParts.street_number, addressParts.route]
      .filter(Boolean)
      .join(' ');

    // Auto-fill form with place data
    setFormData({
      ...formData,
      name: place.name,
      url: place.website || '',
      phone_number: place.formatted_phone_number || '',
      description: place.editorial_summary || '',
      address_line1: streetAddress,
      city: addressParts.locality || '',
      state: addressParts.administrative_area_level_1 || '',
      postal_code: addressParts.postal_code || '',
      country: addressParts.country || '',
    });

    toast.success('Business information loaded from Google Places');
  };

  const handleClearSelection = () => {
    setSelectedPlace(null);
    setFormData({
      name: '',
      type: '',
      url: '',
      phone_number: '',
      description: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      allowed_domains: '',
    });
  };

  const handleManualEntry = () => {
    setShowManualEntry(true);
    setShowResults(false);
    setSearchQuery('');
    toast.info('Fill in the form manually');
  };

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required: Organization name
    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Organization name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Organization name must be less than 100 characters';
    }

    // Required: Organization type
    if (!formData.type) {
      newErrors.type = 'Organization type is required';
    }

    // Optional: URL validation
    if (formData.url.trim()) {
      const urlPattern = /^https?:\/\/.+\..+/;
      if (!urlPattern.test(formData.url.trim())) {
        newErrors.url = 'Please enter a valid URL (e.g., https://example.com)';
      }
    }

    // Optional: Phone validation
    if (formData.phone_number.trim()) {
      const phonePattern = /^[\d\s\-\+\(\)]+$/;
      if (!phonePattern.test(formData.phone_number.trim())) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, autoJoinOrg: boolean = true) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    // Mock data mode
    if (useMockData) {
      setTimeout(() => {
        const newOrganization: Organization = {
          id: organization?.id || Math.random().toString(36).substr(2, 9),
          name: formData.name.trim(),
          type: formData.type as OrganizationType,
          url: formData.url.trim() || undefined,
          phone_number: formData.phone_number.trim() || undefined,
          description: formData.description.trim() || undefined,
          address_line1: formData.address_line1.trim() || undefined,
          address_line2: formData.address_line2.trim() || undefined,
          city: formData.city.trim() || undefined,
          state: formData.state.trim() || undefined,
          postal_code: formData.postal_code.trim() || undefined,
          country: formData.country.trim() || undefined,
          allowed_domains: formData.allowed_domains.trim() || undefined,
          created_at: organization?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (isEditMode) {
          toast.success('Organization updated successfully!');
          onOrganizationUpdated?.(newOrganization);
        } else {
          toast.success(autoJoinOrg ? 'Organization created successfully!' : 'Organization created without joining!');
          onOrganizationCreated(newOrganization);
        }
      }, 1500);
      return;
    }

    // Real API call
    try {
      // Get current session
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setErrors({ general: 'Not authenticated. Please sign in again.' });
        setIsSubmitting(false);
        return;
      }

      // Get only changed fields for efficiency in edit mode
      const changedFields = isEditMode ? changeDetection.getChangedFields() : {};

      const requestBody: any = {};

      // In create mode, send all fields. In edit mode, only send changed fields
      if (!isEditMode) {
        requestBody.name = formData.name.trim();
        requestBody.type = formData.type;
        requestBody.url = formData.url.trim() || null;
        requestBody.phone_number = formData.phone_number.trim() || null;
        requestBody.description = formData.description.trim() || null;
        requestBody.address_line1 = formData.address_line1.trim() || null;
        requestBody.address_line2 = formData.address_line2.trim() || null;
        requestBody.city = formData.city.trim() || null;
        requestBody.state = formData.state.trim() || null;
        requestBody.postal_code = formData.postal_code.trim() || null;
        requestBody.country = formData.country.trim() || null;
        requestBody.allowed_domains = formData.allowed_domains.trim() || null;
      } else {
        // Only send changed fields in edit mode
        if (changedFields.name !== undefined) {
          requestBody.name = formData.name.trim();
        }
        if (changedFields.type !== undefined) {
          requestBody.type = formData.type;
        }
        if (changedFields.url !== undefined) {
          requestBody.url = formData.url.trim() || null;
        }
        if (changedFields.phone_number !== undefined) {
          requestBody.phone_number = formData.phone_number.trim() || null;
        }
        if (changedFields.description !== undefined) {
          requestBody.description = formData.description.trim() || null;
        }
        if (changedFields.address_line1 !== undefined) {
          requestBody.address_line1 = formData.address_line1.trim() || null;
        }
        if (changedFields.address_line2 !== undefined) {
          requestBody.address_line2 = formData.address_line2.trim() || null;
        }
        if (changedFields.city !== undefined) {
          requestBody.city = formData.city.trim() || null;
        }
        if (changedFields.state !== undefined) {
          requestBody.state = formData.state.trim() || null;
        }
        if (changedFields.postal_code !== undefined) {
          requestBody.postal_code = formData.postal_code.trim() || null;
        }
        if (changedFields.country !== undefined) {
          requestBody.country = formData.country.trim() || null;
        }
        if (changedFields.allowed_domains !== undefined) {
          requestBody.allowed_domains = formData.allowed_domains.trim() || null;
        }
      }

      let url = `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4/organizations`;
      let method = 'POST';
      
      if (isEditMode && organization) {
        url += `/${organization.id}`;
        method = 'PUT';
      } else {
        // Only include auto_join for create mode
        (requestBody as any).auto_join = autoJoinOrg;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} organization`);
      }

      const resultOrganization = await response.json();

      if (isEditMode) {
        toast.success('Organization updated successfully!');

        // Mark as saved for change detection
        changeDetection.markAsSaved({
          name: resultOrganization.name || '',
          type: resultOrganization.type || '',
          url: resultOrganization.url || '',
          phone_number: resultOrganization.phone_number || '',
          description: resultOrganization.description || '',
          address_line1: resultOrganization.address_line1 || '',
          address_line2: resultOrganization.address_line2 || '',
          city: resultOrganization.city || '',
          state: resultOrganization.state || '',
          postal_code: resultOrganization.postal_code || '',
          country: resultOrganization.country || '',
          allowed_domains: resultOrganization.allowed_domains || '',
        });

        onOrganizationUpdated?.(resultOrganization);
      } else {
        toast.success('Organization created successfully!');
        onOrganizationCreated(resultOrganization);
      }
    } catch (err: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} organization:`, err);
      setErrors({ general: err.message || `Failed to ${isEditMode ? 'update' : 'create'} organization. Please try again.` });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-sky-500 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-gray-900">Gig Manager</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">{isEditMode ? 'Edit Organization' : 'Create New Organization'}</h1>
          <p className="text-gray-600">{isEditMode ? 'Update organization details' : 'Search for your business or enter details manually'}</p>
        </div>

        {/* Google Places Search - Only show in create mode */}
        {!isEditMode && !selectedPlace && (
          <Card className="p-6 mb-6">
            <h3 className="text-gray-900 mb-4">Find Your Business</h3>
            <p className="text-sm text-gray-600 mb-4">
              Search for your business on Google to auto-fill organization details
            </p>
            
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for your business name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchPlaces()}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleSearchPlaces}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-sky-500 hover:bg-sky-600 text-white"
              >
                {isSearching ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Search'
                )}
              </Button>
            </div>

            {/* Search Results */}
            {showResults && (
              <div className="border border-gray-200 rounded-lg mt-4">
                {isSearching ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-sky-500" />
                    <p className="text-sm text-gray-600">Searching Google Places...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {searchResults.map((place) => (
                      <button
                        key={place.place_id}
                        onClick={() => handleSelectPlace(place)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-sky-100 rounded-lg flex-shrink-0">
                            <Building2 className="w-5 h-5 text-sky-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-gray-900 mb-1">{place.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <MapPin className="w-4 h-4" />
                              <span className="truncate">{place.formatted_address}</span>
                            </div>
                            {place.formatted_phone_number && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                <Phone className="w-4 h-4" />
                                <span>{place.formatted_phone_number}</span>
                              </div>
                            )}
                            {place.website && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Globe className="w-4 h-4" />
                                <span className="truncate">{place.website}</span>
                              </div>
                            )}
                          </div>
                          <Check className="w-5 h-5 text-gray-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-900 mb-1">No results found</p>
                    <p className="text-sm text-gray-600 mb-4">
                      We couldn't find "{searchQuery}" on Google Places
                    </p>
                    <Button
                      onClick={handleManualEntry}
                      variant="outline"
                      size="sm"
                    >
                      Fill in manually instead
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!showResults && (
              <div className="text-center pt-4 border-t border-gray-200">
                <Button
                  onClick={handleManualEntry}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600"
                >
                  Skip search and enter details manually
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Selected Place Banner */}
        {selectedPlace && (
          <Card className="p-4 mb-6 bg-sky-50 border-sky-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 bg-sky-500 rounded-lg flex-shrink-0">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-sky-500 hover:bg-sky-600">
                      Auto-filled from Google Places
                    </Badge>
                  </div>
                  <h4 className="text-gray-900">{selectedPlace.name}</h4>
                  <p className="text-sm text-gray-600 truncate">{selectedPlace.formatted_address}</p>
                </div>
              </div>
              <Button
                onClick={handleClearSelection}
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Form - Show only when place is selected or manual entry is chosen */}
        {(selectedPlace || showManualEntry) && (
          <Card className="p-6 sm:p-8">
            <form onSubmit={handleSubmit}>
              {/* General Error */}
              {errors.general && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              )}

              {/* Required Fields Section */}
              <div className="space-y-6 mb-8">
                <h3 className="text-gray-900">Basic Information</h3>

                {/* Organization Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Organization Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter organization name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={errors.name ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Organization Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">
                    Organization Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange('type', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select organization type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.type}
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    className={errors.phone ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* Website URL */}
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.url}
                    onChange={(e) => handleInputChange('url', e.target.value)}
                    className={errors.url ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {errors.url && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.url}
                    </p>
                  )}
                </div>

                {/* Allowed Domains */}
                <div className="space-y-2">
                  <Label htmlFor="allowed_domains">Allowed Email Domains</Label>
                  <Input
                    id="allowed_domains"
                    type="text"
                    placeholder="example.com, company.org"
                    value={formData.allowed_domains}
                    onChange={(e) => handleInputChange('allowed_domains', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-gray-500">
                    Comma-separated list of email domains allowed to join this organization (e.g., example.com, company.org)
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <MarkdownEditor
                    value={formData.description}
                    onChange={(value) => handleInputChange('description', value)}
                    placeholder="Brief description of your organization... You can use **Markdown** formatting!"
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-gray-500">A short summary about your organization. Supports Markdown formatting.</p>
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-6 mb-8 pt-8 border-t border-gray-200">
                <h3 className="text-gray-900">Location (Optional)</h3>

                {/* Address Line 1 */}
                <div className="space-y-2">
                  <Label htmlFor="address_line1">Address</Label>
                  <Input
                    id="address_line1"
                    type="text"
                    placeholder="Street address"
                    value={formData.address_line1}
                    onChange={(e) => handleInputChange('address_line1', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Address Line 2 */}
                <div className="space-y-2">
                  <Label htmlFor="address_line2">Address Line 2</Label>
                  <Input
                    id="address_line2"
                    type="text"
                    placeholder="Apartment, suite, etc."
                    value={formData.address_line2}
                    onChange={(e) => handleInputChange('address_line2', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* City and State */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      type="text"
                      placeholder="State or Province"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Postal Code and Country */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      type="text"
                      placeholder="ZIP or Postal Code"
                      value={formData.postal_code}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      type="text"
                      placeholder="Country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="sm:w-auto"
                >
                  Cancel
                </Button>
                {isEditMode ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting || !changeDetection.hasChanges}
                    className="bg-sky-500 hover:bg-sky-600 text-white sm:ml-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => handleSubmit(e, false)}
                      disabled={isSubmitting}
                      className="border-sky-500 text-sky-600 hover:bg-sky-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create without Joining'
                      )}
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-sky-500 hover:bg-sky-600 text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create and Join'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}