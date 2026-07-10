import { Link } from 'react-router'
import { useCats } from '@/api/hooks'
import { QuickLogCard } from '@/components/dashboard/quick-log-card'
import { RecentMeals } from '@/components/dashboard/recent-meals'
import { TodayStatus } from '@/components/dashboard/today-status'
import { WeeklySummary } from '@/components/dashboard/weekly-summary'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/** No cats yet: the whole dashboard degrades to a pointer at Settings. */
function EmptyDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to Cat Tracker</CardTitle>
        <CardDescription>
          Add your cats and foods in Settings, then come back here to log meals and track
          today&apos;s calories.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/settings">Go to Settings</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const cats = useCats()

  if (cats.isSuccess && cats.data.length === 0) {
    return (
      <section className="grid gap-4">
        <h1 className="sr-only">Dashboard</h1>
        <EmptyDashboard />
      </section>
    )
  }

  return (
    <section className="grid gap-4">
      <h1 className="sr-only">Dashboard</h1>
      <QuickLogCard />
      <TodayStatus />
      <RecentMeals />
      <WeeklySummary />
    </section>
  )
}
