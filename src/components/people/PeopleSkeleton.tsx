'use client';

import React from 'react';

interface PeopleSkeletonProps {
  variant?: 'directory' | 'detail';
}

export function PeopleSkeleton({ variant = 'directory' }: PeopleSkeletonProps) {
  if (variant === 'detail') {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        {/* Detail Header Skeleton */}
        <div className="flex flex-col gap-4 pb-6 border-b border-ds-line">
          <div className="h-4 w-28 bg-ds-line rounded-md"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-ds-line"></div>
              <div className="flex flex-col gap-2">
                <div className="h-3 w-16 bg-ds-line rounded-md"></div>
                <div className="h-6 w-48 bg-ds-line rounded-md"></div>
                <div className="h-3.5 w-64 bg-ds-line rounded-md"></div>
              </div>
            </div>
            <div className="h-9 w-28 bg-ds-line rounded-xl hidden sm:block"></div>
          </div>
        </div>

        {/* 3 Overview KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-ds-line rounded-2xl p-5 shadow-xs flex flex-col justify-between h-28"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 bg-ds-line rounded-md"></div>
                <div className="w-8 h-8 rounded-xl bg-ds-line"></div>
              </div>
              <div className="h-7 w-16 bg-ds-line rounded-md"></div>
            </div>
          ))}
        </div>

        {/* Event History Card Skeleton */}
        <div className="bg-white border border-ds-line rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <div className="h-5 w-40 bg-ds-line rounded-md"></div>
          <div className="h-16 w-full bg-ds-subtle border border-ds-line rounded-xl"></div>
          <div className="h-16 w-full bg-ds-subtle border border-ds-line rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Directory Table Skeleton */}
      <div className="bg-white border border-ds-line rounded-2xl shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="bg-ds-subtle border-b border-ds-line px-4 py-3 flex items-center justify-between">
          <div className="h-3.5 w-24 bg-ds-line rounded-md"></div>
          <div className="h-3.5 w-32 bg-ds-line rounded-md hidden sm:block"></div>
          <div className="h-3.5 w-20 bg-ds-line rounded-md hidden md:block"></div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="divide-y divide-ds-line">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-ds-line shrink-0"></div>
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 w-32 bg-ds-line rounded-md"></div>
                  <div className="h-3 w-24 bg-ds-line rounded-md"></div>
                </div>
              </div>
              <div className="h-3.5 w-40 bg-ds-line rounded-md hidden sm:block"></div>
              <div className="h-3.5 w-24 bg-ds-line rounded-md hidden md:block"></div>
              <div className="h-5 w-16 bg-ds-line rounded-md"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
