import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { useFormWithChanges } from '../utils/hooks/useFormWithChanges';
import { createSubmissionPayload, normalizeFormData } from '../utils/form-utils';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import AppHeader from './AppHeader';
import { Building2, AlertCircle, Loader2, User } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { User as UserType } from '../App';

interface UserProfileCompletionScreenProps {
  user: UserType;
  onProfileCompleted: (updatedUser: UserType) => void;
  onSkip: () => void;
  useMockData?: boolean;
}

interface FormData {
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface FormErrors {
  general?: string;
}

export default function UserProfileCompletionScreen({
  user,
  onProfileCompleted,
  onSkip,
  useMockData = false,
}: UserProfileCompletionScreenProps) {
  const [formData, setFormData] = useState<FormData>({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });

  // Change detection for efficient updates
  const changeDetection = useFormWithChanges({
    initialData: {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
    currentData: formData,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors.general) {
      setErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    if (useMockData) {
      // Mock mode - just update and continue
      setTimeout(() => {
        const updatedUser: UserType = {
          ...user,
          first_name: formData.first_name || user.first_name,
          last_name: formData.last_name || user.last_name,
        };
        toast.success('Profile updated!');
        onProfileCompleted(updatedUser);
      }, 1000);
      return;
    }

    try {
      // Import Supabase info dynamically
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const { createClient } = await import('../utils/supabase/client');
      const supabase = createClient();
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setErrors({ general: 'Not authenticated. Please sign in again.' });
        setIsSubmitting(false);
        return;
      }

      // Normalize form data
      const normalizedData = normalizeFormData(formData);
      
      // Get only changed fields
      const requestBody = createSubmissionPayload(normalizedData, changeDetection.originalData);

      // If no fields changed, don't make the request
      if (Object.keys(requestBody).length === 0) {
        toast.info('No changes to save');
        setIsSubmitting(false);
        return;
      }

      const supabaseUrl = `https://${projectId}.supabase.co`;
      const accessToken = session.access_token;

      // Update user profile via server endpoint
      const response = await fetch(`${supabaseUrl}/functions/v1/server/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const userData = await response.json();

      // Update user object
      const updatedUser: UserType = {
        ...user,
        first_name: userData.first_name || user.first_name,
        last_name: userData.last_name || user.last_name,
      };

      toast.success('Profile updated successfully!');

      // Mark as saved for change detection
      changeDetection.markAsSaved({
        first_name: updatedUser.first_name || '',
        last_name: updatedUser.last_name || '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
      });

      onProfileCompleted(updatedUser);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setErrors({ general: err.message || 'Failed to update profile. Please try again.' });
      setIsSubmitting(false);
    }
  };

  const handleSkipClick = () => {
    if (window.confirm('Are you sure you want to skip profile completion? You can always update your profile later.')) {
      onSkip();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-50 px-4">
      <div className="w-full max-w-2xl">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-500 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-sky-900 mb-2">Welcome to Gig Manager!</h1>
          <p className="text-gray-600">Complete your profile to get started</p>
        </div>

        {/* Profile Completion Card */}
        <Card className="p-8">
          <form onSubmit={handleSubmit}>
            {/* General Error */}
            {errors.general && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Info Message */}
            <div className="mb-6 p-4 bg-sky-50 border border-sky-200 rounded-lg">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-sky-900">
                    <strong>All fields are optional.</strong> You can fill these out now or update your profile later.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Email (Read-only) */}
            <div className="space-y-6 mb-8">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">Your email cannot be changed here</p>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-6 mb-8 pt-8 border-t border-gray-200">
              <h3 className="text-gray-900">Address (Optional)</h3>

              {/* Address Line 1 */}
              <div className="space-y-2">
                <Label htmlFor="address_line1">Street Address</Label>
                <Input
                  id="address_line1"
                  type="text"
                  placeholder="123 Main Street"
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
                    placeholder="Los Angeles"
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
                    placeholder="CA"
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
                    placeholder="90028"
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
                    placeholder="United States"
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
                variant="ghost"
                onClick={handleSkipClick}
                disabled={isSubmitting}
                className="sm:w-auto"
              >
                Skip for now
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !changeDetection.hasChanges}
                className="bg-sky-500 hover:bg-sky-600 text-white sm:ml-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>You can always update your profile later in settings</p>
        </div>
      </div>
    </div>
  );
}