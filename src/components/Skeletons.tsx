'use client';

import React from 'react';

// Micro-primitives
export function SkeletonBox({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-slate-200/80 dark:bg-white/[0.06] animate-pulse rounded-xl ${className}`}
    />
  );
}

export function SkeletonCircle({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div
      className={`bg-slate-200/80 dark:bg-white/[0.06] animate-pulse rounded-full shrink-0 ${className}`}
    />
  );
}

export function SkeletonText({ className = 'w-full h-4' }: { className?: string }) {
  return (
    <div
      className={`bg-slate-200/80 dark:bg-white/[0.06] animate-pulse rounded-md ${className}`}
    />
  );
}

// 1. Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Banner */}
      <div className="modern-card p-6 relative overflow-hidden bg-gradient-to-r from-indigo-900/10 via-purple-900/5 to-transparent border-indigo-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SkeletonBox className="w-36 h-5 rounded-full" />
              <SkeletonBox className="w-48 h-4 rounded-md" />
            </div>
            <SkeletonBox className="w-64 h-7 rounded-lg" />
            <SkeletonBox className="w-80 sm:w-96 h-4 rounded-md" />
          </div>
          <div className="flex items-center gap-2.5">
            <SkeletonBox className="w-32 h-8 rounded-xl" />
            <SkeletonBox className="w-28 h-8 rounded-xl" />
          </div>
        </div>
      </div>

      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="modern-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBox className="w-24 h-4 rounded-md" />
              <SkeletonCircle className="w-8 h-8 rounded-xl" />
            </div>
            <div className="space-y-1">
              <SkeletonBox className="w-28 h-7 rounded-lg" />
              <SkeletonBox className="w-36 h-3 rounded-md" />
            </div>
            <SkeletonBox className="w-full h-2 rounded-full" />
          </div>
        ))}
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Scorecard */}
          <div className="modern-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <SkeletonBox className="w-44 h-5 rounded-md" />
                <SkeletonBox className="w-64 h-3 rounded-md" />
              </div>
              <SkeletonBox className="w-24 h-6 rounded-full" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] space-y-2">
                  <SkeletonBox className="w-20 h-3 rounded-md" />
                  <SkeletonBox className="w-16 h-6 rounded-lg" />
                  <SkeletonBox className="w-28 h-3 rounded-md" />
                </div>
              ))}
            </div>
            <SkeletonBox className="w-full h-2.5 rounded-full" />
          </div>

          {/* Today's Activities */}
          <div className="modern-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonBox className="w-40 h-5 rounded-md" />
              <SkeletonBox className="w-24 h-6 rounded-lg" />
            </div>
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <SkeletonCircle className="w-8 h-8 rounded-lg" />
                    <div className="space-y-1">
                      <SkeletonBox className="w-32 h-4 rounded-md" />
                      <SkeletonBox className="w-48 h-3 rounded-md" />
                    </div>
                  </div>
                  <SkeletonBox className="w-16 h-5 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Priority Tickets */}
        <div className="space-y-6">
          <div className="modern-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonBox className="w-36 h-5 rounded-md" />
              <SkeletonBox className="w-12 h-4 rounded-md" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <SkeletonBox className="w-20 h-4 rounded-md" />
                    <SkeletonBox className="w-16 h-4 rounded-full" />
                  </div>
                  <SkeletonBox className="w-full h-4 rounded-md" />
                  <div className="flex items-center justify-between pt-1">
                    <SkeletonBox className="w-24 h-3 rounded-md" />
                    <SkeletonCircle className="w-6 h-6 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Activities / Timesheet Skeleton
export function ActivitiesSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <SkeletonBox className="w-64 h-7 rounded-lg" />
          <SkeletonBox className="w-96 h-4 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <SkeletonBox className="w-24 h-8 rounded-lg" />
          <SkeletonBox className="w-32 h-8 rounded-lg" />
        </div>
      </div>

      <div className="modern-card p-4 flex items-center justify-between border-indigo-500/30">
        <div className="flex items-center gap-3">
          <SkeletonCircle className="w-9 h-9 rounded-xl" />
          <div className="space-y-1">
            <SkeletonBox className="w-36 h-4 rounded-md" />
            <SkeletonBox className="w-56 h-3 rounded-md" />
          </div>
        </div>
        <SkeletonBox className="w-28 h-6 rounded-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="modern-card p-4 space-y-2">
            <SkeletonBox className="w-28 h-3 rounded-md" />
            <SkeletonBox className="w-20 h-6 rounded-lg" />
            <SkeletonBox className="w-36 h-2.5 rounded-full" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="modern-card overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <SkeletonBox className="w-48 h-5 rounded-md" />
          <SkeletonBox className="w-28 h-8 rounded-lg" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.04] gap-4">
              <SkeletonBox className="w-24 h-5 rounded-md" />
              <SkeletonBox className="w-32 h-4 rounded-md" />
              <SkeletonBox className="w-48 h-4 rounded-md flex-1 hidden md:block" />
              <SkeletonBox className="w-24 h-4 rounded-md" />
              <SkeletonBox className="w-16 h-4 rounded-md" />
              <SkeletonCircle className="w-7 h-7 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 3. Attendance Skeleton
export function AttendanceSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <SkeletonBox className="w-72 h-7 rounded-lg" />
          <SkeletonBox className="w-96 h-4 rounded-md" />
        </div>
        <SkeletonBox className="w-36 h-8 rounded-xl" />
      </div>

      {/* Punch Clock Banner */}
      <div className="modern-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-indigo-500/20">
        <div className="flex items-center gap-4">
          <SkeletonCircle className="w-14 h-14 rounded-2xl" />
          <div className="space-y-1.5">
            <SkeletonBox className="w-32 h-4 rounded-md" />
            <SkeletonBox className="w-48 h-7 rounded-lg" />
            <SkeletonBox className="w-56 h-3 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-32 h-10 rounded-xl" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="modern-card p-4 space-y-2">
            <SkeletonBox className="w-24 h-3 rounded-md" />
            <SkeletonBox className="w-20 h-6 rounded-lg" />
            <SkeletonBox className="w-32 h-3 rounded-md" />
          </div>
        ))}
      </div>

      {/* Team Attendance Table Skeleton */}
      <div className="modern-card overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <SkeletonBox className="w-44 h-5 rounded-md" />
          <SkeletonBox className="w-28 h-7 rounded-lg" />
        </div>
        <div className="p-4 space-y-2.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] gap-4">
              <div className="flex items-center gap-3">
                <SkeletonCircle className="w-9 h-9 rounded-full" />
                <div className="space-y-1">
                  <SkeletonBox className="w-32 h-4 rounded-md" />
                  <SkeletonBox className="w-24 h-3 rounded-md" />
                </div>
              </div>
              <SkeletonBox className="w-20 h-5 rounded-full" />
              <SkeletonBox className="w-24 h-4 rounded-md hidden sm:block" />
              <SkeletonBox className="w-16 h-4 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 4. Tickets Board Skeleton
export function TicketsSkeleton({ viewMode = 'board' }: { viewMode?: 'board' | 'table' }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <SkeletonBox className="w-72 h-7 rounded-lg" />
          <SkeletonBox className="w-96 h-4 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <SkeletonBox className="w-32 h-8 rounded-xl" />
          <SkeletonBox className="w-24 h-8 rounded-xl" />
          <SkeletonBox className="w-28 h-8 rounded-xl" />
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Backlog', 'In Progress', 'Review', 'Completed'].map((col) => (
            <div key={col} className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                <SkeletonBox className="w-24 h-4 rounded-md" />
                <SkeletonCircle className="w-5 h-5 rounded-full" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="modern-card p-4 space-y-3 border-slate-200/80 dark:border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <SkeletonBox className="w-20 h-4 rounded-md" />
                      <SkeletonBox className="w-14 h-4 rounded-full" />
                    </div>
                    <SkeletonBox className="w-full h-5 rounded-md" />
                    <SkeletonBox className="w-3/4 h-3 rounded-md" />
                    <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                      <SkeletonBox className="w-16 h-3 rounded-md" />
                      <SkeletonCircle className="w-6 h-6 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="modern-card p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] gap-4">
              <SkeletonBox className="w-24 h-4 rounded-md" />
              <SkeletonBox className="w-48 h-4 rounded-md flex-1" />
              <SkeletonBox className="w-20 h-5 rounded-full" />
              <SkeletonBox className="w-20 h-4 rounded-md" />
              <SkeletonCircle className="w-7 h-7 rounded-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 5. Approvals Queue Skeleton
export function ApprovalsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <SkeletonBox className="w-64 h-7 rounded-lg" />
          <SkeletonBox className="w-96 h-4 rounded-md" />
        </div>
        <SkeletonBox className="w-36 h-8 rounded-xl" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="modern-card p-5 space-y-4 border-indigo-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
              <div className="flex items-center gap-3">
                <SkeletonCircle className="w-10 h-10 rounded-full" />
                <div className="space-y-1">
                  <SkeletonBox className="w-36 h-5 rounded-md" />
                  <SkeletonBox className="w-48 h-3 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBox className="w-24 h-5 rounded-full" />
                <SkeletonBox className="w-24 h-5 rounded-full" />
              </div>
            </div>

            <div className="space-y-2">
              {[1, 2].map((k) => (
                <div key={k} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <SkeletonBox className="w-28 h-4 rounded-md" />
                    <SkeletonBox className="w-64 h-3 rounded-md" />
                  </div>
                  <SkeletonBox className="w-16 h-4 rounded-md" />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <SkeletonBox className="w-full sm:w-80 h-8 rounded-lg" />
              <div className="flex items-center gap-2 shrink-0">
                <SkeletonBox className="w-20 h-8 rounded-lg" />
                <SkeletonBox className="w-24 h-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. KPI Scorecard Skeleton
export function KpiSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <SkeletonBox className="w-80 h-7 rounded-lg" />
          <SkeletonBox className="w-full max-w-xl h-4 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox className="w-36 h-8 rounded-xl" />
          <SkeletonBox className="w-28 h-8 rounded-xl" />
        </div>
      </div>

      {/* KPI Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="modern-card p-4 space-y-2">
            <SkeletonBox className="w-28 h-3 rounded-md" />
            <SkeletonBox className="w-20 h-7 rounded-lg" />
            <SkeletonBox className="w-32 h-3 rounded-md" />
          </div>
        ))}
      </div>

      {/* Sub-tab navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.08] pb-2">
        <SkeletonBox className="w-28 h-7 rounded-lg" />
        <SkeletonBox className="w-28 h-7 rounded-lg" />
        <SkeletonBox className="w-28 h-7 rounded-lg" />
      </div>

      {/* KPI Spreadsheet Table Skeleton */}
      <div className="modern-card overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <div className="space-y-1">
            <SkeletonBox className="w-48 h-5 rounded-md" />
            <SkeletonBox className="w-64 h-3 rounded-md" />
          </div>
          <SkeletonBox className="w-28 h-7 rounded-lg" />
        </div>
        <div className="p-4 space-y-2.5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] gap-3">
              <div className="flex items-center gap-3 w-40">
                <SkeletonCircle className="w-8 h-8 rounded-full" />
                <div className="space-y-1">
                  <SkeletonBox className="w-24 h-4 rounded-md" />
                  <SkeletonBox className="w-16 h-3 rounded-md" />
                </div>
              </div>
              <SkeletonBox className="w-16 h-4 rounded-md hidden sm:block" />
              <SkeletonBox className="w-16 h-4 rounded-md" />
              <SkeletonBox className="w-16 h-4 rounded-md" />
              <SkeletonBox className="w-16 h-4 rounded-md hidden md:block" />
              <SkeletonBox className="w-20 h-5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 7. Blockers Skeleton
export function BlockersSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <SkeletonBox className="w-64 h-7 rounded-lg" />
          <SkeletonBox className="w-96 h-4 rounded-md" />
        </div>
        <SkeletonBox className="w-32 h-8 rounded-xl" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="modern-card p-5 space-y-3 border-rose-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SkeletonBox className="w-20 h-5 rounded-full" />
                <SkeletonBox className="w-28 h-4 rounded-md" />
              </div>
              <SkeletonBox className="w-16 h-4 rounded-md" />
            </div>
            <SkeletonBox className="w-full h-5 rounded-md" />
            <SkeletonBox className="w-3/4 h-3.5 rounded-md" />
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <SkeletonCircle className="w-6 h-6 rounded-full" />
                <SkeletonBox className="w-24 h-3 rounded-md" />
              </div>
              <SkeletonBox className="w-20 h-7 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 8. Leave Planner Skeleton
export function LeaveSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <SkeletonBox className="w-64 h-7 rounded-lg" />
          <SkeletonBox className="w-96 h-4 rounded-md" />
        </div>
        <SkeletonBox className="w-32 h-8 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="modern-card p-4 space-y-2">
            <SkeletonBox className="w-20 h-3 rounded-md" />
            <SkeletonBox className="w-16 h-6 rounded-lg" />
            <SkeletonBox className="w-24 h-3 rounded-md" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="modern-card p-6 space-y-4">
          <SkeletonBox className="w-40 h-5 rounded-md" />
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between">
                <div className="space-y-1">
                  <SkeletonBox className="w-28 h-4 rounded-md" />
                  <SkeletonBox className="w-40 h-3 rounded-md" />
                </div>
                <SkeletonBox className="w-16 h-4 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="modern-card p-6 space-y-4">
          <SkeletonBox className="w-40 h-5 rounded-md" />
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SkeletonCircle className="w-8 h-8 rounded-full" />
                  <div className="space-y-1">
                    <SkeletonBox className="w-32 h-4 rounded-md" />
                    <SkeletonBox className="w-24 h-3 rounded-md" />
                  </div>
                </div>
                <SkeletonBox className="w-20 h-5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 9. Generic Tab Skeleton (for timeline, reports, audit, settings, god, api-docs)
export function GenericTabSkeleton({ title = 'Loading Workspace Module...' }: { title?: string }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="space-y-1">
        <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{title}</h1>
        <SkeletonBox className="w-80 h-4 rounded-md" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="modern-card p-4 space-y-2">
            <SkeletonBox className="w-24 h-3 rounded-md" />
            <SkeletonBox className="w-16 h-6 rounded-lg" />
            <SkeletonBox className="w-32 h-3 rounded-md" />
          </div>
        ))}
      </div>

      <div className="modern-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
          <SkeletonBox className="w-40 h-5 rounded-md" />
          <SkeletonBox className="w-24 h-7 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] gap-4">
              <SkeletonBox className="w-36 h-4 rounded-md" />
              <SkeletonBox className="w-64 h-4 rounded-md flex-1 hidden md:block" />
              <SkeletonBox className="w-24 h-5 rounded-full" />
              <SkeletonBox className="w-20 h-4 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
