import { Skeleton } from "@/components/admin/ui";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading lead">
      <Skeleton className="h-6 w-24" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-40 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_27rem]">
        <Skeleton className="h-[30rem] rounded-2xl" />
        <Skeleton className="h-[30rem] rounded-2xl" />
      </div>
    </div>
  );
}
