import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create cats first
  await prisma.cat.createMany({
    data: [
      { name: 'Ahmed' },
      { name: 'Knypson' },
      { name: 'Lila' },
    ]
  })

  // Create default food settings
  await prisma.foodSettings.createMany({
    data: [
      { foodType: 'WET', calories: 117 },  // Example: 117 kcal per 100g
      { foodType: 'DRY', calories: 370 }, // Example: 370 kcal per 100g
    ]
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 