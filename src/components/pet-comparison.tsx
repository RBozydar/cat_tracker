import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useEffect, useState } from "react"
import type { Cat } from "@/lib/types"
import { useMeals } from "@/contexts/meal-context"
import { getLastNDaysRange } from "@/lib/date-utils"

interface ComparisonData {
  name: string
  average: number
  target: number
  adherence: number
}

export function PetComparison() {
  const [cats, setCats] = useState<Cat[]>([])
  const [data, setData] = useState<ComparisonData[]>([])
  const { meals } = useMeals()
  
  // First, fetch cats
  useEffect(() => {
    fetch('/api/cats')
      .then(res => res.json())
      .then(setCats)
  }, [])

  // Then, calculate stats when we have both cats and meals
  useEffect(() => {
    if (!cats.length || !meals) return

    const dateRange = getLastNDaysRange(7)
    const comparisonData: ComparisonData[] = []

    cats.forEach(cat => {
      if (!cat.wetFood || !cat.dryFood) {
        console.error('Missing food settings for cat:', cat)
        return
      }

      // Filter meals for this cat
      const catMeals = meals.filter(meal => 
        meal.catId === cat.id &&
        new Date(meal.createdAt) >= dateRange.start &&
        new Date(meal.createdAt) <= dateRange.end
      )

      // Calculate daily calories
      const dailyCalories = new Map<string, number>()
      
      catMeals.forEach(meal => {
        const date = new Date(meal.createdAt).toISOString().split('T')[0]
        const foodSettings = meal.foodType === 'WET' ? cat.wetFood : cat.dryFood
        if (!foodSettings) {
          console.error('Missing food settings for meal:', meal)
          return
        }

        const calories = (meal.weight / 100) * foodSettings.calories
        
        dailyCalories.set(
          date,
          (dailyCalories.get(date) || 0) + calories
        )
      })

      const average = Array.from(dailyCalories.values()).reduce((sum, cal) => sum + cal, 0) / 7
      const adherence = (average / cat.targetCalories) * 100

      comparisonData.push({
        name: cat.name,
        average: Math.round(average),
        target: cat.targetCalories,
        adherence: Math.round(adherence)
      })
    })

    setData(comparisonData)
  }, [cats, meals])

  if (!cats.length || !data.length) return null

  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">Pet Comparison</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="name" 
              className="text-xs text-muted-foreground"
            />
            <YAxis 
              className="text-xs text-muted-foreground"
              label={{ 
                value: 'Calories', 
                angle: -90, 
                position: 'insideLeft',
                className: "text-xs text-muted-foreground"
              }}
            />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload?.length) return null
                const data = payload[0].payload as ComparisonData
                return (
                  <div className="bg-background border border-border p-2 rounded-md text-sm">
                    <p className="font-medium">{label}</p>
                    <p>Average: {data.average} kcal</p>
                    <p>Target: {data.target} kcal</p>
                    <p className={data.adherence > 110 ? 'text-red-500' : 
                                data.adherence < 90 ? 'text-yellow-500' : 
                                'text-green-500'}>
                      {data.adherence}% of target
                    </p>
                  </div>
                )
              }}
            />
            <Bar 
              dataKey="average" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
} 