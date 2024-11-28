import { 
  toUserLocaleDateString,
  getLastNDaysRange,
  getUserTimezone,
  formatDateTime,
  groupMealsByDate,
  createDateRangeQuery,
  getDayBounds
} from '../date-utils'

// Mock timezone functions
const mockGetTimezone = jest.fn()
const mockFormat = jest.fn()
Object.defineProperty(Intl, 'DateTimeFormat', {
  value: jest.fn().mockReturnValue({
    resolvedOptions: () => ({ timeZone: mockGetTimezone() }),
    format: mockFormat
  })
})

jest.mock('@date-fns/tz', () => ({
  TZDate: {
    tz: (timezone: string, date?: Date) => {
      const d = date ? new Date(date) : new Date('2024-01-15T12:00:00Z')
      const result = new Date(d)
      
      switch(timezone) {
        case 'Europe/Warsaw': { // UTC+1
          // For Warsaw, we need to adjust the time to local timezone
          // This means subtracting 1 hour from UTC time
          result.setTime(result.getTime() - (1 * 60 * 60 * 1000))
          return result
        }
        case 'America/New_York': { // UTC-5
          // For NY, we need to adjust the time to local timezone
          // This means adding 5 hours to UTC time
          result.setTime(result.getTime() + (5 * 60 * 60 * 1000))
          return result
        }
        default:
          return result
      }
    }
  },
  tz: (timezone: string) => timezone
}))

// No need to mock date-fns - let it use the real implementations
jest.unmock('date-fns')

// At the top with other mocks
const mockLanguage = jest.fn(() => 'en-US')
Object.defineProperty(navigator, 'language', {
  configurable: true,
  get: mockLanguage
})

describe('date-utils', () => {
//   describe('localDateToUTC', () => {
//     beforeEach(() => {
//       // Reset timezone for each test
//       jest.clearAllMocks()
//     })

//     it('converts local time to UTC when timezone is ahead of UTC (UTC+1)', () => {
//       // Set timezone to UTC+1
//       mockGetTimezone.mockReturnValue('Europe/Warsaw')
      
//       // Local time: 14:00 (UTC+1)
//       const localDate = new Date('2024-01-01T14:00:00')
//       const result = localDateToUTC(localDate, 'Europe/Warsaw')
      
//       // Expected UTC: 13:00
//       expect(new Date(result).getUTCHours()).toBe(13)
//     })

//     it('converts local time to UTC when timezone is behind UTC (UTC-5)', () => {
//       // Set timezone to UTC-5
//       mockGetTimezone.mockReturnValue('America/New_York')
      
//       // Local time: 10:00 (UTC-5)
//       const localDate = new Date('2024-01-01T10:00:00')
//       const result = localDateToUTC(localDate, 'America/New_York')
      
//       // Expected UTC: 15:00
//       expect(new Date(result).getUTCHours()).toBe(15)
//     })

//     it('handles daylight saving time correctly', () => {
//       mockGetTimezone.mockReturnValue('Europe/London')
      
//       // Summer time (BST)
//       const summerDate = new Date('2024-07-01T14:00:00')
//       const summerResult = localDateToUTC(summerDate, 'Europe/London')
//       expect(new Date(summerResult).getUTCHours()).toBe(13)
      
//       // Winter time (GMT)
//       const winterDate = new Date('2024-01-01T14:00:00')
//       const winterResult = localDateToUTC(winterDate, 'Europe/London')
//       expect(new Date(winterResult).getUTCHours()).toBe(14)
//     })

//     it('preserves minutes and seconds', () => {
//       mockGetTimezone.mockReturnValue('Europe/Warsaw')
      
//       const localDate = new Date('2024-01-01T14:30:45')
//       const result = localDateToUTC(localDate, 'Europe/Warsaw')
//       const utcDate = new Date(result)
      
//       expect(utcDate.getUTCHours()).toBe(13)
//       expect(utcDate.getUTCMinutes()).toBe(30)
//       expect(utcDate.getUTCSeconds()).toBe(45)
//     })
//   })

  describe('date range functions', () => {
    const TEST_DATE = '2024-01-15T12:00:00Z'

    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date(TEST_DATE))
    })

    describe('when user is in UTC', () => {
      beforeEach(() => {
        mockGetTimezone.mockReturnValue('UTC')
      })

      it('gets correct date range for last N days', () => {
        const { start, end } = getLastNDaysRange(7)
        expect(start.getDate()).toBe(8)
        expect(end.getDate()).toBe(15)
      })
    })

    describe('when user is in UTC+1', () => {
      beforeEach(() => {
        mockGetTimezone.mockReturnValue('Europe/Warsaw')
        mockLanguage.mockReturnValue('en-US')
      })

      it('gets correct date range for last N days in user timezone', () => {
        const { start, end } = getLastNDaysRange(7)
        expect(start.getDate()).toBe(8)
        expect(end.getDate()).toBe(15)
      })
    })

    describe('when user is in UTC-5', () => {
      beforeEach(() => {
        mockGetTimezone.mockReturnValue('America/New_York')
        mockLanguage.mockReturnValue('en-US')
      })

      it('gets correct date range for last N days in user timezone', () => {
        const { start, end } = getLastNDaysRange(7)
        expect(start.getDate()).toBe(8)
        expect(end.getDate()).toBe(15)
      })
    })
  })

  describe('formatting functions', () => {
    beforeEach(() => {
      mockGetTimezone.mockReturnValue('UTC')
    })

    it('formats date time according to user locale', () => {
      Object.defineProperty(navigator, 'language', {
        get: () => 'en-GB'
      })

      const date = new Date('2024-01-01T14:30:00Z')
      const result = formatDateTime(date)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('handles ISO string input', () => {
      const result = toUserLocaleDateString('2024-01-01T14:30:00Z')
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })
  })

  describe('getUserTimezone', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('returns the user timezone from Intl.DateTimeFormat', () => {
      mockGetTimezone.mockReturnValue('Europe/Warsaw')
      expect(getUserTimezone()).toBe('Europe/Warsaw')
    })

    it('handles different timezones', () => {
      mockGetTimezone.mockReturnValue('America/New_York')
      expect(getUserTimezone()).toBe('America/New_York')

      mockGetTimezone.mockReturnValue('Asia/Tokyo')
      expect(getUserTimezone()).toBe('Asia/Tokyo')

      mockGetTimezone.mockReturnValue('UTC')
      expect(getUserTimezone()).toBe('UTC')
    })

    it('calls Intl.DateTimeFormat().resolvedOptions() exactly once', () => {
      mockGetTimezone.mockReturnValue('Europe/London')
      getUserTimezone()
      expect(mockGetTimezone).toHaveBeenCalledTimes(1)
    })
  })

  describe('getDayBounds', () => {
    beforeEach(() => {
      mockGetTimezone.mockReturnValue('UTC')
    })

    it('returns start and end of day for given date', () => {
      const testDate = new Date('2024-01-15T12:34:56Z')
      const { start, end } = getDayBounds(testDate)

      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
    })

    it('uses current date when no date provided', () => {
      const now = new Date('2024-01-15T12:00:00Z')
      jest.setSystemTime(now)

      const { start, end } = getDayBounds()

      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
    })
  })

  describe('groupMealsByDate', () => {
    beforeEach(() => {
      mockGetTimezone.mockReturnValue('UTC')
    })

    it('groups meals by date correctly', () => {
      const meals = [
        { createdAt: '2024-01-15T10:00:00Z', catId: 1 },
        { createdAt: '2024-01-15T14:00:00Z', catId: 2 },
        { createdAt: '2024-01-16T10:00:00Z', catId: 1 },
      ]

      const grouped = groupMealsByDate(meals)
      const dates = Array.from(grouped.keys())
      
      expect(dates.length).toBe(2)
      expect(grouped.get(dates[0])?.size).toBe(2)
      expect(grouped.get(dates[1])?.size).toBe(1)
    })

    it('handles empty array', () => {
      const grouped = groupMealsByDate([])
      expect(grouped.size).toBe(0)
    })

    it('groups meals by date in user timezone', () => {
      mockGetTimezone.mockReturnValue('Europe/London')
      
      const meals = [
        { createdAt: '2024-01-16T00:30:00Z', catId: 1 }, // 00:30 Jan 16 London
        { createdAt: '2024-01-15T22:30:00Z', catId: 2 }, // 22:30 Jan 15 London
      ]

      const grouped = groupMealsByDate(meals)
      
      // In London timezone, these should be on different days
      expect(grouped.size).toBe(2)
    })
  })

  describe('createDateRangeQuery', () => {
    beforeEach(() => {
      mockGetTimezone.mockReturnValue('UTC')
    })

    it('creates correct date range query', () => {
      const query = createDateRangeQuery('2024-01-15', 'UTC')
      
      expect(query.gte).toMatch(/2024-01-15/)
      expect(query.lte).toMatch(/2024-01-15/)
      expect(query.gte).toMatch(/00:00:00/)
      expect(query.lte).toMatch(/23:59:59/)
    })

    it('handles date range with end date', () => {
      const query = createDateRangeQuery('2024-01-15', 'UTC', '2024-01-16')
      
      expect(query.gte).toMatch(/2024-01-15/)
      expect(query.lte).toMatch(/2024-01-16/)
      expect(query.gte).toMatch(/00:00:00/)
      expect(query.lte).toMatch(/23:59:59/)
    })

    it('adjusts for timezone', () => {
      mockGetTimezone.mockReturnValue('Europe/London')
      
      const query = createDateRangeQuery('2024-01-15', 'Europe/London')
      
      // Should be adjusted for timezone
      expect(new Date(query.gte).getUTCHours()).toBe(0)
      expect(new Date(query.lte).getUTCHours()).toBe(23)
    })
  })
}) 