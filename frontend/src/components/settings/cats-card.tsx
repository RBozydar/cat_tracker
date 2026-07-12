import { Calculator, Pencil, Plus, Scale, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useCats, useFoods, useSettings } from '@/api/hooks'
import type { Cat } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatKcal, formatKg } from '@/lib/format'
import { CatFormDialog } from './cat-form-dialog'
import { DeleteCatDialog } from './delete-cat-dialog'
import { TargetCalculatorDialog } from './target-calculator-dialog'
import { WeighInDialog } from './weigh-in-dialog'

type RowDialog = 'edit' | 'weigh' | 'calculator' | 'delete'

export function CatsCard() {
  const cats = useCats()
  // include_archived=false: an archived food can linger as a default reference
  // only transiently; names resolve from the active library.
  const foods = useFoods(false)
  // Weigh-in dates are household-local; the settings query is shared/cached
  // with HouseholdCard, so this rarely observes the pending window in practice.
  const settings = useSettings()
  const timezone = settings.data?.timezone ?? 'UTC'

  const [createOpen, setCreateOpen] = useState(false)
  const [active, setActive] = useState<{ cat: Cat; dialog: RowDialog } | undefined>(undefined)

  function foodName(id: number | null): string {
    if (id == null) return '—'
    return foods.data?.find((food) => food.id === id)?.name ?? `food #${id}`
  }

  function openRowDialog(cat: Cat, dialog: RowDialog) {
    setActive({ cat, dialog })
  }

  function rowDialogOpenChange(open: boolean) {
    if (!open) setActive(undefined)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cats</CardTitle>
        <CardDescription>
          Daily calorie targets, goal weights, and default foods. Use the calculator to derive a
          target from the veterinary RER formula.
        </CardDescription>
        <CardAction>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" aria-hidden />
            Add cat
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {cats.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading cats…</p>
        ) : cats.isError ? (
          <p className="py-8 text-center text-sm text-destructive">{cats.error.message}</p>
        ) : cats.data.length === 0 ? (
          <div className="grid justify-items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No cats yet. Add each cat with a daily calorie target to start tracking.
            </p>
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" aria-hidden />
              Add your first cat
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Daily target</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead>Default wet</TableHead>
                <TableHead>Default dry</TableHead>
                <TableHead className="w-0 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cats.data.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      {formatKcal(cat.target_kcal)}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Calculate target for ${cat.name}`}
                        onClick={() => openRowDialog(cat, 'calculator')}
                      >
                        <Calculator aria-hidden />
                      </Button>
                    </span>
                  </TableCell>
                  <TableCell>
                    {cat.current_weight_kg != null ? formatKg(cat.current_weight_kg) : '—'}
                  </TableCell>
                  <TableCell>
                    {cat.goal_weight_kg != null ? formatKg(cat.goal_weight_kg) : '—'}
                  </TableCell>
                  <TableCell>{foodName(cat.default_wet_food_id)}</TableCell>
                  <TableCell>{foodName(cat.default_dry_food_id)}</TableCell>
                  <TableCell className="text-right">
                    <span className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Weigh in ${cat.name}`}
                        onClick={() => openRowDialog(cat, 'weigh')}
                      >
                        <Scale aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${cat.name}`}
                        onClick={() => openRowDialog(cat, 'edit')}
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${cat.name}`}
                        onClick={() => openRowDialog(cat, 'delete')}
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

      <CatFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      {active ? (
        <>
          <CatFormDialog
            open={active.dialog === 'edit'}
            onOpenChange={rowDialogOpenChange}
            cat={active.cat}
          />
          <WeighInDialog
            open={active.dialog === 'weigh'}
            onOpenChange={rowDialogOpenChange}
            cat={active.cat}
            timezone={timezone}
          />
          <TargetCalculatorDialog
            open={active.dialog === 'calculator'}
            onOpenChange={rowDialogOpenChange}
            cat={active.cat}
          />
          <DeleteCatDialog
            open={active.dialog === 'delete'}
            onOpenChange={rowDialogOpenChange}
            cat={active.cat}
          />
        </>
      ) : null}
    </Card>
  )
}
