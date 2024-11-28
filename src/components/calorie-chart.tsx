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
import { format } from "date-fns"

interface CalorieChartProps {
  data: Array<{
    date: Date
    calories: number
    target: number
  }>
}

export function CalorieChart({ data }: CalorieChartProps) {
  const chartData = data.map(d => ({
    date: format(d.date, 'MMM d'),
    calories: Math.round(d.calories),
    target: d.target
  }))

  return (
    <Card className="p-4">
      <h3 className="font-medium mb-4">Calorie Intake Trend</h3>
      <div className="h-[300px] w-full">
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
      </div>
    </Card>
  )
} 