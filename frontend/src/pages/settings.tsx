import { CatsCard } from '@/components/settings/cats-card'
import { FoodsCard } from '@/components/settings/foods-card'
import { HouseholdCard } from '@/components/settings/household-card'

export default function SettingsPage() {
  return (
    <section className="grid gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <FoodsCard />
      <CatsCard />
      <HouseholdCard />
    </section>
  )
}
