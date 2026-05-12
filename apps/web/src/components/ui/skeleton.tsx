import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export function TransactionListSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((group) => (
        <div key={group}>
          <Skeleton className="h-4 w-32 mb-2" />
          <div className="bg-card border rounded-lg divide-y">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 p-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-card border rounded-lg p-4 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Skeleton className="w-5 h-5 rounded-full" />
      <Skeleton className="h-4 flex-1 max-w-[60%]" />
    </div>
  );
}

export { Skeleton };
