/**
 * Bottom-sheet editor for a logged meal: edit cat / food / quantity / date /
 * time, or delete (with a confirm).
 *
 * Time handling is the load-bearing part. `fed_at` is a tz-aware UTC instant;
 * the sheet renders it as household wall-clock (via the settings timezone) and,
 * on save, re-interprets the edited date+time as household wall-clock and
 * converts back to a UTC instant for the PATCH. The API never sees a timezone.
 * The PATCH re-snapshots kcal only when food or quantity changed, so a
 * date/time-only edit keeps the original calorie snapshot.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { useCats, useDeleteMeal, useFoods, useUpdateMeal } from '@/api/hooks'
import type { Meal } from '@/api/types'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { parsePositiveNumber, wallClockToUtcISO, zonedWallClock } from '@/lib/format'

// Anchor the dialog to the bottom of the viewport on phones (a thumb-reachable
// sheet), reverting to a centered modal from the `sm` breakpoint up.
const SHEET_CLASS =
  'top-auto bottom-0 left-0 max-h-[85svh] max-w-full translate-x-0 translate-y-0 ' +
  'overflow-y-auto rounded-t-2xl rounded-b-none sm:top-1/2 sm:bottom-auto sm:left-1/2 ' +
  'sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl'

interface MealDetailSheetProps {
  meal: Meal
  timezone: string
  onClose: () => void
}

export function MealDetailSheet({ meal, timezone, onClose }: MealDetailSheetProps) {
  const cats = useCats()
  const foods = useFoods(false)
  const updateMeal = useUpdateMeal()
  const deleteMeal = useDeleteMeal()

  const initial = zonedWallClock(meal.fed_at, timezone)
  const [catId, setCatId] = useState(String(meal.cat_id))
  const [foodId, setFoodId] = useState(String(meal.food_id))
  const [quantity, setQuantity] = useState(String(meal.quantity))
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const foodOptions = foods.data ?? []
  const selectedFood = foodOptions.find((food) => String(food.id) === foodId)
  const perPiece = selectedFood?.calorie_basis === 'PER_PIECE'

  function handleSave(event: React.FormEvent) {
    event.preventDefault()
    const quantityValue = parsePositiveNumber(quantity)
    if (quantityValue === null) {
      setError('Quantity must be a positive number.')
      return
    }
    if (!date || !time) {
      setError('A date and time are required.')
      return
    }

    updateMeal.mutate(
      {
        id: meal.id,
        body: {
          cat_id: Number(catId),
          food_id: Number(foodId),
          quantity: quantityValue,
          fed_at: wallClockToUtcISO(date, time, timezone),
        },
      },
      {
        onSuccess: () => {
          toast.success('Meal updated')
          onClose()
        },
        onError: (err) => setError(err.message),
      },
    )
  }

  function handleDelete() {
    deleteMeal.mutate(meal.id, {
      onSuccess: () => {
        toast.success('Meal deleted')
        onClose()
      },
      onError: (err) => {
        toast.error(err.message)
        setConfirmDelete(false)
      },
    })
  }

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className={SHEET_CLASS}>
        <DialogHeader>
          <DialogTitle>Edit meal</DialogTitle>
          <DialogDescription>
            Times are in the household timezone ({timezone}). Changing the food or quantity
            re-snapshots calories; editing only the date or time keeps the original.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="meal-cat">Cat</Label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger id="meal-cat" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(cats.data ?? []).map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="meal-food">Food</Label>
            <Select value={foodId} onValueChange={setFoodId}>
              <SelectTrigger id="meal-food" className="h-11 w-full">
                <SelectValue placeholder={meal.food_name} />
              </SelectTrigger>
              <SelectContent>
                {foodOptions.map((food) => (
                  <SelectItem key={food.id} value={String(food.id)}>
                    {food.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="meal-quantity">{perPiece ? 'Pieces' : 'Grams'}</Label>
            <Input
              id="meal-quantity"
              className="h-11"
              type="number"
              inputMode={perPiece ? 'numeric' : 'decimal'}
              min="0"
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="meal-date">Date</Label>
              <Input
                id="meal-date"
                className="h-11"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="meal-time">Time</Label>
              <Input
                id="meal-time"
                className="h-11"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
            <Button type="submit" className="h-11 px-5" disabled={updateMeal.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this meal?</AlertDialogTitle>
            <AlertDialogDescription>
              {meal.food_name} will be removed from history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMeal.isPending}
              onClick={(event) => {
                event.preventDefault()
                handleDelete()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
