import { Card } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon } from "@radix-ui/react-icons"
import { CalorieSummary } from "./calorie-summary"
import { getLastNDaysRange } from "@/lib/date-utils"
import { eachDayOfInterval, format } from "date-fns"
import { useCalorieStats } from "@/hooks/use-calorie-stats"
import { CalorieChart } from "./calorie-chart"
import { MealHeatmap } from "./meal-heatmap"
import { PortionHistory } from "@/components/portion-history"
import type { DateRange } from "react-day-picker"
import { useMeals } from "@/contexts/meal-context"

interface WeeklyCalorieAnalysisProps {
  catId: number
  dateRange?: DateRange
}

export function WeeklyCalorieAnalysis({ catId, dateRange }: WeeklyCalorieAnalysisProps) {
  const { weeklyAverage, trend, isIncreasing, chartData, recentMeals } = useCalorieStats(catId, dateRange)
  const { loading } = useMeals()

  const days = dateRange?.from && dateRange?.to 
    ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
    : eachDayOfInterval(getLastNDaysRange(7))

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-medium mb-2">Today</h3>
          <CalorieSummary selectedCatId={catId} hideTitle />
        </Card>
        
        <Card className="p-4">
          <h3 className="font-medium mb-2">Period Average</h3>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-bold">{weeklyAverage}</p>
              <p className="text-xs text-muted-foreground">calories/day</p>
            </div>
            <div className={`flex items-center space-x-1 ${
              isIncreasing ? 'text-red-600' : 'text-green-600'
            }`}>
              {isIncreasing ? (
                <ArrowUpIcon className="h-4 w-4" />
              ) : (
                <ArrowDownIcon className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{trend}%</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CalorieChart data={chartData} />
        <MealHeatmap meals={recentMeals} />
      </div>

      <PortionHistory meals={recentMeals} catId={catId} />

      <div className="space-y-4">
        <h3 className="font-medium">Daily Breakdown</h3>
        <div className="grid gap-4">
          {days.map((date) => (
            <CalorieSummary 
              key={date.toISOString()} 
              selectedCatId={catId} 
              date={format(date, 'dd/MM/yyyy')} 
            />
          ))}
        </div>
      </div>
    </div>
  )
} 