import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-xl border p-4 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="w-10 h-5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
