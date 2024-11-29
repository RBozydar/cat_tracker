'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeeklyCalorieAnalysis } from "@/components/weekly-calorie-analysis"
import { PetComparison } from "@/components/pet-comparison"
import { DateRangePicker } from "@/components/date-range-picker"
import type { Cat } from "@/lib/types"
import type { DateRange } from "react-day-picker"
import { addDays } from "date-fns"
import { useCats } from "@/lib/queries"

interface HistoryClientProps {
  initialCats: Cat[]
}

export function HistoryClient({ initialCats }: HistoryClientProps) {
  const { data: cats = initialCats } = useCats()
  const [selectedCatId, setSelectedCatId] = useState<number>(cats[0]?.id || 0)
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">History</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <DateRangePicker date={date} onChange={setDate} />
        </div>
      </div>

      <PetComparison initialCats={cats} />

      <Tabs 
        defaultValue={selectedCatId.toString()} 
        onValueChange={(value) => setSelectedCatId(Number(value))}
        className="w-full"
      >
        <div className="flex justify-end mb-6">
          <TabsList className="w-full sm:w-auto">
            {cats.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {cats.map((cat) => (
          <TabsContent key={cat.id} value={cat.id.toString()}>
            <WeeklyCalorieAnalysis 
              catId={cat.id} 
              dateRange={date}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
} 