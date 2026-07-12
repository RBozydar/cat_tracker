import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useCreateCat, useFoods, useUpdateCat } from '@/api/hooks'
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
import { parsePositiveNumber } from '@/lib/format'

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
  const [goalWeight, setGoalWeight] = useState('')
  const [initialWeight, setInitialWeight] = useState('')
  const [wetFoodId, setWetFoodId] = useState(NONE)
  const [dryFoodId, setDryFoodId] = useState(NONE)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(cat?.name ?? '')
    setTargetKcal(cat ? String(cat.target_kcal) : '')
    setGoalWeight(cat?.goal_weight_kg != null ? String(cat.goal_weight_kg) : '')
    setInitialWeight('')
    setWetFoodId(cat?.default_wet_food_id != null ? String(cat.default_wet_food_id) : NONE)
    setDryFoodId(cat?.default_dry_food_id != null ? String(cat.default_dry_food_id) : NONE)
    setError(null)
  }, [open, cat])

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
      },
      { onSuccess, onError },
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
              : 'The daily calorie target can be refined later with the calculator.'}
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
                onChange={(event) => setTargetKcal(event.target.value)}
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

          {cat ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cat-wet-food">Default wet food</Label>
                <Select value={wetFoodId} onValueChange={setWetFoodId}>
                  <SelectTrigger id="cat-wet-food" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {foodOptions('WET').map((food) => (
                      <SelectItem key={food.id} value={String(food.id)}>
                        {food.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cat-dry-food">Default dry food</Label>
                <Select value={dryFoodId} onValueChange={setDryFoodId}>
                  <SelectTrigger id="cat-dry-food" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {foodOptions('DRY').map((food) => (
                      <SelectItem key={food.id} value={String(food.id)}>
                        {food.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
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
