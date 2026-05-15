import { prisma } from '@/lib/db'
import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { TZDate } from '@date-fns/tz'

const updateSchema = z.object({
  catId: z.number().positive().optional(),
  foodType: z.enum(['WET', 'DRY']).optional(),
  weight: z.number().positive().optional(),
  createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }).optional(),
  timezone: z.string()
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const validated = updateSchema.parse(body)
    const mealId = parseInt(params.id)
    const requestId = request.headers.get('x-request-id')
    const timestamp = request.headers.get('x-request-timestamp')

    // Handle timezone-aware date
    const updateData = { ...validated }
    if (validated.createdAt) {
      updateData.createdAt = TZDate.tz(validated.timezone, new Date(validated.createdAt)).toISOString()
    }

    const meal = await prisma.meal.update({
      where: { id: mealId },
      data: {
        catId: updateData.catId,
        foodType: updateData.foodType,
        weight: updateData.weight,
        createdAt: updateData.createdAt,
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
    console.log('Meal updated:', meal)
    
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
    console.error('Failed to update meal:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const mealId = parseInt(params.id)
    const requestId = request.headers.get('x-request-id')
    const timestamp = request.headers.get('x-request-timestamp')
    
    // Check if meal exists first
    const meal = await prisma.meal.findUnique({
      where: { id: mealId }
    })
    
    if (!meal) {
      return NextResponse.json(
        { error: 'Meal not found' }, 
        { status: 404 }
      )
    }

    await prisma.meal.delete({
      where: { id: mealId }
    })
    
    const headers = new Headers()
    if (requestId && timestamp) {
      headers.set('x-request-id', requestId)
      headers.set('x-request-timestamp', timestamp)
    }
    
    return new NextResponse(null, { 
      headers,
      status: 204 
    })
  } catch (error) {
    console.error('Failed to delete meal:', error)
    return NextResponse.json(
      { error: 'Failed to delete meal' }, 
      { status: 500 }
    )
  }
}