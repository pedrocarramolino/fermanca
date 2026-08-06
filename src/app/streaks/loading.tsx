import { AppHeader } from "@/components/app-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32 md:max-w-3xl lg:max-w-4xl">
      <AppHeader />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <Skeleton className="h-48 rounded-lg" />
    </main>
  );
}
