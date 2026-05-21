import { Skeleton } from "@/components/ui/skeleton";

export default function OrgLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-10 w-full" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="bg-card rounded-xl border p-4 flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
