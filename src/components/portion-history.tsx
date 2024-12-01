import { Card } from "@/components/ui/card"
import { format } from "date-fns"
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useEffect, useState } from "react"
import type { Cat } from "@/lib/types"

interface PortionHistoryProps {
  meals: Array<{
    createdAt: string
    weight: number
    foodType: 'WET' | 'DRY'
  }>
  catId: number
}

export function PortionHistory({ meals, catId }: PortionHistoryProps) {
  const [cat, setCat] = useState<Cat | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setError(null)
    fetch(`/api/cats/${catId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch cat data')
        }
        return res.json()
      })
      .then(setCat)
      .catch(setError)
  }, [catId])

  if (error || !cat) return null

  const data = meals.map(meal => ({
    time: new Date(meal.createdAt).getTime(),
    weight: meal.weight,
    foodType: meal.foodType,
    formattedTime: format(new Date(meal.createdAt), 'MMM d, h:mm a')
  }))

  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">Portion Sizes</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis 
              dataKey="time" 
              domain={['auto', 'auto']}
              type="number"
              tickFormatter={(time) => format(time, 'MMM d')}
              className="text-xs text-muted-foreground"
            />
            <YAxis 
              label={{ 
                value: 'Grams', 
                angle: -90, 
                position: 'insideLeft',
                className: "text-xs text-muted-foreground"
              }}
              className="text-xs text-muted-foreground"
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null
                const data = payload[0].payload as typeof meals[0] & { formattedTime: string }
                return (
                  <div className="bg-background border border-border p-2 rounded-md text-sm">
                    <p>{data.formattedTime}</p>
                    <p className="font-medium">{data.weight}g ({data.foodType.toLowerCase()} food)</p>
                  </div>
                )
              }}
            />
            <Scatter 
              data={data} 
              fill="hsl(var(--primary))"
              opacity={0.6}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-primary opacity-50" />
          <span>Wet Food Meals</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-muted-foreground opacity-50" />
          <span>Dry Food Meals</span>
        </div>
      </div>
    </Card>
  )
} 