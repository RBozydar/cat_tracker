import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    logger.info('Creating new meal:', body)
    
    const meal = await prisma.meal.create({
      data: {
        catId: body.catId,
        foodType: body.foodType,
        weight: body.weight,
      },
      include: {
        cat: true
      }
    })
    
    logger.info('Meal created successfully:', meal.id)
    return NextResponse.json(meal)
  } catch (error: unknown) {
    logger.error('Failed to create meal:', error)
    return NextResponse.json(
      { error: 'Failed to create meal' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    logger.info('Fetching meals')
    const meals = await prisma.meal.findMany({
      include: {
        cat: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    logger.info('Meals fetched successfully:', meals.length)
    return NextResponse.json(meals)
  } catch (error: unknown) {
    logger.error('Failed to fetch meals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meals' },
      { status: 500 }
    )
  }
} 