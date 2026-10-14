'use client';

import React from 'react';

export function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* 4 KPI Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white border border-[#E6E2F0] rounded-2xl p-5 h-28 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-24 h-3 bg-[#E6E2F0] rounded-md" />
              <div className="w-8 h-8 bg-[#E6E2F0] rounded-xl" />
            </div>
            <div>
              <div className="w-16 h-6 bg-[#E6E2F0] rounded-md" />
              <div className="w-32 h-2.5 bg-[#E6E2F0] rounded-md mt-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart Skeleton */}
      <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 h-[340px] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="w-48 h-4 bg-[#E6E2F0] rounded-md" />
          <div className="w-32 h-3 bg-[#E6E2F0] rounded-md" />
        </div>
        <div className="w-full h-[220px] bg-[#F7F5FF] rounded-xl flex items-center justify-center">
          <span className="w-8 h-8 border-3 border-[#7C5CFC]/30 border-t-[#7C5CFC] rounded-full animate-spin" />
        </div>
      </div>

      {/* Breakdown Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-white border border-[#E6E2F0] rounded-2xl p-5 h-44 flex flex-col gap-4"
          >
            <div className="w-32 h-3.5 bg-[#E6E2F0] rounded-md" />
            <div className="flex flex-col gap-3">
              <div className="w-full h-3 bg-[#E6E2F0] rounded-md" />
              <div className="w-full h-3 bg-[#E6E2F0] rounded-md" />
              <div className="w-full h-3 bg-[#E6E2F0] rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 h-56 flex flex-col gap-4">
        <div className="w-40 h-4 bg-[#E6E2F0] rounded-md" />
        <div className="w-full h-8 bg-[#F7F5FF] rounded-md" />
        <div className="w-full h-8 bg-[#F7F5FF] rounded-md" />
      </div>
    </div>
  );
}
