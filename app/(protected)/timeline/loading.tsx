import { Skeleton } from "@/components/ui/skeleton";

export default function TimelineLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-36" />
      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-20 flex-1" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-xl border p-4 space-y-3">
          <div className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
