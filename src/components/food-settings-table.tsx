'use client'

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { logger } from "@/lib/logger"
import { useCallback, useState } from "react"
import debounce from 'lodash/debounce'
import { SuccessAlert } from "./success-alert"
import { DeleteConfirmation } from "./delete-confirmation"

type FoodSetting = {
  id: number
  name: string
  foodType: string
  calories: number
}

type Alert = {
  type: 'success' | 'warning'
  message: string
  title?: string
}

const FOOD_TYPES = ['WET', 'DRY']

export function FoodSettingsTable() {
  const [settings, setSettings] = React.useState<FoodSetting[]>([])
  const [localSettings, setLocalSettings] = React.useState<FoodSetting[]>([])
  const [newFood, setNewFood] = React.useState<Partial<FoodSetting> | null>(null)
  const [alert, setAlert] = React.useState<Alert | null>(null)
  const [deleteItem, setDeleteItem] = useState<{ id: number; name: string } | null>(null)

  React.useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data)
        setLocalSettings(data)
      })
  }, [])

  React.useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdate = useCallback(
    debounce(async (id: number, field: keyof FoodSetting, value: string | number, originalValue: string | number) => {
      try {
        const response = await fetch(`/api/settings/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        })

        if (!response.ok) throw new Error('Failed to update')

        const updatedSetting = await response.json()
        setSettings(prev => 
          prev.map(setting => 
            setting.id === id ? updatedSetting : setting
          )
        )
        
        // Show success alert for the modification
        const setting = settings.find(s => s.id === id)
        if (setting) {
          let message = ''
          switch (field) {
            case 'name':
              message = `Changed name from "${originalValue}" to "${value}"`
              break
            case 'foodType':
              message = `Changed type from ${originalValue} to ${value}`
              break
            case 'calories':
              message = `Updated calories from ${originalValue} to ${value} kcal/100g`
              break
          }
          setAlert({
            type: 'success',
            title: `Updated ${setting.name}`,
            message
          })
        }
      } catch (error) {
        logger.error('Failed to update food setting:', error)
        setLocalSettings(settings)
        setAlert({
          type: 'warning',
          title: 'Update Failed',
          message: 'Failed to update food setting. Changes have been reverted.'
        })
      }
    }, 500),
    [settings]
  )

  const handleLocalUpdate = (id: number, field: keyof FoodSetting, value: string | number) => {
    const originalSetting = localSettings.find(s => s.id === id)
    const originalValue = originalSetting?.[field]
    
    if (originalValue === undefined) return
    
    setLocalSettings(prev => 
      prev.map(setting => 
        setting.id === id ? { ...setting, [field]: value } : setting
      )
    )
    
    if (originalValue !== value) {
      debouncedUpdate(id, field, value, originalValue)
    }
  }

  const handleAddNew = () => {
    setNewFood({
      name: '',
      foodType: 'DRY',
      calories: 0
    })
  }

  const handleSaveNew = async () => {
    if (!newFood?.name || !newFood.calories) return

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFood),
      })

      if (!response.ok) throw new Error('Failed to create')

      const created = await response.json()
      setSettings(prev => [...prev, created])
      setLocalSettings(prev => [...prev, created])
      setNewFood(null)
      setAlert({
        type: 'success',
        message: `Successfully added ${created.name} to your food list!`
      })
    } catch (error) {
      logger.error('Failed to create food setting:', error)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    try {
      const response = await fetch(`/api/settings/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      setSettings(prev => prev.filter(setting => setting.id !== id))
      setLocalSettings(prev => prev.filter(setting => setting.id !== id))
      setAlert({
        type: 'warning',
        message: `${name} has been removed from your food list`
      })
    } catch (error) {
      logger.error('Failed to delete food setting:', error)
    } finally {
      setDeleteItem(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newFood?.name && newFood.calories) {
      e.preventDefault()
      handleSaveNew()
    }
  }

  return (
    <div className="space-y-4">
      {alert && (
        <SuccessAlert 
          title={alert.title}
          description={alert.message}
          variant={alert.type}
        />
      )}
      
      <Button onClick={handleAddNew} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Add New Food
      </Button>
      
      <DeleteConfirmation
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && handleDelete(deleteItem.id, deleteItem.name)}
        title="Delete Food"
        description={`Are you sure you want to delete ${deleteItem?.name}? This action cannot be undone.`}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Calories (per 100g)</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {newFood && (
              <TableRow>
                <TableCell>
                  <Input
                    value={newFood.name}
                    onChange={(e) => setNewFood(prev => ({ ...prev!, name: e.target.value }))}
                    placeholder="Food name"
                    className="max-w-[200px]"
                    onKeyDown={handleKeyPress}
                    autoFocus
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={newFood.foodType}
                    onValueChange={(value) => setNewFood(prev => ({ ...prev!, foodType: value }))}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOOD_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newFood.calories || ''}
                    onChange={(e) => setNewFood(prev => ({ ...prev!, calories: parseFloat(e.target.value) }))}
                    className="max-w-[100px]"
                    onKeyDown={handleKeyPress}
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    onClick={handleSaveNew}
                    disabled={!newFood.name || !newFood.calories}
                    size="sm"
                  >
                    Save
                  </Button>
                </TableCell>
              </TableRow>
            )}
            
            {localSettings.map((setting) => (
              <TableRow key={setting.id}>
                <TableCell>
                  <Input
                    value={setting.name}
                    onChange={(e) => handleLocalUpdate(setting.id, 'name', e.target.value)}
                    className="max-w-[200px]"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={setting.foodType}
                    onValueChange={(value) => handleLocalUpdate(setting.id, 'foodType', value)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOOD_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={setting.calories}
                    onChange={(e) => handleLocalUpdate(setting.id, 'calories', parseFloat(e.target.value))}
                    className="max-w-[100px]"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteItem({ id: setting.id, name: setting.name })}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 