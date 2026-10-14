import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return <Skeleton className="h-40 w-full rounded-xl" />
}
