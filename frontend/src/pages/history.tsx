/**
 * History / analysis page (desktop-first, renders sanely at 375 pt).
 *
 * A shared range (default: last 30 days, LOCAL) drives a per-cat tabbed view and
 * the multi-cat comparison. Each cat tab pulls ONE `reports/range` payload; only
 * the active tab is mounted, so exactly one range call is in flight per view.
 */
import { useState } from 'react'
import { useCats } from '@/api/hooks'
import { ComparisonSection } from '@/components/history/comparison-section'
import { CatHistory } from '@/components/history/cat-history'
import { DEFAULT_PRESET, presetRange, type DateRange } from '@/components/history/date-range'
import { DateRangePicker } from '@/components/history/date-range-picker'
import { ChartSkeleton } from '@/components/history/section-card'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function HistoryPage() {
  const cats = useCats()
  const [range, setRange] = useState<DateRange>(() => presetRange(DEFAULT_PRESET))
  const [selectedCatId, setSelectedCatId] = useState<string | undefined>(undefined)

  const activeCatId =
    selectedCatId ?? (cats.data && cats.data.length > 0 ? String(cats.data[0].id) : undefined)

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Calorie trends, meal timing, portions, and weight over a date range.
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {cats.isPending ? (
        <Card>
          <CardContent className="py-6">
            <ChartSkeleton />
          </CardContent>
        </Card>
      ) : cats.isError ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-destructive">
            {cats.error.message}
          </CardContent>
        </Card>
      ) : cats.data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No cats yet. Add cats in Settings to see their history.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeCatId} onValueChange={setSelectedCatId} className="gap-6">
          <TabsList>
            {cats.data.map((cat) => (
              <TabsTrigger key={cat.id} value={String(cat.id)}>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {cats.data.map((cat) => (
            <TabsContent key={cat.id} value={String(cat.id)}>
              <CatHistory
                cat={cat}
                range={range}
                enabled={activeCatId === String(cat.id)}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <ComparisonSection range={range} />
    </section>
  )
}
