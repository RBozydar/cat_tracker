import { createContext, useContext } from 'react'

type TimezoneContextType = {
  timezone: string
  locale: string
}

const TimezoneContext = createContext<TimezoneContextType>({
  timezone: 'UTC',
  locale: 'en-US'
})

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const value = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language || 'en-US'
  }
  
  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  )
}

export const useTimezone = () => useContext(TimezoneContext) 