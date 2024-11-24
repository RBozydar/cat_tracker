'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { logger } from '@/lib/logger'
import type { Cat } from '@/lib/types'

interface CatSelectProps {
  value?: number | null
  onChange: (catId: number | null) => void
  label?: string
  placeholder?: string
  includeAll?: boolean // Option to include "All Cats" choice
  error?: boolean
}

export function CatSelect({ 
  value, 
  onChange, 
  label = "Select Cat",
  placeholder = "Select a cat...",
  includeAll = false,
  error = false
}: CatSelectProps) {
  const [cats, setCats] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cats')
      .then(res => res.json())
      .then(data => {
        setCats(data)
        setLoading(false)
      })
      .catch(error => {
        logger.error('Failed to fetch cats:', error)
        setLoading(false)
      })
  }, [])

  if (loading) return null

  if (cats.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No cats found. Please add cats in settings.
      </div>
    )
  }

  return (
    <Select
      value={value?.toString() || ''}
      onValueChange={(val) => onChange(val === 'all' ? null : parseInt(val))}
    >
      <SelectTrigger className={error ? 'border-red-500' : ''}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{label}</SelectLabel>
          {includeAll && (
            <SelectItem value="all">All Cats</SelectItem>
          )}
          {cats.map((cat) => (
            <SelectItem key={cat.id} value={cat.id.toString()}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
} 