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
import { parsePositiveNumber, todayLocalISO } from '@/lib/format'

interface WeighInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cat: Cat
}

export function WeighInDialog({ open, onOpenChange, cat }: WeighInDialogProps) {
  const upsertWeight = useUpsertWeight()

  const [weight, setWeight] = useState('')
  const [measuredOn, setMeasuredOn] = useState(todayLocalISO)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setWeight('')
    setMeasuredOn(todayLocalISO())
    setError(null)
  }, [open])

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
              onChange={(event) => setWeight(event.target.value)}
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
              onChange={(event) => setMeasuredOn(event.target.value)}
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
