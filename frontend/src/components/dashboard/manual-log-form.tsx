/**
 * Compact manual meal entry for the selected cat.
 *
 * Food defaults to the cat's default wet food (then dry, then the first library
 * food); the quantity keyboard switches to numeric for per-piece foods. Saving
 * POSTs `{cat_id, food_id, quantity}` with no `fed_at`, so the server stamps the
 * current instant. When the library is empty there is nothing to log — the form
 * points at Settings instead.
 */
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { useCreateMeal } from '@/api/hooks'
import type { Cat, Food } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatQuantity, parsePositiveNumber } from '@/lib/format'

function defaultFoodId(cat: Cat, foods: Food[]): string {
  const preferred = cat.default_wet_food_id ?? cat.default_dry_food_id ?? foods[0]?.id
  return preferred != null ? String(preferred) : ''
}

interface ManualLogFormProps {
  cat: Cat
  foods: Food[]
}

export function ManualLogForm({ cat, foods }: ManualLogFormProps) {
  const createMeal = useCreateMeal()
  const [foodId, setFoodId] = useState(() => defaultFoodId(cat, foods))
  const [quantity, setQuantity] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (foods.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No foods yet.{' '}
        <Link to="/settings" className="underline underline-offset-4 hover:text-foreground">
          Add foods in Settings
        </Link>{' '}
        to log a meal.
      </p>
    )
  }

  const selectedFood = foods.find((food) => String(food.id) === foodId)
  const perPiece = selectedFood?.calorie_basis === 'PER_PIECE'

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const quantityValue = parsePositiveNumber(quantity)
    if (!selectedFood) {
      setError('Pick a food to log.')
      return
    }
    if (quantityValue === null) {
      setError(perPiece ? 'Enter a positive number of pieces.' : 'Enter a positive weight in grams.')
      return
    }

    createMeal.mutate(
      { cat_id: cat.id, food_id: selectedFood.id, quantity: quantityValue },
      {
        onSuccess: () => {
          toast.success(
            `Logged ${formatQuantity(quantityValue, selectedFood.calorie_basis)} ${selectedFood.name} for ${cat.name}`,
          )
          setQuantity('')
          setError(null)
        },
        onError: (err) => setError(err.message),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="manual-food">Food</Label>
        <Select
          value={foodId}
          onValueChange={(value) => {
            setFoodId(value)
            setError(null)
          }}
        >
          <SelectTrigger id="manual-food" className="h-11 w-full">
            <SelectValue placeholder="Select a food" />
          </SelectTrigger>
          <SelectContent>
            {foods.map((food) => (
              <SelectItem key={food.id} value={String(food.id)}>
                {food.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="manual-quantity">{perPiece ? 'Pieces' : 'Grams'}</Label>
        <div className="flex gap-2">
          <Input
            id="manual-quantity"
            className="h-11"
            type="number"
            inputMode={perPiece ? 'numeric' : 'decimal'}
            min="0"
            step="any"
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value)
              setError(null)
            }}
            placeholder={perPiece ? 'e.g. 1' : 'e.g. 30'}
            required
          />
          <Button type="submit" className="h-11 px-5" disabled={createMeal.isPending}>
            Log
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  )
}
