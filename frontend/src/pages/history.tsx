/**
 * History / analysis page (desktop-first, renders sanely at 375 pt).
 *
 * A shared range (default: last 30 days, household-local) drives a per-cat
 * tabbed view and the multi-cat comparison. Each cat tab pulls ONE
 * `reports/range` payload; only the active tab is mounted, so exactly one
 * range call is in flight per view.
 */
import { useState } from 'react'
import { useCats, useSettings } from '@/api/hooks'
import { ComparisonSection } from '@/components/history/comparison-section'
import { CatHistory } from '@/components/history/cat-history'
import {
  DEFAULT_PRESET,
  matchingPreset,
  presetRange,
  type DateRange,
  type RangePreset,
} from '@/components/history/date-range'
import { DateRangePicker } from '@/components/history/date-range-picker'
import { ChartSkeleton } from '@/components/history/section-card'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { todayInHouseholdTz } from '@/lib/format'

/**
 * The user's choice of range, not the resolved dates. A tracked preset is
 * recomputed from "today" on every render, so it self-corrects the moment
 * the household timezone resolves instead of freezing a UTC-based guess; a
 * custom range is stored verbatim since the user picked those exact dates.
 */
type RangeSelection = { kind: 'preset'; days: RangePreset } | { kind: 'custom'; range: DateRange }

export default function HistoryPage() {
  const cats = useCats()
  const settings = useSettings()
  // Falls back to UTC until settings load, same as the weekly summary — the
  // API only understands household-local dates, never the viewer's browser tz.
  // The RangeSelection below re-derives `range` from `today` every render, so
  // this fallback self-corrects once the real timezone arrives rather than
  // freezing a wrong default; report/comparison fetches are additionally
  // gated on `settings.isSuccess` so they never fire against the guess.
  const timezone = settings.data?.timezone ?? 'UTC'
  const today = todayInHouseholdTz(timezone)

  const [selection, setSelection] = useState<RangeSelection>({
    kind: 'preset',
    days: DEFAULT_PRESET,
  })
  const range = selection.kind === 'preset' ? presetRange(selection.days, today) : selection.range

  function handleRangeChange(next: DateRange) {
    const preset = matchingPreset(next, today)
    setSelection(preset !== null ? { kind: 'preset', days: preset } : { kind: 'custom', range: next })
  }

  const [selectedCatId, setSelectedCatId] = useState<string | undefined>(undefined)

  const firstCat = cats.data?.[0]
  const activeCatId = selectedCatId ?? (firstCat ? String(firstCat.id) : undefined)

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Calorie trends, meal timing, portions, and weight over a date range.
          </p>
        </div>
        <DateRangePicker value={range} onChange={handleRangeChange} today={today} />
      </div>

      {settings.isError ? (
        // Report/comparison fetches below stay gated on `settings.isSuccess` and
        // would otherwise spin forever with no explanation.
        <Card>
          <CardContent className="py-4 text-sm text-destructive">
            {settings.error.message}
          </CardContent>
        </Card>
      ) : null}

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
                enabled={activeCatId === String(cat.id) && settings.isSuccess}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <ComparisonSection range={range} enabled={settings.isSuccess} />
    </section>
  )
}
