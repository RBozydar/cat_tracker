import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { localDateToUTC, debugTimezone, getLastNDaysRange } from '@/lib/date-utils'

const createSchema = z.object({
  catId: z.number().positive(),
  foodType: z.enum(['WET', 'DRY']),
  weight: z.number().positive(),
  timezone: z.string()
})

interface WhereClause {
  catId?: number
  createdAt?: {
    gte: string
    lte: string
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = createSchema.parse(body)
    
    const now = new Date()
    debugTimezone(now, 'Before UTC conversion')
    const createdAt = localDateToUTC(now, validated.timezone)
    debugTimezone(createdAt, 'After UTC conversion')
    
    const meal = await prisma.meal.create({
      data: {
        catId: validated.catId,
        foodType: validated.foodType,
        weight: validated.weight,
        createdAt
      },
      include: {
        cat: {
          include: {
            wetFood: true,
            dryFood: true
          }
        }
      }
    })
    
    return NextResponse.json(meal)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    console.error('Failed to create meal:', error)
    return NextResponse.json({ error: 'Creation failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const catId = searchParams.get('catId')
  const dateStr = searchParams.get('date')
  const timezone = searchParams.get('timezone') || 'UTC'

  try {
    const whereClause: WhereClause = {}
    
    if (catId) {
      whereClause.catId = parseInt(catId)
    }

    if (dateStr) {
      const date = new Date(dateStr)
      const startOfDay = new Date(date)
      const endOfDay = new Date(date)
      
      startOfDay.setHours(0, 0, 0, 0)
      endOfDay.setHours(23, 59, 59, 999)

      whereClause.createdAt = {
        gte: localDateToUTC(startOfDay, timezone),
        lte: localDateToUTC(endOfDay, timezone)
      }
    } else {
      const { start, end } = getLastNDaysRange(7)
      whereClause.createdAt = {
        gte: start.toISOString(),
        lte: end.toISOString()
      }
    }

    const meals = await prisma.meal.findMany({
      where: whereClause,
      include: {
        cat: {
          include: {
            wetFood: true,
            dryFood: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(meals)
  } catch (error) {
    console.error('Failed to fetch meals:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch meals',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 