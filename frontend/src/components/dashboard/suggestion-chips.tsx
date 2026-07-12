/**
 * Fast re-log chips for the selected cat (GET /meals/suggestions).
 *
 * Each chip is a recent (food, quantity) combo priced at the food's *current*
 * kcal (a proposal — the POST re-snapshots server-side). Tapping opens a
 * lightweight confirm, then POSTs `{cat_id, food_id, quantity}`. With no
 * suggestions the row is hidden entirely, per spec.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { useCreateMeal, useMealSuggestions } from '@/api/hooks'
import type { Cat, MealSuggestion } from '@/api/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { formatKcal, formatQuantity } from '@/lib/format'

function suggestionLabel(suggestion: MealSuggestion): string {
  return `${formatQuantity(suggestion.quantity, suggestion.basis)} ${suggestion.food_name}`
}

export function SuggestionChips({ cat }: { cat: Cat }) {
  const suggestions = useMealSuggestions(cat.id, true)
  const createMeal = useCreateMeal()
  const [pending, setPending] = useState<MealSuggestion | null>(null)

  if (suggestions.isPending) {
    return <p className="text-sm text-muted-foreground">Loading quick re-log…</p>
  }
  // Hide the row entirely on error or when the cat has nothing to re-log.
  if (suggestions.isError || suggestions.data.length === 0) {
    return null
  }

  function confirmLog(suggestion: MealSuggestion) {
    createMeal.mutate(
      { cat_id: cat.id, food_id: suggestion.food_id, quantity: suggestion.quantity },
      {
        onSuccess: () => {
          toast.success(`Logged ${suggestionLabel(suggestion)} for ${cat.name}`)
          setPending(null)
        },
        onError: (err) => {
          toast.error(err.message)
          setPending(null)
        },
      },
    )
  }

  return (
    <div className="grid gap-2">
      <p className="text-xs font-medium text-muted-foreground">Quick re-log</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.data.map((suggestion, index) => (
          <Button
            key={`${suggestion.food_id}-${suggestion.quantity}-${index}`}
            type="button"
            variant="outline"
            className="h-11 max-w-full"
            onClick={() => setPending(suggestion)}
          >
            <span className="truncate">
              {suggestionLabel(suggestion)} · {formatKcal(suggestion.kcal)}
            </span>
          </Button>
        ))}
      </div>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Log this meal?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `${suggestionLabel(pending)} · ${formatKcal(pending.kcal)} for ${cat.name}`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={createMeal.isPending}
              onClick={(event) => {
                event.preventDefault()
                if (pending) confirmLog(pending)
              }}
            >
              Log meal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
