import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check if we already have cats
  const existingCats = await prisma.cat.findMany()
  if (existingCats.length === 0) {
    console.log('Seeding cats...')
    await prisma.cat.createMany({
      data: [
        { name: 'Ahmed' },
        { name: 'Knypson' },
        { name: 'Lila' },
      ]
    })
  } else {
    console.log('Cats already exist, skipping...')
  }

  // Check if we already have food settings
  const existingSettings = await prisma.foodSettings.findMany()
  if (existingSettings.length === 0) {
    console.log('Seeding food settings...')
    await prisma.foodSettings.createMany({
      data: [
        { foodType: 'WET', calories: 117 },
        { foodType: 'DRY', calories: 370 },
      ]
    })
  } else {
    console.log('Food settings already exist, skipping...')
  }
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 