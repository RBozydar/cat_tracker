import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useUpsertWeight } from '@/api/hooks'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parsePositiveNumber, todayInHouseholdTz } from '@/lib/format'

interface WeighInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cat: Cat
  /** Household timezone — weigh-in dates are household-local, like history ranges. */
  timezone: string
}

export function WeighInDialog({ open, onOpenChange, cat, timezone }: WeighInDialogProps) {
  const upsertWeight = useUpsertWeight()

  const [weight, setWeight] = useState('')
  const [measuredOn, setMeasuredOn] = useState(() => todayInHouseholdTz(timezone))
  const [error, setError] = useState<string | null>(null)
  // Tracks unsaved edits so a background refetch that changes the household
  // timezone mid-edit (see below) can't silently reset an in-progress entry.
  const [dirty, setDirty] = useState(false)

  // Reset the form fresh every time the dialog opens.
  useEffect(() => {
    if (!open) return
    setWeight('')
    setMeasuredOn(todayInHouseholdTz(timezone))
    setError(null)
    setDirty(false)
    // `timezone` is deliberately excluded: it's handled by the effect below so
    // a mid-edit timezone change doesn't also blank out the weight field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Re-derive the default date from the household timezone, but only while
  // the form is still untouched — `timezone` comes from a live query, and a
  // background refetch (e.g. the partner changing it) shouldn't clobber an
  // in-progress weigh-in.
  useEffect(() => {
    if (!open || dirty) return
    setMeasuredOn(todayInHouseholdTz(timezone))
  }, [open, timezone, dirty])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const weightValue = parsePositiveNumber(weight)
    if (weightValue === null) {
      setError('Weight must be a positive number of kg.')
      return
    }
    if (!measuredOn) {
      setError('A date is required.')
      return
    }

    upsertWeight.mutate(
      { catId: cat.id, body: { weight_kg: weightValue, measured_on: measuredOn } },
      {
        onSuccess: () => {
          toast.success(`Weigh-in saved for ${cat.name}`)
          onOpenChange(false)
        },
        onError: (err) => setError(err.message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Weigh in {cat.name}</DialogTitle>
          <DialogDescription>
            One entry per day — saving again for the same date replaces that day&apos;s weight.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="weigh-kg">Weight (kg)</Label>
            <Input
              id="weigh-kg"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={weight}
              onChange={(event) => {
                setWeight(event.target.value)
                setDirty(true)
              }}
              autoFocus
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weigh-date">Date</Label>
            <Input
              id="weigh-date"
              type="date"
              value={measuredOn}
              onChange={(event) => {
                setMeasuredOn(event.target.value)
                setDirty(true)
              }}
              required
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={upsertWeight.isPending}>
              Save weigh-in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
