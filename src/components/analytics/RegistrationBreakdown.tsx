'use client';

import React from 'react';
import { BreakdownItem } from '@/services/analyticsService';

interface RegistrationBreakdownProps {
  eventType: BreakdownItem[];
  registrationStatus: BreakdownItem[];
  walkathonDistance?: BreakdownItem[];
}

// Distinct, vibrant color palette for breakdown progress bars
const PALETTE_GRADIENTS = [
  'from-[#6366F1] to-[#818CF8]', // Indigo
  'from-[#0EA5E9] to-[#38BDF8]', // Sky Blue
  'from-[#10B981] to-[#34D399]', // Emerald
  'from-[#F59E0B] to-[#FBBF24]', // Amber
  'from-[#F43F5E] to-[#FB7185]', // Rose
  'from-[#8B5CF6] to-[#C084FC]', // Violet
  'from-[#06B6D4] to-[#22D3EE]', // Cyan
  'from-[#F97316] to-[#FB923C]', // Orange
];

const PALETTE_DOTS = [
  'bg-[#6366F1]',
  'bg-[#0EA5E9]',
  'bg-[#10B981]',
  'bg-[#F59E0B]',
  'bg-[#F43F5E]',
  'bg-[#8B5CF6]',
  'bg-[#06B6D4]',
  'bg-[#F97316]',
];

export function RegistrationBreakdown({
  eventType,
  registrationStatus,
  walkathonDistance,
}: RegistrationBreakdownProps) {
  const hasDistance = walkathonDistance && walkathonDistance.length > 0;

  // Helper for status specific semantic colors
  const getStatusColor = (name: string, index: number) => {
    const lower = name.toLowerCase();
    if (lower.includes('confirmed') || lower.includes('attended') || lower.includes('checked_in') || lower.includes('approved')) {
      return {
        gradient: 'from-[#10B981] to-[#34D399]',
        dot: 'bg-[#10B981]',
        text: 'text-[#10B981]',
      };
    }
    if (lower.includes('pending') || lower.includes('registered') || lower.includes('waiting')) {
      return {
        gradient: 'from-[#6366F1] to-[#818CF8]',
        dot: 'bg-[#6366F1]',
        text: 'text-[#6366F1]',
      };
    }
    if (lower.includes('cancelled') || lower.includes('denied') || lower.includes('rejected')) {
      return {
        gradient: 'from-[#F43F5E] to-[#FB7185]',
        dot: 'bg-[#F43F5E]',
        text: 'text-[#F43F5E]',
      };
    }
    const idx = index % PALETTE_GRADIENTS.length;
    return {
      gradient: PALETTE_GRADIENTS[idx],
      dot: PALETTE_DOTS[idx],
      text: 'text-[#17152B]',
    };
  };

  return (
    <div
      className={`grid grid-cols-1 ${
        hasDistance ? 'md:grid-cols-3' : 'md:grid-cols-2'
      } gap-4`}
    >
      {/* 1. Event Type Breakdown */}
      <div className="bg-white border border-[#E6E2F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#6366F1]/30 transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-[#E6E2F0]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1]">
                <span className="material-symbols-outlined text-[17px]">category</span>
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#17152B]">
                Distribution by Event Type
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-[#77738A]">
              {eventType.length} Type{eventType.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3.5">
            {eventType.length === 0 ? (
              <p className="text-xs text-[#77738A] italic py-4 text-center">
                No event type records found
              </p>
            ) : (
              eventType.map((item, index) => {
                const gradient = PALETTE_GRADIENTS[index % PALETTE_GRADIENTS.length];
                const dot = PALETTE_DOTS[index % PALETTE_DOTS.length];

                return (
                  <div key={index} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
                        <span className="text-[#17152B] font-semibold">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#77738A] font-medium">{item.count}</span>
                        <span className="text-[11px] font-bold text-[#17152B] tabular-nums bg-[#F7F5FF] px-1.5 py-0.5 rounded border border-[#E6E2F0]">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-[#F7F5FF] rounded-full overflow-hidden border border-[#E6E2F0]/80">
                      <div
                        className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 2. Registration Status Breakdown */}
      <div className="bg-white border border-[#E6E2F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#10B981]/30 transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-[#E6E2F0]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                <span className="material-symbols-outlined text-[17px]">verified</span>
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#17152B]">
                Registration Status
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-[#77738A]">
              Current Statuses
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3.5">
            {registrationStatus.length === 0 ? (
              <p className="text-xs text-[#77738A] italic py-4 text-center">
                No registration status data available
              </p>
            ) : (
              registrationStatus.map((item, index) => {
                const colorConfig = getStatusColor(item.name, index);

                return (
                  <div key={index} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${colorConfig.dot} shrink-0`} />
                        <span className="text-[#17152B] font-semibold capitalize">
                          {item.name.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#77738A] font-medium">{item.count}</span>
                        <span className="text-[11px] font-bold text-[#17152B] tabular-nums bg-[#F7F5FF] px-1.5 py-0.5 rounded border border-[#E6E2F0]">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-[#F7F5FF] rounded-full overflow-hidden border border-[#E6E2F0]/80">
                      <div
                        className={`h-full bg-gradient-to-r ${colorConfig.gradient} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. Walkathon Distance Breakdown (Conditional) */}
      {hasDistance && (
        <div className="bg-white border border-[#E6E2F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#F59E0B]/30 transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E6E2F0]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
                  <span className="material-symbols-outlined text-[17px]">directions_walk</span>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#17152B]">
                  Walkathon Distances
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-[#77738A]">
                Route Categories
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3.5">
              {walkathonDistance.map((item, index) => {
                const gradient = PALETTE_GRADIENTS[(index + 3) % PALETTE_GRADIENTS.length];
                const dot = PALETTE_DOTS[(index + 3) % PALETTE_DOTS.length];

                return (
                  <div key={index} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
                        <span className="text-[#17152B] font-semibold">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#77738A] font-medium">{item.count}</span>
                        <span className="text-[11px] font-bold text-[#17152B] tabular-nums bg-[#F7F5FF] px-1.5 py-0.5 rounded border border-[#E6E2F0]">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-[#F7F5FF] rounded-full overflow-hidden border border-[#E6E2F0]/80">
                      <div
                        className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
