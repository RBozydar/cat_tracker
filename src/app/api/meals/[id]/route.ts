import { prisma } from '@/lib/db'
import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { localDateToUTC } from '@/lib/date-utils'

const updateSchema = z.object({
  catId: z.number().positive().optional(),
  foodType: z.enum(['WET', 'DRY']).optional(),
  weight: z.number().positive().optional(),
  createdAt: z.string().datetime().optional(),
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

    // DO NOT REMOVE - TZ HANDLING
    const updateData = { ...validated }
    if (validated.createdAt) {
      updateData.createdAt = localDateToUTC(new Date(validated.createdAt), validated.timezone)
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
    
    return NextResponse.json(meal)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    console.error('Failed to update meal:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const mealId = parseInt(params.id)
    await prisma.meal.delete({
      where: { id: mealId }
    })
    
    return NextResponse.json(null, { status: 204 })
  } catch (error) {
    console.error('Failed to delete meal:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}