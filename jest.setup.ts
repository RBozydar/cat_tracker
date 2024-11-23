import '@testing-library/jest-dom'

// Mock timezone for consistent testing
class MockIntl {
  static DateTimeFormat() {
    return {
      resolvedOptions: () => ({
        timeZone: 'UTC'
      })
    }
  }
}

global.Intl = MockIntl as any 