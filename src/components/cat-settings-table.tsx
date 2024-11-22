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
import { SuccessAlert } from "./success-alert"
import debounce from 'lodash/debounce'
import { DeleteConfirmation } from "./delete-confirmation"

type Cat = {
  id: number
  name: string
  wetFoodId: number
  dryFoodId: number
  targetCalories: number
  weight: number
  weightUnit: string
}

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

const WEIGHT_UNITS = ['kg', 'lbs']

export function CatSettingsTable() {
  const [cats, setCats] = React.useState<Cat[]>([])
  const [localCats, setLocalCats] = React.useState<Cat[]>([])
  const [foods, setFoods] = React.useState<FoodSetting[]>([])
  const [newCat, setNewCat] = React.useState<Partial<Cat> | null>(null)
  const [alert, setAlert] = React.useState<Alert | null>(null)
  const [deleteItem, setDeleteItem] = React.useState<{ id: number; name: string } | null>(null)

  React.useEffect(() => {
    // Fetch cats
    fetch('/api/cats')
      .then(res => res.json())
      .then(data => {
        setCats(data)
        setLocalCats(data)
      })

    // Fetch foods
    fetch('/api/settings')
      .then(res => res.json())
      .then(setFoods)
  }, [])

  React.useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  const wetFoods = foods.filter(f => f.foodType === 'WET')
  const dryFoods = foods.filter(f => f.foodType === 'DRY')

  const debouncedUpdate = React.useCallback(
    debounce(async (id: number, field: keyof Cat, value: string | number, originalValue: string | number) => {
      try {
        const response = await fetch(`/api/cats/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        })

        if (!response.ok) throw new Error('Failed to update')

        const updatedCat = await response.json()
        setCats(prev => prev.map(cat => cat.id === id ? updatedCat : cat))

        const cat = cats.find(c => c.id === id)
        if (cat) {
          let message = ''
          switch (field) {
            case 'name':
              message = `Changed name from "${originalValue}" to "${value}"`
              break
            case 'weight':
              message = `Updated weight from ${originalValue} to ${value} ${cat.weightUnit}`
              break
            case 'weightUnit':
              message = `Changed weight unit from ${originalValue} to ${value}`
              break
            case 'targetCalories':
              message = `Updated target calories from ${originalValue} to ${value} kcal`
              break
            case 'wetFoodId':
            case 'dryFoodId':
              const foodType = field === 'wetFoodId' ? 'wet' : 'dry'
              const oldFood = foods.find(f => f.id === originalValue)?.name
              const newFood = foods.find(f => f.id === value)?.name
              message = `Changed ${foodType} food from "${oldFood}" to "${newFood}"`
              break
          }
          setAlert({
            type: 'success',
            title: `Updated ${cat.name}`,
            message
          })
        }
      } catch (error) {
        logger.error('Failed to update cat:', error)
        setLocalCats(cats)
        setAlert({
          type: 'warning',
          title: 'Update Failed',
          message: 'Failed to update cat. Changes have been reverted.'
        })
      }
    }, 500),
    [cats, foods]
  )

  const handleLocalUpdate = (id: number, field: keyof Cat, value: string | number) => {
    const originalCat = localCats.find(c => c.id === id)
    const originalValue = originalCat?.[field]
    
    setLocalCats(prev => 
      prev.map(cat => 
        cat.id === id ? { ...cat, [field]: value } : cat
      )
    )
    
    if (originalValue !== value) {
      debouncedUpdate(id, field, value, originalValue!)
    }
  }

  const handleAddNew = () => {
    setNewCat({
      name: '',
      wetFoodId: wetFoods[0]?.id,
      dryFoodId: dryFoods[0]?.id,
      targetCalories: 0,
      weight: 0,
      weightUnit: 'kg'
    })
  }

  const handleSaveNew = async () => {
    if (!newCat?.name || !newCat.wetFoodId || !newCat.dryFoodId || !newCat.targetCalories || !newCat.weight) return

    try {
      const response = await fetch('/api/cats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat),
      })

      if (!response.ok) throw new Error('Failed to create')

      const created = await response.json()
      setCats(prev => [...prev, created])
      setLocalCats(prev => [...prev, created])
      setNewCat(null)
      setAlert({
        type: 'success',
        message: `Successfully added ${created.name} to your cats!`
      })
    } catch (error) {
      logger.error('Failed to create cat:', error)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    try {
      const response = await fetch(`/api/cats/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      setCats(prev => prev.filter(cat => cat.id !== id))
      setLocalCats(prev => prev.filter(cat => cat.id !== id))
      setAlert({
        type: 'warning',
        message: `${name} has been removed from your cats list`
      })
    } catch (error) {
      logger.error('Failed to delete cat:', error)
    } finally {
      setDeleteItem(null)
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
        <Plus className="mr-2 h-4 w-4" /> Add New Cat
      </Button>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Wet Food</TableHead>
              <TableHead>Dry Food</TableHead>
              <TableHead>Target (kcal)</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {newCat && (
              <TableRow>
                <TableCell>
                  <Input
                    value={newCat.name}
                    onChange={(e) => setNewCat(prev => ({ ...prev!, name: e.target.value }))}
                    placeholder="Cat name"
                    className="max-w-[200px]"
                    autoFocus
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={newCat.wetFoodId?.toString()}
                    onValueChange={(value) => setNewCat(prev => ({ ...prev!, wetFoodId: parseInt(value) }))}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {wetFoods.map(food => (
                        <SelectItem key={food.id} value={food.id.toString()}>
                          {food.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={newCat.dryFoodId?.toString()}
                    onValueChange={(value) => setNewCat(prev => ({ ...prev!, dryFoodId: parseInt(value) }))}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dryFoods.map(food => (
                        <SelectItem key={food.id} value={food.id.toString()}>
                          {food.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newCat.targetCalories || ''}
                    onChange={(e) => setNewCat(prev => ({ ...prev!, targetCalories: parseFloat(e.target.value) }))}
                    className="w-[100px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newCat.weight || ''}
                    onChange={(e) => setNewCat(prev => ({ ...prev!, weight: parseFloat(e.target.value) }))}
                    className="w-[100px]"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={newCat.weightUnit}
                    onValueChange={(value) => setNewCat(prev => ({ ...prev!, weightUnit: value }))}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEIGHT_UNITS.map(unit => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button 
                    onClick={handleSaveNew}
                    disabled={!newCat.name || !newCat.wetFoodId || !newCat.dryFoodId || !newCat.targetCalories || !newCat.weight}
                    size="sm"
                  >
                    Save
                  </Button>
                </TableCell>
              </TableRow>
            )}
            
            {localCats.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell>
                  <Input
                    value={cat.name}
                    onChange={(e) => handleLocalUpdate(cat.id, 'name', e.target.value)}
                    className="max-w-[200px]"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={cat.wetFoodId.toString()}
                    onValueChange={(value) => handleLocalUpdate(cat.id, 'wetFoodId', parseInt(value))}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue>
                        {foods.find(f => f.id === cat.wetFoodId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {wetFoods.map(food => (
                        <SelectItem key={food.id} value={food.id.toString()}>
                          {food.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={cat.dryFoodId.toString()}
                    onValueChange={(value) => handleLocalUpdate(cat.id, 'dryFoodId', parseInt(value))}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue>
                        {foods.find(f => f.id === cat.dryFoodId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {dryFoods.map(food => (
                        <SelectItem key={food.id} value={food.id.toString()}>
                          {food.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={cat.targetCalories}
                    onChange={(e) => handleLocalUpdate(cat.id, 'targetCalories', parseFloat(e.target.value))}
                    className="w-[100px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={cat.weight}
                    onChange={(e) => handleLocalUpdate(cat.id, 'weight', parseFloat(e.target.value))}
                    className="w-[100px]"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={cat.weightUnit}
                    onValueChange={(value) => handleLocalUpdate(cat.id, 'weightUnit', value)}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEIGHT_UNITS.map(unit => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteItem({ id: cat.id, name: cat.name })}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <DeleteConfirmation
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && handleDelete(deleteItem.id, deleteItem.name)}
        title="Delete Cat"
        description={`Are you sure you want to delete ${deleteItem?.name}? This will also delete all their meal history. This action cannot be undone.`}
      />
    </div>
  )
} 