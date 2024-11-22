import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.meal.deleteMany()
  await prisma.cat.deleteMany()
  await prisma.foodSettings.deleteMany()

  // Create default food settings first
  const wetFood = await prisma.foodSettings.create({
    data: {
      name: "Royal Canin Wet",
      foodType: "WET",
      calories: 117,
      catsWet: { create: [] }
    }
  })

  const dryFood = await prisma.foodSettings.create({
    data: {
      name: "Royal Canin Dry",
      foodType: "DRY",
      calories: 370,
      catsDry: { create: [] }
    }
  })

  // Create cats with proper relations
  await Promise.all([
    prisma.cat.create({
      data: {
        name: 'Ahmed',
        wetFood: { connect: { id: wetFood.id } },
        dryFood: { connect: { id: dryFood.id } },
        targetCalories: 250,
        weight: 4.5,
        weightUnit: 'kg'
      }
    }),
    prisma.cat.create({
      data: {
        name: 'Knypson',
        wetFood: { connect: { id: wetFood.id } },
        dryFood: { connect: { id: dryFood.id } },
        targetCalories: 220,
        weight: 3.8,
        weightUnit: 'kg'
      }
    }),
    prisma.cat.create({
      data: {
        name: 'Lila',
        wetFood: { connect: { id: wetFood.id } },
        dryFood: { connect: { id: dryFood.id } },
        targetCalories: 200,
        weight: 3.2,
        weightUnit: 'kg'
      }
    })
  ])
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 