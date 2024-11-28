import { Card } from "@/components/ui/card"
import { format } from "date-fns"
import { ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis, ZAxis, Tooltip } from "recharts"

interface MealTime {
  hour: number
  day: number
  value: number // number of meals at this time
  actualTime: string // for tooltip
  actualDay: string
}

interface MealHeatmapProps {
  meals: Array<{
    createdAt: string
    weight: number
  }>
}

export function MealHeatmap({ meals }: MealHeatmapProps) {
  // Process meals into hourly buckets for each day
  const mealTimes: MealTime[] = []
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  meals.forEach(meal => {
    const date = new Date(meal.createdAt)
    const hour = date.getHours()
    const day = date.getDay()
    
    const existingEntry = mealTimes.find(t => t.hour === hour && t.day === day)
    if (existingEntry) {
      existingEntry.value += 1
    } else {
      mealTimes.push({
        hour,
        day,
        value: 1,
        actualTime: format(date, 'h a'),
        actualDay: daysOfWeek[day]
      })
    }
  })

  // Fill in missing hours with zero values
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      if (!mealTimes.find(t => t.hour === hour && t.day === day)) {
        mealTimes.push({
          hour,
          day,
          value: 0,
          actualTime: format(new Date().setHours(hour, 0, 0, 0), 'h a'),
          actualDay: daysOfWeek[day]
        })
      }
    }
  }

  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">Meal Time Pattern</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis 
              dataKey="hour" 
              type="number" 
              domain={[0, 23]}
              ticks={[0, 6, 12, 18, 23]}
              tickFormatter={(hour) => format(new Date().setHours(hour), 'h a')}
              className="text-xs text-muted-foreground"
            />
            <YAxis 
              dataKey="day" 
              type="number" 
              domain={[0, 6]}
              ticks={[0, 1, 2, 3, 4, 5, 6]}
              tickFormatter={(day) => daysOfWeek[day]}
              className="text-xs text-muted-foreground"
              reversed
            />
            <ZAxis dataKey="value" range={[0, 400]} />
            <Tooltip 
              content={({ payload }) => {
                if (!payload?.[0]?.payload) return null
                const data = payload[0].payload as MealTime
                return (
                  <div className="bg-background border border-border p-2 rounded-md text-sm">
                    <p>{data.actualDay} at {data.actualTime}</p>
                    <p className="font-medium">{data.value} meals</p>
                  </div>
                )
              }}
            />
            <Scatter 
              data={mealTimes} 
              fill="hsl(var(--primary))"
              opacity={0.5}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
} 