import { Skeleton } from "@/components/ui/skeleton";

export default function ThreadLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-24" />
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-6 w-3/4" />
        <div className="flex gap-3 items-center">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-5 w-32" />
      {[1, 2].map((i) => (
        <div key={i} className="bg-card rounded-xl border p-4 space-y-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
