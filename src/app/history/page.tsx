"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeeklyCalorieAnalysis } from "@/components/weekly-calorie-analysis"
import { PetComparison } from "@/components/pet-comparison"
import { DateRangePicker } from "@/components/date-range-picker"
import { useState, useEffect } from "react"
import type { Cat } from "@/lib/types"
import type { DateRange } from "react-day-picker"
import { addDays } from "date-fns"

export default function HistoryPage() {
  const [cats, setCats] = useState<Cat[]>([])
  const [selectedCatId, setSelectedCatId] = useState<number>(0)
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  })

  useEffect(() => {
    fetch('/api/cats')
      .then(res => res.json())
      .then(data => {
        setCats(data)
        if (data.length > 0) {
          setSelectedCatId(data[0].id)
        }
      })
  }, [])

  if (cats.length === 0) return null

  return (
    <main className="container mx-auto py-10">
      <div className="flex justify-between items-start mb-8">
        <h1 className="text-3xl font-bold">History</h1>
        <DateRangePicker date={date} onChange={setDate} />
      </div>

      <PetComparison />
      
      <Tabs defaultValue={selectedCatId.toString()} onValueChange={(value) => setSelectedCatId(Number(value))}>
        <TabsList className="mb-8">
          {cats.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id.toString()}>
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {cats.map((cat) => (
          <TabsContent key={cat.id} value={cat.id.toString()}>
            <WeeklyCalorieAnalysis 
              catId={cat.id} 
              dateRange={date}
            />
          </TabsContent>
        ))}
      </Tabs>
    </main>
  )
} 