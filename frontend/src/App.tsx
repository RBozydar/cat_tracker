import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { AppShell } from '@/components/app-shell'
import DashboardPage from '@/pages/dashboard'
import SettingsPage from '@/pages/settings'

// History carries the chart bundle (Recharts) — lazy-load it so the mobile-first
// Dashboard's initial download stays lean.
const HistoryPage = lazy(() => import('@/pages/history'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route
          path="history"
          element={
            <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>}>
              <HistoryPage />
            </Suspense>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
