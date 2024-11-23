import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.meal.deleteMany()
  await prisma.cat.deleteMany()
  await prisma.foodSettings.deleteMany()
  await prisma.portionSettings.deleteMany()

  // Create default food settings first
  const wetFood = await prisma.foodSettings.create({
    data: {
      name: "LovCat",
      foodType: "WET",
      calories: 117
    }
  })

  const [fitTrim, kitten] = await Promise.all([
    prisma.foodSettings.create({
      data: {
        name: "Orijen Fit & Trim",
        foodType: "DRY",
        calories: 370
      }
    }),
    prisma.foodSettings.create({
      data: {
        name: "Orijen Kitten",
        foodType: "DRY",
        calories: 370
      }
    })
  ])

  // Create cats with direct ID references
  await Promise.all([
    prisma.cat.create({
      data: {
        name: 'Ahmed',
        wetFoodId: wetFood.id,
        dryFoodId: fitTrim.id,
        targetCalories: 200,
        weight: 5.5,
        weightUnit: 'kg'
      }
    }),
    prisma.cat.create({
      data: {
        name: 'Knypson',
        wetFoodId: wetFood.id,
        dryFoodId: kitten.id,
        targetCalories: 235,
        weight: 2.15,
        weightUnit: 'kg'
      }
    }),
    prisma.cat.create({
      data: {
        name: 'Lila',
        wetFoodId: wetFood.id,
        dryFoodId: kitten.id,
        targetCalories: 280,
        weight: 2.4,
        weightUnit: 'kg'
      }
    })
  ])

  // Create default portion settings
  await prisma.portionSettings.create({
    data: {
      suggestPortionSizes: false,
      mealsPerDay: 2
    }
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