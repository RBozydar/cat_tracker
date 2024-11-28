'use client'

import { useState, useEffect } from 'react'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { logger } from '@/lib/logger'

interface PortionSettings {
  suggestPortionSizes: boolean
  mealsPerDay: number
}

export function PortionSettingsForm() {
  const [settings, setSettings] = useState<PortionSettings>({
    suggestPortionSizes: false,
    mealsPerDay: 2
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portion-settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data)
        setLoading(false)
      })
      .catch(error => {
        logger.error('Failed to load portion settings:', error)
        setLoading(false)
      })
  }, [])

  const handleSettingChange = async (key: keyof PortionSettings, value: boolean | number) => {
    try {
      const response = await fetch('/api/portion-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
        throw new Error(errorData.error || 'Failed to update portion settings')
      }

      const data = await response.json()
      setSettings(data)
    } catch (error) {
      logger.error('Failed to update portion settings:', error)
      // Revert the setting to its previous value
      setSettings(prev => ({
        ...prev,
        [key]: prev[key]
      }))
    }
  }

  if (loading) return null

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Switch
              id="suggest-portions"
              checked={settings.suggestPortionSizes}
              onCheckedChange={(checked) => handleSettingChange('suggestPortionSizes', checked)}
            />
            <Label htmlFor="suggest-portions" className="text-base">
              Suggest Portion Sizes
            </Label>
          </div>

          {settings.suggestPortionSizes && (
            <div className="flex items-center gap-2">
              <Label htmlFor="meals-per-day" className="text-base whitespace-nowrap">
                Meals per Day:
              </Label>
              <Input
                id="meals-per-day"
                type="number"
                min={1}
                max={10}
                value={settings.mealsPerDay}
                onChange={(e) => handleSettingChange('mealsPerDay', parseInt(e.target.value))}
                className="w-20"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  )
} 