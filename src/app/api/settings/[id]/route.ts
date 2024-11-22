import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  foodType: z.enum(['WET', 'DRY']).optional(),
  calories: z.number().min(0).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = await Promise.resolve(params.id)
    const body = await request.json()
    const validated = updateSchema.parse(body)
    
    const updated = await prisma.foodSettings.update({
      where: { id: parseInt(id) },
      data: validated,
    })
    
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = await Promise.resolve(params.id)
    
    await prisma.foodSettings.delete({
      where: { id: parseInt(id) },
    })
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
} 