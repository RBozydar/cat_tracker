import { Route, Routes } from 'react-router'
import { AppShell } from '@/components/app-shell'
import DashboardPage from '@/pages/dashboard'
import HistoryPage from '@/pages/history'
import SettingsPage from '@/pages/settings'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
