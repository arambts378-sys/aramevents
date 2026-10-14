'use client';

import React from 'react';
import { BreakdownItem } from '@/services/analyticsService';

interface RegistrationBreakdownProps {
  eventType: BreakdownItem[];
  registrationStatus: BreakdownItem[];
  walkathonDistance?: BreakdownItem[];
}

export function RegistrationBreakdown({
  eventType,
  registrationStatus,
  walkathonDistance,
}: RegistrationBreakdownProps) {
  const hasDistance = walkathonDistance && walkathonDistance.length > 0;

  return (
    <div
      className={`grid grid-cols-1 ${
        hasDistance ? 'md:grid-cols-3' : 'md:grid-cols-2'
      } gap-4`}
    >
      {/* 1. Event Type Breakdown */}
      <div className="bg-white border border-[#E6E2F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E2F0]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#77738A]">
              By Event Type
            </h3>
            <span className="material-symbols-outlined text-[#7C5CFC] text-base">
              category
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {eventType.length === 0 ? (
              <p className="text-xs text-[#77738A] italic">No event type data</p>
            ) : (
              eventType.map((item, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-[#17152B] font-semibold">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#77738A]">{item.count}</span>
                      <span className="text-[11px] font-bold text-[#17152B] tabular-nums">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-[#F7F5FF] rounded-full overflow-hidden border border-[#E6E2F0]">
                    <div
                      className="h-full bg-[#7C5CFC] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. Registration Status Breakdown */}
      <div className="bg-white border border-[#E6E2F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E2F0]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#77738A]">
              By Registration Status
            </h3>
            <span className="material-symbols-outlined text-[#22C55E] text-base">
              verified
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {registrationStatus.length === 0 ? (
              <p className="text-xs text-[#77738A] italic">No registration status data</p>
            ) : (
              registrationStatus.map((item, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-[#17152B] font-semibold">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#77738A]">{item.count}</span>
                      <span className="text-[11px] font-bold text-[#17152B] tabular-nums">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-[#F7F5FF] rounded-full overflow-hidden border border-[#E6E2F0]">
                    <div
                      className="h-full bg-[#22C55E] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. Walkathon Distance Breakdown (Conditional) */}
      {hasDistance && (
        <div className="bg-white border border-[#E6E2F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E2F0]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#77738A]">
                Walkathon Distances
              </h3>
              <span className="material-symbols-outlined text-[#7C5CFC] text-base">
                directions_walk
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {walkathonDistance.map((item, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-[#17152B] font-semibold">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#77738A]">{item.count}</span>
                      <span className="text-[11px] font-bold text-[#17152B] tabular-nums">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-[#F7F5FF] rounded-full overflow-hidden border border-[#E6E2F0]">
                    <div
                      className="h-full bg-[#7C5CFC] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
