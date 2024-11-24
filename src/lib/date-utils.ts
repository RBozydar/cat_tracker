// DO NOT REMOVE - TZ HANDLING
// Utility functions for consistent date handling across timezones

/**
 * Gets the user's timezone from their browser settings
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Gets the user's locale from their browser settings
 */
export function getUserLocale(): string {
  return navigator.language || 'en-US' // Fallback to en-US if navigator.language is not available
}

/**
 * Converts a date to the user's local date string
 * @param date - The date to convert (can be Date object or ISO string)
 */
export function toUserLocaleDateString(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString(getUserLocale(), { 
    timeZone: getUserTimezone() 
  })
}

/**
 * Gets today's date in the user's timezone
 */
export function getTodayInUserTimezone(): string {
  return toUserLocaleDateString(new Date())
}

/**
 * Gets a date range for the last N days in user's timezone
 * @param days - Number of days to look back
 */
export function getLastNDaysRange(days: number): { start: Date; end: Date } {
  const timezone = getUserTimezone()
  const now = new Date()
  
  // End date: today at 23:59:59 in user's timezone
  const end = new Date(now)
  end.setHours(23, 59, 59)
  const endUTC = localDateToUTC(end, timezone)
  
  // Start date: N days ago at 00:00:00.000 in user's timezone
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0)
  const startUTC = localDateToUTC(start, timezone)
  
  return {
    start: new Date(startUTC),
    end: new Date(endUTC)
  }
}

/**
 * Checks if a date falls within a date range in user's timezone
 */
export function isDateInRange(date: Date | string, start: Date, end: Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Just compare timestamps directly
  const dateTs = dateObj.getTime()
  const startTs = start.getTime()
  const endTs = end.getTime()
  
  return dateTs >= startTs && dateTs <= endTs
}

/**
 * Checks if two dates are the same day in the user's timezone
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  return toUserLocaleDateString(date1) === toUserLocaleDateString(date2)
}

/**
 * Converts a local date to UTC, accounting for the user's timezone
 * @param date - The local date to convert
 * @param timezone - The user's timezone
 * @returns ISO string in UTC
 */
export function localDateToUTC(date: Date, timezone: string): string {
  // Get the UTC timestamp for midnight
  const utcDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  ))
  
  // Convert to target timezone
  const targetDate = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }))
  const offset = targetDate.getTime() - utcDate.getTime()
  
  return new Date(date.getTime() - offset).toISOString()
}

/**
 * Formats a date for display with time in user's locale
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString(getUserLocale(), {
    timeZone: getUserTimezone(),
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

/**
 * Debug function to show all timezone information for a date
 * @param date - The date to inspect
 * @param label - Label for the debug output
 */
export function debugTimezone(date: Date | string, label: string = 'Date Debug'): void {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const timezone = getUserTimezone()

  console.debug(`TZ Debug - ${label}:`, {
    input: {
      raw: date,
      parsed: dateObj,
      timezone,
    },
    display: {
      ISO: dateObj.toISOString(),
      UTC: dateObj.toLocaleString('en-US', { timeZone: 'UTC' }),
      Local: dateObj.toLocaleString(),
      UserTZ: dateObj.toLocaleString('en-US', { timeZone: timezone }),
    },
    meta: {
      timezoneOffset: dateObj.getTimezoneOffset(),
      userTimezone: timezone,
    }
  })
}

/**
 * Gets a date object in user's locale format
 * @param date - The date to convert
 * @param options - Intl.DateTimeFormatOptions
 */
export function toUserLocaleDate(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return date.toLocaleString(getUserLocale(), {
    timeZone: getUserTimezone(),
    ...options
  })
} 