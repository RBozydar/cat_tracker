'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function ResponsiveCatSelectorSkeleton({ breakpoint = 640 }: { breakpoint?: number }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [breakpoint])

  if (isMobile) {
    return (
      <Skeleton className="h-10 w-full rounded-md" />
    )
  }

  return (
    <div className="flex gap-2">
      {[...Array(4)].map((_, i) => (
        <Skeleton 
          key={i}
          className="h-10 w-20 rounded-full"
        />
      ))}
    </div>
  )
}