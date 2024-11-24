import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { NavMenu } from '@/components/nav-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { Toaster } from '@/components/ui/toaster'
import { MealProvider } from '@/contexts/meal-context'

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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MealProvider>
            <div className="min-h-screen flex flex-col">
              <header className="border-b">
                <div className="container mx-auto py-4 flex items-center justify-between">
                  <NavMenu />
                  <ThemeToggle />
                </div>
              </header>
              {children}
            </div>
          </MealProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
