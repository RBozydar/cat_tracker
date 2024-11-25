'use client'

import { useState, useEffect } from 'react'
import { CatButtons } from './cat-buttons'
import { CatSelect } from './cat-select'

export interface ResponsiveCatSelectorProps {
  value?: number | null
  onChange: (catId: number | null) => void
  includeAll?: boolean
  placeholder?: string
  label?: string
  breakpoint?: number // Custom breakpoint in pixels
}

export function ResponsiveCatSelector({
  value,
  onChange,
  includeAll = false,
  placeholder,
  label,
  breakpoint = 640 // Default to sm breakpoint
}: ResponsiveCatSelectorProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Initial check
    const checkWidth = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }
    checkWidth()

    // Add resize listener
    window.addEventListener('resize', checkWidth)

    // Cleanup
    return () => window.removeEventListener('resize', checkWidth)
  }, [breakpoint])

  if (isMobile) {
    return (
      <CatSelect
        value={value}
        onChange={onChange}
        includeAll={includeAll}
        placeholder={placeholder}
        label={label}
      />
    )
  }

  return (
    <CatButtons
      value={value}
      onChange={onChange}
      includeAll={includeAll}
    />
  )
} 