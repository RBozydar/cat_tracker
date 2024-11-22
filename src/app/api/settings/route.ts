import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  foodType: z.enum(['WET', 'DRY']),
  calories: z.number().min(0),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = createSchema.parse(body)
    
    const created = await prisma.foodSettings.create({
      data: validated,
    })
    
    return NextResponse.json(created)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Creation failed' }, { status: 500 })
  }
}

export async function GET() {
  const settings = await prisma.foodSettings.findMany({
    orderBy: { id: 'asc' }
  })
  return NextResponse.json(settings)
} 