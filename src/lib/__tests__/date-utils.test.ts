import { 
  localDateToUTC,
  toUserLocaleDateString,
  isDateInRange,
  getLastNDaysRange,
  getUserTimezone,
  formatDateTime
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

// At the top with other mocks
const mockLanguage = jest.fn(() => 'en-US')
Object.defineProperty(navigator, 'language', {
  configurable: true,
  get: mockLanguage
})

describe('date-utils', () => {
  describe('localDateToUTC', () => {
    beforeEach(() => {
      // Reset timezone for each test
      jest.clearAllMocks()
    })

    it('converts local time to UTC when timezone is ahead of UTC (UTC+1)', () => {
      // Set timezone to UTC+1
      mockGetTimezone.mockReturnValue('Europe/Warsaw')
      
      // Local time: 14:00 (UTC+1)
      const localDate = new Date('2024-01-01T14:00:00')
      const result = localDateToUTC(localDate, 'Europe/Warsaw')
      
      // Expected UTC: 13:00
      expect(new Date(result).getUTCHours()).toBe(13)
    })

    it('converts local time to UTC when timezone is behind UTC (UTC-5)', () => {
      // Set timezone to UTC-5
      mockGetTimezone.mockReturnValue('America/New_York')
      
      // Local time: 10:00 (UTC-5)
      const localDate = new Date('2024-01-01T10:00:00')
      const result = localDateToUTC(localDate, 'America/New_York')
      
      // Expected UTC: 15:00
      expect(new Date(result).getUTCHours()).toBe(15)
    })

    it('handles daylight saving time correctly', () => {
      mockGetTimezone.mockReturnValue('Europe/London')
      
      // Summer time (BST)
      const summerDate = new Date('2024-07-01T14:00:00')
      const summerResult = localDateToUTC(summerDate, 'Europe/London')
      expect(new Date(summerResult).getUTCHours()).toBe(13)
      
      // Winter time (GMT)
      const winterDate = new Date('2024-01-01T14:00:00')
      const winterResult = localDateToUTC(winterDate, 'Europe/London')
      expect(new Date(winterResult).getUTCHours()).toBe(14)
    })

    it('preserves minutes and seconds', () => {
      mockGetTimezone.mockReturnValue('Europe/Warsaw')
      
      const localDate = new Date('2024-01-01T14:30:45')
      const result = localDateToUTC(localDate, 'Europe/Warsaw')
      const utcDate = new Date(result)
      
      expect(utcDate.getUTCHours()).toBe(13)
      expect(utcDate.getUTCMinutes()).toBe(30)
      expect(utcDate.getUTCSeconds()).toBe(45)
    })
  })

  describe('date range functions', () => {
    const TEST_DATE = '2024-01-15T12:00:00Z' // Noon UTC on Jan 15

    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date(TEST_DATE))
    })

    describe('when user is in UTC', () => {
      beforeEach(() => {
        mockGetTimezone.mockReturnValue('UTC')
        mockLanguage.mockReturnValue('en-US')
      })

      it('gets correct date range for last N days', () => {
        const { start, end } = getLastNDaysRange(7)
        expect(start.toISOString()).toBe('2024-01-08T00:00:00.000Z')
        expect(end.toISOString().slice(0, -5)).toBe('2024-01-15T23:59:59')  // ignore milliseconds
      })
    })

    describe('when user is in UTC+1', () => {
      beforeEach(() => {
        mockGetTimezone.mockReturnValue('Europe/Warsaw')
        mockLanguage.mockReturnValue('en-US')
      })

      it('gets correct date range for last N days in user timezone', () => {
        const { start, end } = getLastNDaysRange(7)
        expect(start.toISOString()).toBe('2024-01-07T23:00:00.000Z')
        expect(end.toISOString().slice(0, -5)).toBe('2024-01-15T22:59:59')  // ignore milliseconds
      })
    })

    describe('when user is in UTC-5', () => {
      beforeEach(() => {
        mockGetTimezone.mockReturnValue('America/New_York')
        mockLanguage.mockReturnValue('en-US')
      })

      it('gets correct date range for last N days in user timezone', () => {
        const { start, end } = getLastNDaysRange(7)
        expect(start.toISOString()).toBe('2024-01-08T05:00:00.000Z')
        expect(end.toISOString().slice(0, -5)).toBe('2024-01-16T04:59:59')  // ignore milliseconds
      })
    })
  })

  describe('formatting functions', () => {
    beforeEach(() => {
      mockGetTimezone.mockReturnValue('Europe/Warsaw')
    })

    it('formats date time according to user locale', () => {
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        get: () => 'en-GB'
      })

      const date = new Date('2024-01-01T14:30:00Z')
      const result = formatDateTime(date)
      
      // This will be timezone dependent, so we check the format rather than exact time
      expect(result).toMatch(/\d{1,2} [A-Za-z]+ \d{4}, \d{1,2}:\d{2}/)
    })

    it('handles ISO string input', () => {
      const result = toUserLocaleDateString('2024-01-01T14:30:00Z')
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })
  })

  describe('isDateInRange', () => {
    const TEST_DATE = '2024-01-15T12:00:00Z'
    
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date(TEST_DATE))
    })

    describe('when user is in UTC', () => {
      beforeEach(() => {
        mockGetTimezone.mockReturnValue('UTC')
        mockLanguage.mockReturnValue('en-US')
      })

      it('correctly identifies dates within range', () => {
        const { start, end } = getLastNDaysRange(7)
        
        // Middle of range
        expect(isDateInRange(new Date('2024-01-10T12:00:00Z'), start, end)).toBe(true)
        // Start of range
        expect(isDateInRange(new Date('2024-01-08T00:00:00Z'), start, end)).toBe(true)
        // End of range
        expect(isDateInRange(new Date('2024-01-15T23:59:59Z'), start, end)).toBe(true)
        
        // Before range
        expect(isDateInRange(new Date('2024-01-07T23:59:59Z'), start, end)).toBe(false)
        // After range
        expect(isDateInRange(new Date('2024-01-16T00:00:00Z'), start, end)).toBe(false)
      })
    })

    describe('when user is in UTC+1', () => {
      beforeEach(() => {
        mockGetTimezone.mockReturnValue('Europe/Warsaw')
        mockLanguage.mockReturnValue('en-US')
      })

      it('correctly identifies dates within range in user timezone', () => {
        const { start, end } = getLastNDaysRange(7)
        
        // Middle of range in user's timezone
        expect(isDateInRange(new Date('2024-01-10T13:00:00Z'), start, end)).toBe(true) // 14:00 Warsaw
        // Start of range in user's timezone
        expect(isDateInRange(new Date('2024-01-07T23:00:00Z'), start, end)).toBe(true) // 00:00 Warsaw
        // End of range in user's timezone
        expect(isDateInRange(new Date('2024-01-15T22:59:59Z'), start, end)).toBe(true) // 23:59:59 Warsaw
        
        // Just before range in user's timezone
        expect(isDateInRange(new Date('2024-01-07T22:59:59Z'), start, end)).toBe(false) // 23:59:59 day before
        // Just after range in user's timezone
        expect(isDateInRange(new Date('2024-01-15T23:00:00Z'), start, end)).toBe(false) // 00:00 next day
      })
    })

    describe('when user is in UTC-5', () => {
      beforeEach(() => {
        mockGetTimezone.mockReturnValue('America/New_York')
        mockLanguage.mockReturnValue('en-US')
      })

      it('correctly identifies dates within range in user timezone', () => {
        const { start, end } = getLastNDaysRange(7)
        
        // Middle of range in user's timezone
        expect(isDateInRange(new Date('2024-01-10T17:00:00Z'), start, end)).toBe(true) // 12:00 NY
        // Start of range in user's timezone
        expect(isDateInRange(new Date('2024-01-08T05:00:00Z'), start, end)).toBe(true) // 00:00 NY
        // End of range in user's timezone
        expect(isDateInRange(new Date('2024-01-16T04:59:59Z'), start, end)).toBe(true) // 23:59:59 NY
        
        // Just before range in user's timezone
        expect(isDateInRange(new Date('2024-01-08T04:59:59Z'), start, end)).toBe(false) // 23:59:59 day before
        // Just after range in user's timezone
        expect(isDateInRange(new Date('2024-01-16T05:00:00Z'), start, end)).toBe(false) // 00:00 next day
      })
    })

    it('handles ISO string input', () => {
      mockGetTimezone.mockReturnValue('UTC')
      const { start, end } = getLastNDaysRange(7)
      
      expect(isDateInRange('2024-01-10T12:00:00Z', start, end)).toBe(true)
      expect(isDateInRange('2024-01-01T12:00:00Z', start, end)).toBe(false)
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
}) 