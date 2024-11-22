'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type FoodSettings = {
  foodType: string
  calories: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<FoodSettings[]>([])

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(setSettings)
  }, [])

  const handleSave = async (foodType: string, calories: number) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodType, calories }),
    })
  }

  return (
    <main className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Food Calories (per 100g)</h2>
        <div className="space-y-4">
          {['WET', 'DRY'].map((type) => {
            const setting = settings.find(s => s.foodType === type)
            return (
              <div key={type} className="flex items-center gap-4">
                <label className="w-24">{type === 'WET' ? 'Wet Food' : 'Dry Food'}</label>
                <Input
                  type="number"
                  value={setting?.calories ?? ''}
                  onChange={(e) => {
                    const newSettings = settings.map(s => 
                      s.foodType === type ? { ...s, calories: parseFloat(e.target.value) } : s
                    )
                    if (!setting) {
                      newSettings.push({ foodType: type, calories: parseFloat(e.target.value) })
                    }
                    setSettings(newSettings)
                  }}
                  className="w-32"
                />
                <span>kcal/100g</span>
                <Button onClick={() => handleSave(type, setting?.calories ?? 0)}>Save</Button>
              </div>
            )
          })}
        </div>
      </Card>
    </main>
  )
} 