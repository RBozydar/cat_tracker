import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  catId: z.number().positive(),
  foodType: z.enum(['WET', 'DRY']),
  weight: z.number().positive()
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = createSchema.parse(body)
    
    const meal = await prisma.meal.create({
      data: validated,
      include: {
        cat: true
      }
    })
    
    return NextResponse.json(meal)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Creation failed' }, { status: 500 })
  }
}

export async function GET() {
  const meals = await prisma.meal.findMany({
    include: {
      cat: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  
  return NextResponse.json(meals)
} 