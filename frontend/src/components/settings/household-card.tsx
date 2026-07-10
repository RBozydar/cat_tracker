import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSettings, useUpdateSettings } from '@/api/hooks'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

export function HouseholdCard() {
  const settings = useSettings()
  const updateSettings = useUpdateSettings()

  const [timezone, setTimezone] = useState('')
  const [portionSuggestions, setPortionSuggestions] = useState(false)
  const [mealsPerDay, setMealsPerDay] = useState('2')
  const [error, setError] = useState<string | null>(null)

  // Seed the form once the settings arrive (and re-seed after refetches while untouched).
  useEffect(() => {
    if (!settings.data) return
    setTimezone(settings.data.timezone)
    setPortionSuggestions(settings.data.portion_suggestions_enabled)
    setMealsPerDay(String(settings.data.meals_per_day))
  }, [settings.data])

  const timezones = useMemo(() => {
    const supported = Intl.supportedValuesOf('timeZone')
    // The stored value (e.g. "UTC") may not be in the browser's canonical list.
    return timezone && !supported.includes(timezone) ? [timezone, ...supported] : supported
  }, [timezone])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const meals = Number(mealsPerDay)
    if (!Number.isInteger(meals) || meals < 1) {
      setError('Meals per day must be a whole number of at least 1.')
      return
    }
    if (!timezone) {
      setError('Pick a timezone.')
      return
    }
    setError(null)

    updateSettings.mutate(
      {
        timezone,
        portion_suggestions_enabled: portionSuggestions,
        meals_per_day: meals,
      },
      {
        onSuccess: () => toast.success('Household settings saved'),
        onError: (err) => setError(err.message),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Household</CardTitle>
        <CardDescription>
          The timezone defines what “today” means for every report. Portion suggestions split
          each cat&apos;s daily target across the meals per day.
        </CardDescription>
      </CardHeader>
      {settings.isPending ? (
        <CardContent>
          <p className="py-4 text-sm text-muted-foreground">Loading settings…</p>
        </CardContent>
      ) : settings.isError ? (
        <CardContent>
          <p className="py-4 text-sm text-destructive">{settings.error.message}</p>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="household-timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="household-timezone" className="w-full sm:w-80">
                  <SelectValue placeholder="Pick a timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="portion-suggestions"
                checked={portionSuggestions}
                onCheckedChange={setPortionSuggestions}
              />
              <Label htmlFor="portion-suggestions">Portion suggestions</Label>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="meals-per-day">Meals per day</Label>
              <Input
                id="meals-per-day"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                className="w-24"
                value={mealsPerDay}
                onChange={(event) => setMealsPerDay(event.target.value)}
                required
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
          <CardFooter className="mt-4">
            <Button type="submit" disabled={updateSettings.isPending}>
              Save settings
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
