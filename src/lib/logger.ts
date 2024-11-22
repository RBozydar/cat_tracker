type LogArgs = string | number | object | Error | unknown

const logger = {
  info: (...args: LogArgs[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(new Date().toISOString(), '- INFO -', ...args)
    }
  },
  error: (...args: LogArgs[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(new Date().toISOString(), '- ERROR -', ...args)
    }
  }
}

export { logger } 