import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const cats = await prisma.cat.findMany()
  return NextResponse.json(cats)
} 