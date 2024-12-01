import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { catsSchema } from '@/lib/schemas'

const createSchema = z.object({
  name: z.string().min(1),
  wetFoodId: z.number().positive(),
  dryFoodId: z.number().positive(),
  targetCalories: z.number().positive(),
  weight: z.number().positive(),
  weightUnit: z.enum(['kg', 'lbs'])
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = createSchema.parse(body)
    
    const cat = await prisma.cat.create({
      data: validated
    })
    
    return NextResponse.json(cat)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Creation failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const cats = await prisma.cat.findMany({
      orderBy: { id: 'asc' },
      include: {
        wetFood: true,
        dryFood: true
      }
    })

    const validated = catsSchema.parse(cats)
    return NextResponse.json(validated)
  } catch (error) {
    console.error('Failed to fetch cats:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid data format', 
        details: error.errors 
      }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to fetch cats' }, { status: 500 })
  }
} 