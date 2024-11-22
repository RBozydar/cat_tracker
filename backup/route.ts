import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    // Add whatever config you need
    version: '1.0.0',
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  
  const meal = await prisma.meal.create({
    data: {
      catId: body.catId,
      foodType: body.foodType,
      weight: body.weight,
    },
  })
  
  return NextResponse.json(meal)
} 