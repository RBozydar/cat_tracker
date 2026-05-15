import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { TZDate, tz } from '@date-fns/tz'
import { format } from 'date-fns'

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
    const requestId = request.headers.get('x-request-id')
    const timestamp = request.headers.get('x-request-timestamp')
    
    const tzDate = TZDate.tz(validated.timezone)
    console.log('Creating meal with date:', {
      date: tzDate.toISOString(),
      timezone: validated.timezone
    })
    
    const meal = await prisma.meal.create({
      data: {
        catId: validated.catId,
        foodType: validated.foodType,
        weight: validated.weight,
        createdAt: tzDate
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
    
    const headers = new Headers()
    if (requestId && timestamp) {
      headers.set('x-request-id', requestId)
      headers.set('x-request-timestamp', timestamp)
    }
    
    return new NextResponse(JSON.stringify(meal), {
      headers,
      status: 200
    })
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
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const timezone = searchParams.get('timezone')
  const requestId = searchParams.get('requestId')
  const timestamp = searchParams.get('timestamp')

  if (!startDate || !timezone) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    const tzStart = TZDate.tz(timezone, new Date(startDate))
    const tzEnd = endDate ? TZDate.tz(timezone, new Date(endDate)) : tzStart

    const whereClause: WhereClause = {
      createdAt: {
        gte: format(tzStart, "yyyy-MM-dd'T'HH:mm:ss'Z'", { in: tz(timezone) }),
        lte: format(tzEnd, "yyyy-MM-dd'T'HH:mm:ss'Z'", { in: tz(timezone) })
      }
    }

    if (catId) {
      whereClause.catId = parseInt(catId)
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
    
    const headers = new Headers()
    if (requestId && timestamp) {
      headers.set('x-request-id', requestId)
      headers.set('x-request-timestamp', timestamp)
    }
    
    return new NextResponse(JSON.stringify(meals), {
      headers,
      status: 200
    })
  } catch (error) {
    console.error('Failed to fetch meals:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch meals',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 