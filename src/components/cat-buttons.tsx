'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { logger } from '@/lib/logger'
import type { Cat } from '@/lib/types'

interface CatButtonsProps {
  value?: number | null
  onChange: (catId: number | null) => void
  includeAll?: boolean // Option to include "All Cats" button
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function CatButtons({ 
  value, 
  onChange, 
  includeAll = false,
  variant = 'outline',
  size = 'default'
}: CatButtonsProps) {
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
    <div className="flex flex-wrap gap-2">
      {includeAll && (
        <Button
          variant={value === null ? 'default' : variant}
          size={size}
          onClick={() => onChange(null)}
        >
          All Cats
        </Button>
      )}
      {cats.map((cat) => (
        <Button
          key={cat.id}
          variant={value === cat.id ? 'default' : variant}
          size={size}
          onClick={() => onChange(cat.id)}
        >
          {cat.name}
        </Button>
      ))}
    </div>
  )
} 