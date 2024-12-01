import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { NavMenu } from '@/components/nav-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { Toaster } from '@/components/ui/toaster'

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
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="border-b">
              <div className="container mx-auto py-4 px-4 flex items-center justify-between">
                <NavMenu />
                <ThemeToggle />
              </div>
            </header>
            <main className="container mx-auto px-4 py-6 flex-1">
              {children}
            </main>
          </div>
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
