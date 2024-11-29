import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { catSchema } from '@/lib/schemas'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  wetFoodId: z.number().positive().optional(),
  dryFoodId: z.number().positive().optional(),
  targetCalories: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  weightUnit: z.enum(['kg', 'lbs']).optional()
})

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = await Promise.resolve(params.id)
    const body = await request.json()
    const validated = updateSchema.parse(body)
    
    const updated = await prisma.cat.update({
      where: { id: parseInt(id) },
      data: validated,
      include: {
        wetFood: true,
        dryFood: true
      }
    })
    
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = await Promise.resolve(params.id)
    
    await prisma.cat.delete({
      where: { id: parseInt(id) }
    })
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Failed to delete cat:', error)
    return NextResponse.json({ 
      error: 'Delete failed', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const parsedId = parseInt((await context.params).id)
    
    const cat = await prisma.cat.findUnique({
      where: { id: parsedId },
      include: {
        wetFood: true,
        dryFood: true,
      }
    })
    
    if (!cat) {
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 })
    }

    const validated = catSchema.parse(cat)
    return NextResponse.json(validated)
  } catch (error) {
    console.error('Failed to fetch cat:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid data format', 
        details: error.errors 
      }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to fetch cat' }, { status: 500 })
  }
} 