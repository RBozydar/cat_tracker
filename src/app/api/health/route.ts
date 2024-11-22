import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    }
    
    logger.info('Health check passed')
    return NextResponse.json(health)
  } catch (error: unknown) {
    logger.error('Health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Database connection failed',
      },
      { status: 503 }
    )
  }
} 