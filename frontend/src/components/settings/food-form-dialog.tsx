import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useCreateFood, useUpdateFood } from '@/api/hooks'
import type { CalorieBasis, Food, FoodType } from '@/api/types'
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

const FOOD_TYPE_LABELS: Record<FoodType, string> = {
  WET: 'Wet',
  DRY: 'Dry',
  TREAT: 'Treat',
}

const BASIS_LABELS: Record<CalorieBasis, string> = {
  PER_100G: 'per 100 g',
  PER_PIECE: 'per piece',
}

interface FoodFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the dialog edits this food (type is immutable → not editable). */
  food?: Food
}

export function FoodFormDialog({ open, onOpenChange, food }: FoodFormDialogProps) {
  const createFood = useCreateFood()
  const updateFood = useUpdateFood()

  const [name, setName] = useState('')
  const [type, setType] = useState<FoodType>('WET')
  const [basis, setBasis] = useState<CalorieBasis>('PER_100G')
  const [kcal, setKcal] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Re-seed the form whenever the dialog opens (create: blank; edit: current values).
  useEffect(() => {
    if (!open) return
    setName(food?.name ?? '')
    setType(food?.type ?? 'WET')
    setBasis(food?.calorie_basis ?? 'PER_100G')
    setKcal(food ? String(food.kcal_per_basis) : '')
    setError(null)
  }, [open, food])

  const pending = createFood.isPending || updateFood.isPending

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmedName = name.trim()
    const kcalValue = parsePositiveNumber(kcal)
    if (!trimmedName) {
      setError('Name is required.')
      return
    }
    if (kcalValue === null) {
      setError('Calories must be a positive number.')
      return
    }

    const onSuccess = () => {
      toast.success(food ? `${trimmedName} updated` : `${trimmedName} added`)
      onOpenChange(false)
    }
    const onError = (err: Error) => setError(err.message)

    if (food) {
      updateFood.mutate(
        { id: food.id, body: { name: trimmedName, calorie_basis: basis, kcal_per_basis: kcalValue } },
        { onSuccess, onError },
      )
    } else {
      createFood.mutate(
        { name: trimmedName, type, calorie_basis: basis, kcal_per_basis: kcalValue },
        { onSuccess, onError },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{food ? `Edit ${food.name}` : 'Add food'}</DialogTitle>
          <DialogDescription>
            {food
              ? 'Type is fixed after creation. Calorie edits never change already-logged meals.'
              : 'Add a food to the library so it can be logged as a meal.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="food-name">Name</Label>
            <Input
              id="food-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Feringa Chicken"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="food-type">Type</Label>
              {food ? (
                <p id="food-type" className="flex h-8 items-center text-sm text-muted-foreground">
                  {FOOD_TYPE_LABELS[food.type]} (fixed)
                </p>
              ) : (
                <Select value={type} onValueChange={(value) => setType(value as FoodType)}>
                  <SelectTrigger id="food-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FOOD_TYPE_LABELS) as FoodType[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {FOOD_TYPE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="food-basis">Calorie basis</Label>
              <Select value={basis} onValueChange={(value) => setBasis(value as CalorieBasis)}>
                <SelectTrigger id="food-basis" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(BASIS_LABELS) as CalorieBasis[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {BASIS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="food-kcal">
              {basis === 'PER_100G' ? 'kcal per 100 g' : 'kcal per piece'}
            </Label>
            <Input
              id="food-kcal"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={kcal}
              onChange={(event) => setKcal(event.target.value)}
              required
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {food ? 'Save changes' : 'Add food'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { BASIS_LABELS, FOOD_TYPE_LABELS }
