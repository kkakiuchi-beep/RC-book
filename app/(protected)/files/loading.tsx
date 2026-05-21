import { Skeleton } from "@/components/ui/skeleton";

export default function FilesLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-24" />
      <div className="bg-card rounded-xl border divide-y">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
