import { Card } from "@/components/ui/card"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts"
import { format, eachDayOfInterval } from "date-fns"
import type { DateRange } from "react-day-picker"
import { getLastNDaysRange } from "@/lib/date-utils"

interface CalorieChartProps {
  data: Array<{
    date: Date
    calories: number
    target: number
  }>
  dateRange?: DateRange
}

export function CalorieChart({ data, dateRange }: CalorieChartProps) {
  // Get the full date range, including days with no data
  const range = dateRange?.from && dateRange?.to
    ? { start: dateRange.from, end: dateRange.to }
    : getLastNDaysRange(7)

  const allDays = eachDayOfInterval({ 
    start: range.start, 
    end: range.end 
  })

  // Create a map of existing data
  const dataMap = new Map(
    data.map(d => [format(d.date, 'yyyy-MM-dd'), d])
  )

  // Create chart data with all days, using 0 for days with no data
  const chartData = allDays.map(day => {
    const key = format(day, 'yyyy-MM-dd')
    const existingData = dataMap.get(key)
    return {
      date: format(day, 'MMM d'),
      calories: existingData ? Math.round(existingData.calories) : 0,
      target: existingData?.target || data[0]?.target || 0,
      rawDate: day
    }
  })

  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">Calorie Intake Trend</h3>
      <div className="h-[300px] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs text-muted-foreground"
              />
              <YAxis 
                className="text-xs text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))"
                }}
                labelStyle={{
                  color: "hsl(var(--foreground))"
                }}
              />
              <Line 
                type="monotone" 
                dataKey="calories" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                strokeWidth={1}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No data available for selected period
          </div>
        )}
      </div>
    </Card>
  )
} 