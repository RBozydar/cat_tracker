/**
 * The dashboard's primary control: pick a cat, then re-log a routine meal in one
 * more tap (+ confirm) or fill the compact manual form. A routine wet-food meal
 * is two taps plus a confirm — the money path for standing at the food bowl.
 *
 * Kept at the top of the page; the today-status cards below are compact enough
 * that the whole entry UI stays in the one-handed thumb zone at 375×812.
 */
import { useState } from 'react'
import { useCats, useFoods } from '@/api/hooks'
import type { Cat, Food } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ManualLogForm } from './manual-log-form'
import { SuggestionChips } from './suggestion-chips'

function CatChipRow({
  cats,
  selectedId,
  onSelect,
}: {
  cats: Cat[]
  selectedId: number | null
  onSelect: (id: number | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {cats.map((cat) => {
        const selected = cat.id === selectedId
        return (
          <Button
            key={cat.id}
            type="button"
            variant={selected ? 'default' : 'outline'}
            aria-pressed={selected}
            className={cn('h-11 flex-1 basis-[28%]')}
            onClick={() => onSelect(selected ? null : cat.id)}
          >
            {cat.name}
          </Button>
        )
      })}
    </div>
  )
}

function CatQuickLog({ cat, foods }: { cat: Cat; foods: Food[] }) {
  return (
    <div className="grid gap-4 border-t pt-4">
      <SuggestionChips cat={cat} />
      <ManualLogForm cat={cat} foods={foods} />
    </div>
  )
}

export function QuickLogCard() {
  const cats = useCats()
  const foods = useFoods(false)
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null)

  const selectedCat = cats.data?.find((cat) => cat.id === selectedCatId) ?? null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log a meal</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {cats.isPending ? (
          <p className="text-sm text-muted-foreground">Loading cats…</p>
        ) : cats.isError ? (
          <p className="text-sm text-destructive">{cats.error.message}</p>
        ) : (
          <>
            <CatChipRow cats={cats.data} selectedId={selectedCatId} onSelect={setSelectedCatId} />
            {selectedCat ? (
              // A failed/pending foods query is not "no foods" — collapsing it to
              // [] would render the empty-library setup message and hide that
              // logging is actually blocked by a request problem.
              foods.isError ? (
                <p className="border-t pt-4 text-sm text-destructive">{foods.error.message}</p>
              ) : foods.isPending ? (
                <p className="border-t pt-4 text-sm text-muted-foreground">Loading foods…</p>
              ) : (
                <CatQuickLog key={selectedCat.id} cat={selectedCat} foods={foods.data} />
              )
            ) : (
              <p className="text-sm text-muted-foreground">Pick a cat to log a meal.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
