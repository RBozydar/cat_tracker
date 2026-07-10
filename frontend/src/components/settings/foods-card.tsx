import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCats, useDeleteFood, useFoods } from '@/api/hooks'
import type { Food } from '@/api/types'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatKcal } from '@/lib/format'
import { BASIS_LABELS, FOOD_TYPE_LABELS, FoodFormDialog } from './food-form-dialog'

export function FoodsCard() {
  const [includeArchived, setIncludeArchived] = useState(false)
  const foods = useFoods(includeArchived)
  const cats = useCats()
  const deleteFood = useDeleteFood()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Food | undefined>(undefined)
  const [deleting, setDeleting] = useState<Food | undefined>(undefined)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(food: Food) {
    setEditing(food)
    setFormOpen(true)
  }

  function confirmDelete(food: Food) {
    deleteFood.mutate(food.id, {
      onSuccess: (result) => {
        const clearedNames = result.cleared_default_for_cat_ids.map(
          (id) => cats.data?.find((cat) => cat.id === id)?.name ?? `cat #${id}`,
        )
        const clearedNote =
          clearedNames.length > 0
            ? `No longer the default food for ${clearedNames.join(', ')}.`
            : undefined

        if (result.archived) {
          toast.warning(`${food.name} was archived because meals reference it`, {
            description: clearedNote ?? 'Its logged meals keep their history.',
          })
        } else if (clearedNote) {
          toast.warning(`${food.name} deleted`, { description: clearedNote })
        } else {
          toast.success(`${food.name} deleted`)
        }
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setDeleting(undefined),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Food library</CardTitle>
        <CardDescription>
          Wet, dry, and treat foods with their calorie values. Deleting a food that has logged
          meals archives it instead, so history stays intact.
        </CardDescription>
        <CardAction>
          <Button onClick={openCreate}>
            <Plus data-icon="inline-start" aria-hidden />
            Add food
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="show-archived"
            checked={includeArchived}
            onCheckedChange={setIncludeArchived}
          />
          <Label htmlFor="show-archived" className="text-sm text-muted-foreground">
            Show archived foods
          </Label>
        </div>

        {foods.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading foods…</p>
        ) : foods.isError ? (
          <p className="py-8 text-center text-sm text-destructive">{foods.error.message}</p>
        ) : foods.data.length === 0 ? (
          <div className="grid justify-items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {includeArchived
                ? 'The food library is empty.'
                : 'No foods yet. Add wet, dry, and treat foods here so meals can be logged.'}
            </p>
            <Button variant="outline" onClick={openCreate}>
              <Plus data-icon="inline-start" aria-hidden />
              Add your first food
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Calories</TableHead>
                <TableHead className="w-0 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {foods.data.map((food) => (
                <TableRow key={food.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      {food.name}
                      {food.archived_at ? <Badge variant="outline">Archived</Badge> : null}
                    </span>
                  </TableCell>
                  <TableCell>{FOOD_TYPE_LABELS[food.type]}</TableCell>
                  <TableCell>
                    {formatKcal(food.kcal_per_basis)} {BASIS_LABELS[food.calorie_basis]}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${food.name}`}
                        onClick={() => openEdit(food)}
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${food.name}`}
                        onClick={() => setDeleting(food)}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <FoodFormDialog open={formOpen} onOpenChange={setFormOpen} food={editing} />

      <AlertDialog
        open={deleting !== undefined}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              If any meals were logged with this food it will be archived instead of deleted, so
              history keeps working. Either way it is removed from every cat that uses it as a
              default food.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteFood.isPending}
              onClick={() => {
                if (deleting) confirmDelete(deleting)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
