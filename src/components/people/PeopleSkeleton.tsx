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
        <div className="flex flex-col gap-4 pb-6 border-b border-[#E6E2F0]">
          <div className="h-4 w-28 bg-[#E6E2F0] rounded-md"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#E6E2F0]"></div>
              <div className="flex flex-col gap-2">
                <div className="h-3 w-16 bg-[#E6E2F0] rounded-md"></div>
                <div className="h-6 w-48 bg-[#E6E2F0] rounded-md"></div>
                <div className="h-3.5 w-64 bg-[#E6E2F0] rounded-md"></div>
              </div>
            </div>
            <div className="h-9 w-28 bg-[#E6E2F0] rounded-xl hidden sm:block"></div>
          </div>
        </div>

        {/* 3 Overview KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#E6E2F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between h-28"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 bg-[#E6E2F0] rounded-md"></div>
                <div className="w-8 h-8 rounded-xl bg-[#E6E2F0]"></div>
              </div>
              <div className="h-7 w-16 bg-[#E6E2F0] rounded-md"></div>
            </div>
          ))}
        </div>

        {/* Event History Card Skeleton */}
        <div className="bg-white border border-[#E6E2F0] rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <div className="h-5 w-40 bg-[#E6E2F0] rounded-md"></div>
          <div className="h-16 w-full bg-[#FAF9FF] border border-[#E6E2F0] rounded-xl"></div>
          <div className="h-16 w-full bg-[#FAF9FF] border border-[#E6E2F0] rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Directory Table Skeleton */}
      <div className="bg-white border border-[#E6E2F0] rounded-2xl shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="bg-[#FAF9FF] border-b border-[#E6E2F0] px-4 py-3 flex items-center justify-between">
          <div className="h-3.5 w-24 bg-[#E6E2F0] rounded-md"></div>
          <div className="h-3.5 w-32 bg-[#E6E2F0] rounded-md hidden sm:block"></div>
          <div className="h-3.5 w-20 bg-[#E6E2F0] rounded-md hidden md:block"></div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="divide-y divide-[#E6E2F0]">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E6E2F0] shrink-0"></div>
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 w-32 bg-[#E6E2F0] rounded-md"></div>
                  <div className="h-3 w-24 bg-[#E6E2F0] rounded-md"></div>
                </div>
              </div>
              <div className="h-3.5 w-40 bg-[#E6E2F0] rounded-md hidden sm:block"></div>
              <div className="h-3.5 w-24 bg-[#E6E2F0] rounded-md hidden md:block"></div>
              <div className="h-5 w-16 bg-[#E6E2F0] rounded-md"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
