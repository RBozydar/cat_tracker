import { GET, PATCH } from '../portion-settings/route'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Mock NextResponse
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextResponse: {
    json: (data: any, init?: ResponseInit) => {
      return new Response(JSON.stringify(data), init)
    }
  }
}))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    portionSettings: {
      findFirst: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

describe('Portion Settings API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('returns existing settings', async () => {
      const mockSettings = {
        id: 1,
        suggestPortionSizes: true,
        mealsPerDay: 3,
      }

      ;(prisma.portionSettings.findFirst as jest.Mock).mockResolvedValue(mockSettings)

      const response = await GET()
      const data = await response.json()

      expect(data).toEqual(mockSettings)
    })

    it('creates default settings if none exist', async () => {
      const mockSettings = {
        id: 1,
        suggestPortionSizes: false,
        mealsPerDay: 2,
      }

      ;(prisma.portionSettings.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.portionSettings.create as jest.Mock).mockResolvedValue(mockSettings)

      const request = new NextRequest('http://localhost:3000/api/portion-settings')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual(mockSettings)
      expect(prisma.portionSettings.create).toHaveBeenCalledWith({
        data: {
          suggestPortionSizes: false,
          mealsPerDay: 2,
        },
      })
    })
  })

  describe('PATCH', () => {
    it('updates existing settings', async () => {
      const mockSettings = {
        id: 1,
        suggestPortionSizes: true,
        mealsPerDay: 4,
      }

      ;(prisma.portionSettings.upsert as jest.Mock).mockResolvedValue(mockSettings)

      const request = new NextRequest('http://localhost:3000/api/portion-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          suggestPortionSizes: true,
          mealsPerDay: 4,
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(data).toEqual(mockSettings)
      expect(prisma.portionSettings.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: {
          suggestPortionSizes: true,
          mealsPerDay: 4,
        },
        create: {
          suggestPortionSizes: true,
          mealsPerDay: 4,
        },
      })
    })

    it('validates input data', async () => {
      const request = new NextRequest('http://localhost:3000/api/portion-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          mealsPerDay: 0, // Invalid value
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')
    })
  })
}) 