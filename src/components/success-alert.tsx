import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertTriangle } from "lucide-react"

interface SuccessAlertProps {
  title?: string
  description: string
  variant?: 'success' | 'warning'
}

export function SuccessAlert({ title = "Success", description, variant = 'success' }: SuccessAlertProps) {
  return (
    <Alert 
      variant={variant === 'warning' ? 'destructive' : 'default'}
      className={variant === 'warning' ? 'border-yellow-500 text-yellow-800 dark:text-yellow-200' : 'border-green-500 text-green-800 dark:text-green-200'}
    >
      {variant === 'warning' ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  )
} 