
/**
 * Timezone-aware date utilities using Intl.DateTimeFormat
 */

/**
 * Formats an ISO date string into a display string in a specific timezone
 */
export const formatInTimeZone = (
  date: string | Date,
  timeZone: string | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return typeof date === 'string' ? date : '';

    return new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: timeZone || undefined, // Fallback to browser local if undefined
    }).format(d);
  } catch (error) {
    console.error('Error formatting date in timezone:', error, { date, timeZone });
    // Fallback to local time if timezone is invalid
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', options);
  }
};

/**
 * Formats a date for display in the Gig Table (e.g., "Jan 31, 2026")
 */
export const formatDateDisplay = (date: string | Date, timeZone?: string): string => {
  return formatInTimeZone(date, timeZone, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Formats a date with full month name and weekday (e.g., "Saturday, January 31, 2026")
 */
export const formatDateLong = (date: string | Date, timeZone?: string): string => {
  return formatInTimeZone(date, timeZone, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Formats only the time portion (e.g., "8:00 PM")
 */
export const formatTimeDisplay = (date: string | Date, timeZone?: string): string => {
  return formatInTimeZone(date, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Formats a date and time range for display according to business rules:
 * - Always show start date.
 * - If gig is < 24h and ends on a different day: Show "Start Date, Start Time - End Time"
 * - If gig is >= 24h: Show "Start Date, Start Time - End Date, End Time"
 */
export const formatDateTimeDisplay = (
  start: string | Date,
  end: string | Date,
  timeZone?: string
): string => {
  if (!start) return '';
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  
  const dateStr = formatDateDisplay(start, timeZone);
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const startTimeStr = formatInTimeZone(start, timeZone, timeOptions);
  const endTimeStr = formatInTimeZone(end, timeZone, timeOptions);

  // If start and end are the same, just show start date and time
  if (startDate.getTime() === endDate.getTime()) {
    return `${dateStr} ${startTimeStr}`;
  }

  // Calculate duration in hours
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

  // Check if they are on the same calendar day in the target timezone
  const startDayStr = formatDateDisplay(start, timeZone);
  const endDayStr = formatDateDisplay(end, timeZone);
  const sameDay = startDayStr === endDayStr;

  if (durationHours < 24) {
    // Less than 24 hours: "Date StartTime - EndTime" (even if it crosses midnight)
    return `${dateStr} ${startTimeStr} - ${endTimeStr}`;
  } else {
    // 24 hours or more: "Date StartTime - Date EndTime"
    const endDateStr = formatDateDisplay(end, timeZone);
    return `${dateStr} ${startTimeStr} - ${endDateStr} ${endTimeStr}`;
  }
};

/**
 * Converts a datetime-local input string (YYYY-MM-DDTHH:mm) 
 * to a UTC ISO string, interpreting it in the target timezone.
 */
export const parseLocalToUTC = (
  localDateTimeStr: string,
  timeZone: string | undefined
): string => {
  if (!localDateTimeStr) return '';
  if (!timeZone) return new Date(localDateTimeStr).toISOString();

  try {
    // Strategy: Use Intl to find the offset for this specific date/timezone
    const date = new Date(localDateTimeStr);
    
    // Get the parts in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(date);
    const p: Record<string, string> = {};
    parts.forEach(part => { p[part.type] = part.value; });
    
    // Construct a date string that Date() can parse as local
    const targetLocalStr = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
    const targetLocalDate = new Date(targetLocalStr);
    
    // Calculate the difference between what the browser thought was local and what the target timezone is
    const diff = date.getTime() - targetLocalDate.getTime();
    
    return new Date(date.getTime() + diff).toISOString();
  } catch (error) {
    console.error('Error parsing local to UTC:', error);
    return new Date(localDateTimeStr).toISOString();
  }
};

/**
 * Formats a Date object or ISO string for a datetime-local input 
 * in the specific timezone (YYYY-MM-DDTHH:mm)
 */
export const formatForDateTimeInput = (
  date: string | Date,
  timeZone: string | undefined
): string => {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(d);
    const p: Record<string, string> = {};
    parts.forEach(part => { p[part.type] = part.value; });
    
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  } catch (error) {
    console.error('Error formatting for input:', error);
    return '';
  }
};

/**
 * Formats a gig date/time for display in previews and tables.
 * Handles date-only entries (midnight UTC) specially by omitting time.
 */
export const formatGigDateTimeForDisplay = (dateStr: string, timeZone?: string): string => {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    
    // Check if this is a date-only entry (midnight UTC)
    if (dateStr.endsWith('T00:00:00.000Z')) {
      // For date-only entries, just show the date
      return formatInTimeZone(date, timeZone, {
        month: '2-digit',
        day: '2-digit', 
        year: 'numeric',
      });
    } else {
      // For entries with time, show date and time in gig timezone
      return formatInTimeZone(date, timeZone, {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  } catch (error) {
    console.error('Error formatting gig date for display:', error);
    return dateStr;
  }
};

/**
 * Formats a gig date/time for editing in timezone-aware inputs.
 * Handles date-only entries by returning date-only format (YYYY-MM-DD).
 */
export const formatGigDateTimeForInput = (dateStr: string, timeZone?: string): string => {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    
    // Check if this is a date-only entry (midnight UTC)
    if (dateStr.endsWith('T00:00:00.000Z')) {
      // For date-only entries, return just the date part for date input
      return formatInTimeZone(date, timeZone, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).split('/').reverse().join('-'); // Convert MM/DD/YYYY to YYYY-MM-DD
    } else {
      // For entries with time, use datetime-local format
      return formatForDateTimeInput(dateStr, timeZone);
    }
  } catch (error) {
    console.error('Error formatting gig date for input:', error);
    return '';
  }
};

/**
 * Parses user input from timezone-aware date/datetime inputs back to UTC ISO string.
 * Handles both date-only (YYYY-MM-DD) and datetime-local (YYYY-MM-DDTHH:mm) inputs.
 */
export const parseGigDateTimeFromInput = (
  inputValue: string,
  timeZone?: string,
  isDateOnly = false
): string => {
  if (!inputValue) return '';
  
  try {
    if (isDateOnly || !inputValue.includes('T')) {
      // Handle date-only input (YYYY-MM-DD)
      // Convert to midnight UTC for consistent date-only handling
      return new Date(`${inputValue}T00:00:00Z`).toISOString();
    } else {
      // Handle datetime input - convert from timezone to UTC
      return parseLocalToUTC(inputValue, timeZone);
    }
  } catch (error) {
    console.error('Error parsing gig date from input:', error);
    return '';
  }
};
