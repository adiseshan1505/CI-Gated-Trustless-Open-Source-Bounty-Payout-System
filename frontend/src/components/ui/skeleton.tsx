import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton rounded-neu-sm", className)} {...props} />;
}

export function BountyCardSkeleton() {
  return (
    <div className="neu-panel space-y-4 p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
