import { 
  startOfDay, 
  endOfDay, 
  subDays,
  parseISO,
  isEqual,
  format,
  Locale
} from 'date-fns'
import { TZDate, tz } from '@date-fns/tz'
import * as locales from 'date-fns/locale'

export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function getUserLocale(): string {
  return typeof navigator !== 'undefined' ? navigator.language : 'en-US'
}

export function getDayBounds(date: Date = new Date(), timezone: string = getUserTimezone()) {
  const tzDate = TZDate.tz(timezone, date)
  return {
    start: startOfDay(tzDate),
    end: endOfDay(tzDate)
  }
}

export function getLastNDaysRange(days: number, timezone: string = getUserTimezone()) {
  const tzNow = TZDate.tz(timezone)
  const tzStart = startOfDay(subDays(tzNow, days))
  
  return {
    start: tzStart,
    end: endOfDay(tzNow)
  }
}

export function groupMealsByDate(
  meals: Array<{ createdAt: string; catId: number }>, 
  timezone: string = getUserTimezone()
) {
  return meals.reduce((acc, meal) => {
    const tzDate = TZDate.tz(timezone, new Date(meal.createdAt))
    const dateKey = format(tzDate, 'M/d/yyyy', { in: tz(timezone) })
    
    if (!acc.has(dateKey)) {
      acc.set(dateKey, new Set<number>())
    }
    acc.get(dateKey)!.add(meal.catId)
    return acc
  }, new Map<string, Set<number>>())
}

function getDateFnsLocale(localeString: string = 'en-US'): Locale {
  const normalizedLocale = localeString.replace('-', '')
  return (locales as Record<string, Locale>)[normalizedLocale] || locales.enUS
}

export function toUserLocaleDateString(date: Date | string, timezone: string = getUserTimezone()): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  const tzDate = TZDate.tz(timezone, parsedDate)
  return format(tzDate, 'P', { locale: getDateFnsLocale(getUserLocale()), in: tz(timezone) })
}

export function formatDateTime(date: Date | string, timezone: string = getUserTimezone()): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  const tzDate = TZDate.tz(timezone, parsedDate)
  return format(tzDate, 'PPp', { locale: getDateFnsLocale(getUserLocale()), in: tz(timezone) })
}

export function isSameDay(date1: Date | string, date2: Date | string, timezone: string = getUserTimezone()): boolean {
  const parsedDate1 = typeof date1 === 'string' ? parseISO(date1) : date1
  const parsedDate2 = typeof date2 === 'string' ? parseISO(date2) : date2
  const tzDate1 = TZDate.tz(timezone, parsedDate1)
  const tzDate2 = TZDate.tz(timezone, parsedDate2)
  return isEqual(startOfDay(tzDate1), startOfDay(tzDate2))
}

export function createDateRangeQuery(startDate: string, timezone: string, endDate?: string) {
  const tzStart = TZDate.tz(timezone, parseISO(startDate))
  const tzEnd = endDate ? TZDate.tz(timezone, parseISO(endDate)) : tzStart
  
  return {
    gte: format(startOfDay(tzStart), "yyyy-MM-dd'T'HH:mm:ss'Z'", { in: tz(timezone) }),
    lte: format(endOfDay(tzEnd), "yyyy-MM-dd'T'HH:mm:ss'Z'", { in: tz(timezone) })
  }
}

// export function localDateToUTC(date: Date, timezone: string): Date {
//   return TZDate.tz(timezone, date)
// }

// export function debugTimezone(date: Date, label: string) {
//   if (process.env.NODE_ENV !== 'production') {
//     // console.log(`[${label}]`, {
//     //   date: date.toISOString(),
//     //   localString: date.toString(),
//     //   timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
//     // })
//   }
// } 

export function parseDisplayDate(displayDate: string | undefined, timezone: string): TZDate {
  if (!displayDate) {
    return TZDate.tz(timezone, new Date())
  }

  // Expected format: dd/MM/yyyy
  const [day, month, year] = displayDate.split('/')
  if (!day || !month || !year) {
    console.warn('Invalid date format:', displayDate)
    return TZDate.tz(timezone, new Date())
  }

  // Create date in YYYY-MM-DD format
  const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  return TZDate.tz(timezone, new Date(isoDate))
} 