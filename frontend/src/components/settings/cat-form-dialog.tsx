import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCreateCat, useFoods, useTargetSuggestionByWeight, useUpdateCat } from '@/api/hooks'
import type { Cat, FoodType } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatKcal, formatKg, parsePositiveNumber } from '@/lib/format'

/** Radix Select forbids an empty-string item value; sentinel for “no default food”. */
const NONE = 'none'

interface CatFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the dialog edits this cat (defaults + goal weight become editable). */
  cat?: Cat
}

export function CatFormDialog({ open, onOpenChange, cat }: CatFormDialogProps) {
  const createCat = useCreateCat()
  const updateCat = useUpdateCat()
  // Default-food selects only ever offer non-archived foods of the matching type.
  const foods = useFoods(false)

  const [name, setName] = useState('')
  const [targetKcal, setTargetKcal] = useState('')
  // Tracks whether the user hand-edited the target; once true, the by-weight
  // suggestion stops auto-filling it (manual override wins).
  const [targetTouched, setTargetTouched] = useState(false)
  const [goalWeight, setGoalWeight] = useState('')
  const [initialWeight, setInitialWeight] = useState('')
  const [wetFoodId, setWetFoodId] = useState(NONE)
  const [dryFoodId, setDryFoodId] = useState(NONE)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(cat?.name ?? '')
    setTargetKcal(cat ? String(cat.target_kcal) : '')
    setTargetTouched(false)
    setGoalWeight(cat?.goal_weight_kg != null ? String(cat.goal_weight_kg) : '')
    setInitialWeight('')
    setWetFoodId(cat?.default_wet_food_id != null ? String(cat.default_wet_food_id) : NONE)
    setDryFoodId(cat?.default_dry_food_id != null ? String(cat.default_dry_food_id) : NONE)
    setError(null)
  }, [open, cat])

  // True only on the render where `open` flips to true. The reset effect above
  // clears `initialWeight` on reopen, but effects run after render — without this
  // guard, this render's suggestion query could still fire with the *previous*
  // session's `initialWeight` (and, on a cache hit, synchronously return its
  // cached suggestion), racing the reset and leaving a stale target (see U8).
  // Self-clears every render since `prevOpenRef.current` catches up immediately.
  const prevOpenRef = useRef(open)
  const justOpened = open && !prevOpenRef.current
  prevOpenRef.current = open

  // Onboarding calculator: once a weight is entered (create mode only), fetch the
  // RER/MER suggestion from the entered weight and optional goal weight.
  const weightForSuggestion = cat || justOpened ? null : parsePositiveNumber(initialWeight)
  const goalForSuggestion = goalWeight.trim() === '' ? null : parsePositiveNumber(goalWeight)
  const suggestion = useTargetSuggestionByWeight(weightForSuggestion, goalForSuggestion, open && !cat)
  const suggestedTarget = suggestion.data ? Math.round(suggestion.data.suggested_target_kcal) : null

  // Prefill the target from the suggestion while the user hasn't typed their own —
  // keeps it in sync as they adjust the weight, and clears back to empty once the
  // weight (and so the suggestion) is removed, so a stale calculated target can
  // never be submitted for a weight that's no longer entered.
  useEffect(() => {
    if (cat || targetTouched) return
    setTargetKcal(suggestedTarget !== null ? String(suggestedTarget) : '')
  }, [cat, targetTouched, suggestedTarget])

  const pending = createCat.isPending || updateCat.isPending

  function foodOptions(type: FoodType) {
    return (foods.data ?? []).filter((food) => food.type === type)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmedName = name.trim()
    const target = parsePositiveNumber(targetKcal)
    if (!trimmedName) {
      setError('Name is required.')
      return
    }
    if (target === null) {
      setError('Daily target must be a positive number of kcal.')
      return
    }
    const goal = goalWeight.trim() === '' ? null : parsePositiveNumber(goalWeight)
    if (goal === null && goalWeight.trim() !== '') {
      setError('Goal weight must be a positive number of kg.')
      return
    }

    const onSuccess = () => {
      toast.success(cat ? `${trimmedName} updated` : `${trimmedName} added`)
      onOpenChange(false)
    }
    const onError = (err: Error) => setError(err.message)

    if (cat) {
      updateCat.mutate(
        {
          id: cat.id,
          body: {
            name: trimmedName,
            target_kcal: target,
            goal_weight_kg: goal,
            default_wet_food_id: wetFoodId === NONE ? null : Number(wetFoodId),
            default_dry_food_id: dryFoodId === NONE ? null : Number(dryFoodId),
          },
        },
        { onSuccess, onError },
      )
      return
    }

    const initial = initialWeight.trim() === '' ? null : parsePositiveNumber(initialWeight)
    if (initial === null && initialWeight.trim() !== '') {
      setError('Initial weight must be a positive number of kg.')
      return
    }
    createCat.mutate(
      {
        name: trimmedName,
        target_kcal: target,
        goal_weight_kg: goal,
        initial_weight_kg: initial,
        default_wet_food_id: wetFoodId === NONE ? null : Number(wetFoodId),
        default_dry_food_id: dryFoodId === NONE ? null : Number(dryFoodId),
      },
      { onSuccess, onError },
    )
  }

  function defaultFoodField(
    type: FoodType,
    id: string,
    label: string,
    value: string,
    onValueChange: (value: string) => void,
  ) {
    const options = foodOptions(type)
    return (
      <div className="grid gap-2">
        {options.length === 0 ? (
          <>
            {/* No htmlFor: there's no interactive control to associate with yet. */}
            <Label>{label}</Label>
            <p className="flex min-h-9 items-center text-sm text-muted-foreground">
              Add foods in Settings first
            </p>
          </>
        ) : (
          <>
            <Label htmlFor={id}>{label}</Label>
            <Select value={value} onValueChange={onValueChange}>
              <SelectTrigger id={id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {options.map((food) => (
                  <SelectItem key={food.id} value={String(food.id)}>
                    {food.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cat ? `Edit ${cat.name}` : 'Add cat'}</DialogTitle>
          <DialogDescription>
            {cat
              ? 'Update the daily target, goal weight, and default foods.'
              : 'Enter a weight to get a suggested daily target from the calculator.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Whiskers"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-target">Daily target (kcal)</Label>
              <Input
                id="cat-target"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={targetKcal}
                onChange={(event) => {
                  setTargetKcal(event.target.value)
                  setTargetTouched(true)
                }}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-goal">Goal weight (kg)</Label>
              <Input
                id="cat-goal"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={goalWeight}
                onChange={(event) => setGoalWeight(event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {cat ? null : (
            <div className="grid gap-2">
              <Label htmlFor="cat-initial-weight">Initial weight (kg)</Label>
              <Input
                id="cat-initial-weight"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={initialWeight}
                onChange={(event) => setInitialWeight(event.target.value)}
                placeholder="Optional — creates the first weigh-in"
              />
            </div>
          )}

          {!cat && suggestion.data && suggestedTarget !== null ? (
            <div className="grid gap-2 rounded-md border bg-muted/40 p-3" role="status">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">Suggested target</span>
                <span className="text-base font-semibold">{formatKcal(suggestedTarget)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                RER {formatKcal(suggestion.data.rer_kcal)} × {suggestion.data.factor}{' '}
                {suggestion.data.basis === 'GOAL_WEIGHT' ? '(weight loss)' : '(maintenance)'}, based
                on{' '}
                {suggestion.data.basis === 'GOAL_WEIGHT'
                  ? `goal weight ${formatKg(suggestion.data.goal_weight_kg ?? 0)}`
                  : `weight ${formatKg(suggestion.data.current_weight_kg ?? 0)}`}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-self-start"
                onClick={() => {
                  setTargetKcal(String(suggestedTarget))
                  setTargetTouched(false)
                }}
              >
                Use {formatKcal(suggestedTarget)}
              </Button>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            {defaultFoodField('WET', 'cat-wet-food', 'Default wet food', wetFoodId, setWetFoodId)}
            {defaultFoodField('DRY', 'cat-dry-food', 'Default dry food', dryFoodId, setDryFoodId)}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {cat ? 'Save changes' : 'Add cat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
