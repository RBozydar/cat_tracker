import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { HistoryClient } from '@/components/history-client'

export default async function HistoryPage() {
  const cats = await prisma.cat.findMany({
    include: {
      wetFood: true,
      dryFood: true
    }
  })

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HistoryClient initialCats={cats} />
    </Suspense>
  )
} 