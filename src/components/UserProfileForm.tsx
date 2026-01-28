import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Mail } from 'lucide-react';
import { UserRole } from '../utils/supabase/types';

export interface UserProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  role?: UserRole;
  default_staff_role_id?: string;
}

interface UserProfileFormProps {
  formData: UserProfileFormData;
  onChange: (field: keyof UserProfileFormData, value: string) => void;
  disabled?: boolean;
  emailReadOnly?: boolean;
  showRole?: boolean;
  showDefaultStaffRole?: boolean;
  staffRoles?: Array<{ id: string; name: string }>;
  requiredFields?: (keyof UserProfileFormData)[];
}

export default function UserProfileForm({
  formData,
  onChange,
  disabled = false,
  emailReadOnly = false,
  showRole = false,
  showDefaultStaffRole = false,
  staffRoles = [],
  requiredFields = [],
}: UserProfileFormProps) {
  const isRequired = (field: keyof UserProfileFormData) => requiredFields.includes(field);

  return (
    <div className="space-y-4">
      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">
            First Name {isRequired('first_name') && '*'}
          </Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => onChange('first_name', e.target.value)}
            placeholder="John"
            disabled={disabled}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="last_name">
            Last Name {isRequired('last_name') && '*'}
          </Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => onChange('last_name', e.target.value)}
            placeholder="Doe"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Default Staff Role (if applicable) */}
      {showDefaultStaffRole && (
        <div className="space-y-2">
          <Label htmlFor="default_staff_role_id">
            Default Staffing Role {isRequired('default_staff_role_id') && '*'}
          </Label>
          <Select 
            value={formData.default_staff_role_id || 'none'} 
            onValueChange={(value) => onChange('default_staff_role_id', value === 'none' ? '' : value)}
            disabled={disabled}
          >
            <SelectTrigger id="default_staff_role_id">
              <SelectValue placeholder="Select a role..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {staffRoles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Default role when assigning this person to gigs
          </p>
        </div>
      )}
      
      {/* Email Address */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email Address {isRequired('email') && '*'}
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
            className="pl-10"
            disabled={disabled || emailReadOnly}
          />
        </div>
        {emailReadOnly && (
          <p className="text-xs text-gray-500">Email cannot be changed</p>
        )}
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone Number {isRequired('phone') && '*'}
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={formData.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          disabled={disabled}
        />
      </div>

      {/* Avatar URL */}
      <div className="space-y-2">
        <Label htmlFor="avatar_url">
          Avatar URL {isRequired('avatar_url') && '*'}
        </Label>
        <Input
          id="avatar_url"
          type="url"
          placeholder="https://example.com/avatar.jpg"
          value={formData.avatar_url}
          onChange={(e) => onChange('avatar_url', e.target.value)}
          disabled={disabled}
        />
        <p className="text-xs text-gray-500">
          URL to profile picture
        </p>
      </div>

      {/* Address Section */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm text-gray-700 mb-4">Address (Optional)</h4>
        
        <div className="space-y-4">
          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label htmlFor="address_line1">
              Street Address {isRequired('address_line1') && '*'}
            </Label>
            <Input
              id="address_line1"
              type="text"
              placeholder="123 Main Street"
              value={formData.address_line1}
              onChange={(e) => onChange('address_line1', e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label htmlFor="address_line2">
              Address Line 2 {isRequired('address_line2') && '*'}
            </Label>
            <Input
              id="address_line2"
              type="text"
              placeholder="Apartment, suite, etc."
              value={formData.address_line2}
              onChange={(e) => onChange('address_line2', e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* City and State */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">
                City {isRequired('city') && '*'}
              </Label>
              <Input
                id="city"
                type="text"
                placeholder="Los Angeles"
                value={formData.city}
                onChange={(e) => onChange('city', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">
                State/Province {isRequired('state') && '*'}
              </Label>
              <Input
                id="state"
                type="text"
                placeholder="CA"
                value={formData.state}
                onChange={(e) => onChange('state', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Postal Code and Country */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">
                Postal Code {isRequired('postal_code') && '*'}
              </Label>
              <Input
                id="postal_code"
                type="text"
                placeholder="90028"
                value={formData.postal_code}
                onChange={(e) => onChange('postal_code', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">
                Country {isRequired('country') && '*'}
              </Label>
              <Input
                id="country"
                type="text"
                placeholder="United States"
                value={formData.country}
                onChange={(e) => onChange('country', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Organization Role (if applicable) */}
      {showRole && formData.role && (
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <Label htmlFor="role">
            Organization Role {isRequired('role') && '*'}
          </Label>
          <Select 
            value={formData.role} 
            onValueChange={(value) => onChange('role', value as UserRole)}
            disabled={disabled}
          >
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin - Full access</SelectItem>
              <SelectItem value="Manager">Manager - Can manage gigs and team</SelectItem>
              <SelectItem value="Staff">Staff - Can be assigned to gigs</SelectItem>
              <SelectItem value="Viewer">Viewer - Read-only access</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}