import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const settings = await prisma.foodSettings.findMany()
  return NextResponse.json(settings)
}

export async function POST(request: Request) {
  const body = await request.json()
  
  const setting = await prisma.foodSettings.upsert({
    where: {
      foodType: body.foodType,
    },
    update: {
      calories: body.calories,
    },
    create: {
      foodType: body.foodType,
      calories: body.calories,
    },
  })
  
  return NextResponse.json(setting)
} 