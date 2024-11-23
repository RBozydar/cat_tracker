import { logger } from '../logger'

describe('logger', () => {
  const originalConsole = { ...console }
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    console.log = jest.fn()
    console.error = jest.fn()
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      configurable: true
    })
  })

  afterEach(() => {
    console.log = originalConsole.log
    console.error = originalConsole.error
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true
    })
  })

  it('logs info messages in non-production', () => {
    logger.info('test message', { additional: 'data' })
    expect(console.log).toHaveBeenCalledWith(
      expect.any(String),
      '- INFO -',
      'test message',
      { additional: 'data' }
    )
  })

  it('logs error messages in non-production', () => {
    const error = new Error('test error')
    logger.error('Error occurred:', error)
    expect(console.error).toHaveBeenCalledWith(
      expect.any(String),
      '- ERROR -',
      'Error occurred:',
      error
    )
  })

  it('does not log in production', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production' })
    logger.info('test message')
    logger.error('test error')
    expect(console.log).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })
}) 