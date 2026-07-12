import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createQueryClient } from '@/api/query-client'
import { Toaster } from '@/components/ui/sonner'

/** Render with the app's real providers (query client + toaster). */
export function renderWithProviders(ui: ReactNode) {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
      <Toaster />
    </QueryClientProvider>,
  )
}
