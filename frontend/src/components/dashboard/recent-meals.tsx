/**
 * Newest-first list of recently logged meals (GET /meals?limit=20). Each row
 * shows household-local time, cat, food, quantity, and kcal; tapping opens the
 * edit/delete bottom sheet. Cat names come from the cats cache (meal payloads
 * carry only `cat_id`); the timezone comes from settings.
 */
import { useState } from 'react'
import { useCats, useMeals, useSettings } from '@/api/hooks'
import type { Meal } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKcal, formatMealDay, formatMealTime, formatQuantity } from '@/lib/format'
import { MealDetailSheet } from './meal-detail-sheet'

const RECENT_LIMIT = 20

export function RecentMeals() {
  const meals = useMeals({ limit: RECENT_LIMIT })
  const cats = useCats()
  const settings = useSettings()
  const [active, setActive] = useState<Meal | null>(null)

  const timezone = settings.data?.timezone ?? 'UTC'
  const catName = (id: number) => cats.data?.find((cat) => cat.id === id)?.name ?? `Cat #${id}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent meals</CardTitle>
      </CardHeader>
      <CardContent>
        {meals.isPending ? (
          <p className="py-4 text-sm text-muted-foreground">Loading meals…</p>
        ) : meals.isError ? (
          <p className="py-4 text-sm text-destructive">{meals.error.message}</p>
        ) : meals.data.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No meals logged yet. Log one above to see it here.
          </p>
        ) : (
          <ul className="-mx-2 divide-y divide-border">
            {meals.data.map((meal) => (
              <li key={meal.id}>
                <button
                  type="button"
                  onClick={() => setActive(meal)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{meal.food_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {catName(meal.cat_id)} · {formatQuantity(meal.quantity, meal.basis)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm tabular-nums">{formatKcal(meal.kcal)}</span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {formatMealDay(meal.fed_at, timezone)} {formatMealTime(meal.fed_at, timezone)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {active ? (
        <MealDetailSheet
          key={active.id}
          meal={active}
          timezone={timezone}
          onClose={() => setActive(null)}
        />
      ) : null}
    </Card>
  )
}
