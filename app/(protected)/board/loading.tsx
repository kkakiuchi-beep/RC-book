import { Skeleton } from "@/components/ui/skeleton";

export default function BoardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-16 rounded-full" />)}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-xl border p-4 space-y-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  );
}
