import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  suggestPortionSizes: z.boolean().optional(),
  mealsPerDay: z.number().min(1).max(10).optional(),
})

export async function GET() {
  try {
    // Get the first record or create default settings if none exist
    let settings = await prisma.portionSettings.findFirst()
    
    if (!settings) {
      settings = await prisma.portionSettings.create({
        data: {
          suggestPortionSizes: false,
          mealsPerDay: 2
        }
      })
    }
    
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Failed to fetch portion settings:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch portion settings',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = updateSchema.parse(body)
    
    // Update the first record or create if none exists
    const settings = await prisma.portionSettings.upsert({
      where: { id: 1 },
      update: validated,
      create: {
        ...validated,
        suggestPortionSizes: validated.suggestPortionSizes ?? false,
        mealsPerDay: validated.mealsPerDay ?? 2
      }
    })
    
    return NextResponse.json(settings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to update portion settings' },
      { status: 500 }
    )
  }
} 