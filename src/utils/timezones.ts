import { TIMEZONES } from './supabase/constants';

export interface TimezoneOption {
  value: string;
  label: string;
}

/**
 * Get all supported timezones
 */
export function getAllTimezones(): string[] {
  return TIMEZONES;
}

/**
 * Get timezones grouped by region for better UX
 */
export function getTimezonesByRegion(): Record<string, TimezoneOption[]> {
  const grouped: Record<string, TimezoneOption[]> = {};
  
  TIMEZONES.forEach(timezone => {
    const parts = timezone.split('/');
    const region = parts[0];
    
    if (!grouped[region]) {
      grouped[region] = [];
    }
    
    // Create a more readable label
    let label = timezone;
    if (parts.length > 1) {
      // Convert "America/New_York" to "New York"
      // Convert "Europe/London" to "London"
      const city = parts[parts.length - 1].replace(/_/g, ' ');
      
      // For common US timezones, add friendlier labels
      const friendlyLabels: Record<string, string> = {
        'America/New_York': 'Eastern Time (New York)',
        'America/Chicago': 'Central Time (Chicago)', 
        'America/Denver': 'Mountain Time (Denver)',
        'America/Los_Angeles': 'Pacific Time (Los Angeles)',
        'America/Phoenix': 'Arizona Time (Phoenix)',
        'America/Anchorage': 'Alaska Time (Anchorage)',
        'Pacific/Honolulu': 'Hawaii Time (Honolulu)',
        'Europe/London': 'GMT (London)',
        'Europe/Paris': 'CET (Paris)',
        'Asia/Tokyo': 'JST (Tokyo)',
        'Asia/Shanghai': 'CST (Shanghai)',
        'Australia/Sydney': 'AEDT (Sydney)'
      };
      
      label = friendlyLabels[timezone] || `${city} (${timezone})`;
    }
    
    grouped[region].push({
      value: timezone,
      label
    });
  });
  
  // Sort regions and timezones within each region
  Object.keys(grouped).forEach(region => {
    grouped[region].sort((a, b) => a.label.localeCompare(b.label));
  });
  
  return grouped;
}

/**
 * Get flattened timezone options for dropdowns
 */
export function getTimezoneOptions(): TimezoneOption[] {
  const grouped = getTimezonesByRegion();
  const options: TimezoneOption[] = [];
  
  // Order regions by relevance
  const orderedRegions = ['America', 'Europe', 'Asia', 'Australia', 'Pacific', 'Atlantic', 'Africa', 'Indian', 'Antarctica', 'Arctic'];
  
  orderedRegions.forEach(region => {
    if (grouped[region]) {
      options.push(...grouped[region]);
    }
  });
  
  // Add any remaining regions not in the ordered list
  Object.keys(grouped).forEach(region => {
    if (!orderedRegions.includes(region)) {
      options.push(...grouped[region]);
    }
  });
  
  return options;
}

/**
 * Get default timezone - user's timezone or fallback
 */
export function getDefaultTimezone(userTimezone?: string | null): string {
  // If user has a timezone preference, use it
  if (userTimezone && TIMEZONES.includes(userTimezone)) {
    return userTimezone;
  }
  
  // Try to detect user's timezone
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONES.includes(detected)) {
      return detected;
    }
  } catch {
    // Ignore detection errors
  }
  
  // Fallback to UTC
  return 'UTC';
}

/**
 * Get common US timezones for quick selection
 */
export function getCommonUSTimezones(): TimezoneOption[] {
  return [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona (MST)' },
    { value: 'America/Anchorage', label: 'Alaska (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' }
  ];
}

/**
 * Validate if a timezone string is supported
 */
export function isValidTimezone(timezone: string): boolean {
  return TIMEZONES.includes(timezone);
}