"use client";

import { Skeleton } from "@/components/ui/feedback";

/**
 * Meaningful skeleton screen displayed while authentication and household
 * membership state resolve (PRD §54, requirement 7).
 * Mirrors the authenticated app shell structure to prevent visual jumps.
 */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-bg" aria-busy="true" aria-label="Loading your money space">
      {/* Desktop Sidebar Placeholder */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-[rgba(255,255,255,0.6)] bg-bg/50 p-5 space-y-6">
        <div className="flex items-center gap-2.5 px-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-28 rounded-lg" />
        </div>
        <div className="space-y-2 pt-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Top Header Skeleton */}
        <header className="flex items-center justify-between border-b border-[rgba(255,255,255,0.4)] px-6 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </header>

        {/* Dashboard Body Skeleton */}
        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
          {/* Greeting & Date Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48 rounded-lg" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
            <Skeleton className="h-9 w-36 rounded-full" />
          </div>

          {/* Hero Our Money Overview Card */}
          <div className="neu-card p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-12 w-64 rounded-xl" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </div>

          {/* Charts & Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="neu-card p-6 lg:col-span-2 space-y-4">
              <Skeleton className="h-6 w-40 rounded" />
              <Skeleton className="h-56 w-full rounded-xl" />
            </div>
            <div className="neu-card p-6 space-y-4">
              <Skeleton className="h-6 w-36 rounded" />
              <Skeleton className="h-56 w-full rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
