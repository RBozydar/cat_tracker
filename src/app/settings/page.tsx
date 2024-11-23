import { FoodSettingsTable } from '@/components/food-settings-table'
import { CatSettingsTable } from '@/components/cat-settings-table'
import { PortionSettingsForm } from '@/components/portion-settings'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  return (
    <main className="container mx-auto py-10">
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold mb-8">Food Settings</h2>
          <FoodSettingsTable />
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-3xl font-bold mb-8">Cat Settings</h2>
          <CatSettingsTable />
        </div>

        <Separator />
        
        <div>
          <h2 className="text-3xl font-bold mb-8">Portion Settings</h2>
          <PortionSettingsForm />
        </div>
      </div>
    </main>
  )
} 