import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { useTargetSuggestion, useUpdateCat } from '@/api/hooks'
import type { Cat } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatKcal, formatKg } from '@/lib/format'

interface TargetCalculatorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cat: Cat
}

/**
 * RER/MER target calculator. Fetches `GET /api/target-suggestion?cat_id=` while
 * open, shows the formula breakdown, and offers Apply → `PATCH target_kcal`.
 * The suggestion is never auto-applied (spec).
 */
export function TargetCalculatorDialog({ open, onOpenChange, cat }: TargetCalculatorDialogProps) {
  const suggestion = useTargetSuggestion(cat.id, open)
  const updateCat = useUpdateCat()

  function apply() {
    const data = suggestion.data
    if (!data) return
    updateCat.mutate(
      { id: cat.id, body: { target_kcal: data.suggested_target_kcal } },
      {
        onSuccess: () => {
          toast.success(`Target for ${cat.name} set to ${formatKcal(data.suggested_target_kcal)}`)
          onOpenChange(false)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  const noData = suggestion.error instanceof ApiError && suggestion.error.status === 400

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suggested target for {cat.name}</DialogTitle>
          <DialogDescription>
            Veterinary formula: RER = 70 × kg^0.75, scaled by a weight-loss or maintenance
            factor. Always a suggestion — the stored target stays editable.
          </DialogDescription>
        </DialogHeader>

        {suggestion.isPending && open ? (
          <p className="py-4 text-sm text-muted-foreground">Calculating…</p>
        ) : noData ? (
          <p className="py-4 text-sm text-muted-foreground" role="alert">
            There is nothing to calculate from yet — add a weigh-in or set a goal weight for{' '}
            {cat.name} first.
          </p>
        ) : suggestion.isError ? (
          <p className="py-4 text-sm text-destructive" role="alert">
            {suggestion.error.message}
          </p>
        ) : suggestion.data ? (
          <dl className="grid gap-2 py-2 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Based on</dt>
              <dd className="font-medium">
                {suggestion.data.basis === 'GOAL_WEIGHT'
                  ? `Goal weight ${formatKg(suggestion.data.goal_weight_kg ?? 0)}`
                  : `Current weight ${formatKg(suggestion.data.current_weight_kg ?? 0)}`}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">RER (70 × kg^0.75)</dt>
              <dd className="font-medium">{formatKcal(suggestion.data.rer_kcal)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Factor</dt>
              <dd className="font-medium">
                × {suggestion.data.factor}{' '}
                {suggestion.data.basis === 'GOAL_WEIGHT' ? '(weight loss)' : '(maintenance)'}
              </dd>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-4 border-t pt-3">
              <dt className="font-medium">Suggested daily target</dt>
              <dd className="text-base font-semibold">
                {formatKcal(suggestion.data.suggested_target_kcal)}
              </dd>
            </div>
            <p className="text-xs text-muted-foreground">
              Current target: {formatKcal(cat.target_kcal)}
            </p>
          </dl>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            onClick={apply}
            disabled={!suggestion.data || updateCat.isPending}
          >
            Apply suggestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
