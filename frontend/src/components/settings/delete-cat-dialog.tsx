import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { catsApi } from '@/api/endpoints'
import { useDeleteCat } from '@/api/hooks'
import { queryKeys } from '@/api/query-keys'
import type { Cat } from '@/api/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteCatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cat: Cat
}

/**
 * Destructive confirm. Re-fetches `GET /api/cats/{id}` while open so the
 * meal count in the warning is current, not a stale list value.
 */
export function DeleteCatDialog({ open, onOpenChange, cat }: DeleteCatDialogProps) {
  const detail = useQuery({
    queryKey: queryKeys.cats.detail(cat.id),
    queryFn: () => catsApi.get(cat.id),
    enabled: open,
  })
  const deleteCat = useDeleteCat()

  const mealCount = detail.data?.meal_count ?? cat.meal_count

  function confirm() {
    deleteCat.mutate(cat.id, {
      onSuccess: () => toast.success(`${cat.name} deleted`),
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {cat.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes {cat.name},{' '}
            {mealCount === 1 ? '1 logged meal' : `${mealCount} logged meals`}, and all weigh-ins.
            There is no undo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={deleteCat.isPending} onClick={confirm}>
            Delete cat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
