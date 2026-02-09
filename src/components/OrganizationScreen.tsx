import { useState, useRef, useEffect } from 'react';
import { Building2, Search, Loader2, MapPin, Phone, Globe, Check, AlertCircle, X, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { 
  Organization, 
  OrganizationType 
} from '../utils/supabase/types';
import { ORG_TYPE_CONFIG } from '../utils/supabase/constants';
import { useSimpleFormChanges } from '../utils/hooks/useSimpleFormChanges';
import { createSubmissionPayload, normalizeFormData } from '../utils/form-utils';
import { createClient } from '../utils/supabase/client';
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

interface OrganizationScreenProps {
  organization?: Organization; // If provided, we're in edit mode
  onOrganizationCreated: (org: Organization) => void;
  onOrganizationUpdated?: (org: Organization) => void;
  onCancel: () => void;
  userId?: string;
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

const ORG_TYPES = Object.entries(ORG_TYPE_CONFIG).map(([value, config]) => ({
  value: value as OrganizationType,
  label: config.label,
}));

export default function OrganizationScreen({
  organization,
  onOrganizationCreated,
  onOrganizationUpdated,
  onCancel,
  userId,
}: OrganizationScreenProps) {
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
  const changeDetection = useSimpleFormChanges({
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

      // Build search params
      const searchParams: any = { query: searchQuery };
      if (userLocation) {
        searchParams.latitude = userLocation.latitude;
        searchParams.longitude = userLocation.longitude;
      }

      const queryStr = new URLSearchParams(searchParams).toString();
      const { data: searchResult, error: invokeError } = await supabase.functions.invoke(`server/integrations/google-places/search?${queryStr}`, {
        method: 'GET'
      });

      if (invokeError) {
        console.error('Places search error:', invokeError);
        toast.error(invokeError.message || 'Failed to search places');
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const placeResults = searchResult?.results;

      if (!placeResults || placeResults.length === 0) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      // Fetch details for each place to get phone, website, etc.
      const detailedResults = await Promise.all(
        placeResults.map(async (place: any) => {
          try {
            const { data: details, error: detailsError } = await supabase.functions.invoke(`server/integrations/google-places/${place.place_id}`, {
              method: 'GET'
            });

            if (!detailsError && details) {
              return details;
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

      // Normalize form data
      const normalizedData = normalizeFormData({
        name: formData.name,
        type: formData.type,
        url: formData.url,
        phone_number: formData.phone_number,
        description: formData.description,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
        allowed_domains: formData.allowed_domains,
      });

      // In create mode, send all fields. In edit mode, only send changed fields
      const requestBody = isEditMode
        ? createSubmissionPayload(normalizedData, changeDetection.originalData)
        : normalizedData;

      let path = 'server/organizations';
      let method = 'POST';
      
      if (isEditMode && organization) {
        path += `/${organization.id}`;
        method = 'PUT';
      } else {
        // Only include auto_join for create mode
        (requestBody as any).auto_join = autoJoinOrg;
      }

      const { data: resultOrganization, error: invokeError } = await supabase.functions.invoke(path, {
        method,
        body: requestBody,
      });

      if (invokeError) {
        throw invokeError;
      }

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