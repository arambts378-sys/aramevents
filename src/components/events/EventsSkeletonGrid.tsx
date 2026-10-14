import React from 'react';

export function EventsSkeletonGrid() {
  const skeletons = [1, 2, 3, 4, 5, 6];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {skeletons.map((idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl border border-[#E6E2F0] overflow-hidden shadow-xs flex flex-col h-full"
        >
          {/* Skeleton Image */}
          <div className="aspect-video w-full bg-[#F6F1FF]" />

          {/* Skeleton Body */}
          <div className="p-5 flex flex-col flex-1 justify-between">
            <div>
              {/* Type Skeleton */}
              <div className="w-16 h-3 bg-[#E6E2F0] rounded mb-3" />

              {/* Title Skeleton */}
              <div className="w-3/4 h-5 bg-[#E6E2F0] rounded mb-2" />
              <div className="w-1/2 h-5 bg-[#E6E2F0] rounded mb-4" />

              {/* Metadata Skeletons */}
              <div className="space-y-2 mb-4">
                <div className="w-2/3 h-3.5 bg-[#E6E2F0]/80 rounded" />
                <div className="w-1/2 h-3.5 bg-[#E6E2F0]/80 rounded" />
              </div>
            </div>

            {/* Skeleton Footer */}
            <div className="pt-4 border-t border-[#E6E2F0] flex items-center justify-between">
              <div className="w-14 h-3 bg-[#E6E2F0] rounded" />
              <div className="w-28 h-8 bg-[#E6E2F0] rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
