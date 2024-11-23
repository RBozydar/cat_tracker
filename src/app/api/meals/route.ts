import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  catId: z.number().positive(),
  foodType: z.enum(['WET', 'DRY']),
  weight: z.number().positive(),
  timezone: z.string().optional()
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = createSchema.parse(body)
    const mealData = {
      catId: validated.catId,
      foodType: validated.foodType,
      weight: validated.weight
    }
    
    const meal = await prisma.meal.create({
      data: mealData,
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
    return NextResponse.json({ error: 'Creation failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const catId = searchParams.get('catId')
  const dateStr = searchParams.get('date')
  const timezone = searchParams.get('timezone') || 'UTC'

  try {
    interface QueryParams {
      where?: {
        catId?: number;
        createdAt?: {
          gte: Date;
          lte: Date;
        };
      };
      include?: {
        cat: boolean | { include: { wetFood: boolean; dryFood: boolean } };
      };
      orderBy?: {
        createdAt: 'desc' | 'asc';
      };
    }

    const query: QueryParams = {
      include: {
        cat: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }

    if (catId) {
      query.where = {
        ...query.where,
        catId: parseInt(catId)
      }
    }

    if (dateStr) {
      const localDate = new Date(dateStr)
      const offset = new Date(localDate.toLocaleString('en-US', { timeZone: timezone })).getTimezoneOffset()
      
      const startOfDay = new Date(localDate)
      startOfDay.setHours(0, 0, 0, 0)
      startOfDay.setMinutes(startOfDay.getMinutes() - offset)
      
      const endOfDay = new Date(localDate)
      endOfDay.setHours(23, 59, 59, 999)
      endOfDay.setMinutes(endOfDay.getMinutes() - offset)

      query.where = {
        ...query.where,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    }

    const meals = await prisma.meal.findMany(query)
    return NextResponse.json(meals)
  } catch (error) {
    console.error('Failed to fetch meals:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch meals',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 