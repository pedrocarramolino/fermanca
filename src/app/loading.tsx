import { AppHeader } from "@/components/app-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-8 p-8 pb-32 lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
      <AppHeader />
      <div className="border-border flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end">
        <Skeleton className="h-16 flex-1" />
        <Skeleton className="h-16 flex-1" />
        <Skeleton className="h-16 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-9 w-40" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </main>
  );
}
