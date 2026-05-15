import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { NavMenu } from '@/components/nav-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { Toaster } from '@/components/ui/toaster'
import { MealProvider, MealErrorBoundary } from '@/contexts/meal-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cat Tracker',
  description: 'Track your cats\' meals and calories',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <MealErrorBoundary>
          <MealProvider>
            {children}
          </MealProvider>
        </MealErrorBoundary>
      </body>
    </html>
  )
}
