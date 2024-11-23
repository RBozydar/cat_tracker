import '@testing-library/jest-dom'
import fetch, { Request, Response } from 'node-fetch'

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
global.fetch = fetch as unknown as typeof global.fetch
global.Request = Request as unknown as typeof global.Request
global.Response = Response as unknown as typeof global.Response 