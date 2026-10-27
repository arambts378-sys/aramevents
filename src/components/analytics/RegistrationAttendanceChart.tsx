'use client';

import React, { useState } from 'react';
import { TrendDataPoint } from '@/services/analyticsService';

interface RegistrationAttendanceChartProps {
  trend: TrendDataPoint[];
}

export function RegistrationAttendanceChart({ trend }: RegistrationAttendanceChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!trend || trend.length === 0) {
    return (
      <div className="bg-white border border-ds-line rounded-2xl p-6 shadow-xs flex flex-col items-center justify-center min-h-[300px] text-center">
        <span className="material-symbols-outlined text-3xl text-ds-muted/50 mb-2">
          show_chart
        </span>
        <p className="text-xs font-semibold text-ds-ink">No trend data available</p>
        <p className="text-[11px] text-ds-muted mt-1">
          Registration and check-in activity will appear here once data is recorded.
        </p>
      </div>
    );
  }

  // Chart dimensions & margins
  const width = 760;
  const height = 280;
  const padding = { top: 25, right: 30, bottom: 45, left: 45 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Maximum value for scale
  const rawMax = Math.max(
    1,
    ...trend.map((p) => Math.max(p.registrations, p.checkIns))
  );
  // Round up to nice number
  const maxValue = rawMax <= 5 ? 5 : rawMax <= 10 ? 10 : Math.ceil(rawMax * 1.15);

  const n = trend.length;
  const getX = (index: number) => {
    if (n === 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (n - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    return padding.top + plotHeight - (val / maxValue) * plotHeight;
  };

  // Build SVG path strings
  const regPoints = trend.map((p, i) => `${getX(i)},${getY(p.registrations)}`);
  const chkPoints = trend.map((p, i) => `${getX(i)},${getY(p.checkIns)}`);

  const regPathD = `M ${regPoints.join(' L ')}`;
  const chkPathD = `M ${chkPoints.join(' L ')}`;

  // Area path for subtle gradient fill under registrations
  const regAreaD = `M ${getX(0)},${padding.top + plotHeight} L ${regPoints.join(' L ')} L ${getX(
    n - 1
  )},${padding.top + plotHeight} Z`;

  // Area path for check-ins fill
  const chkAreaD = `M ${getX(0)},${padding.top + plotHeight} L ${chkPoints.join(' L ')} L ${getX(
    n - 1
  )},${padding.top + plotHeight} Z`;

  // Horizontal Grid Lines (4 steps)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    val: Math.round(pct * maxValue),
    y: padding.top + plotHeight - pct * plotHeight,
  }));

  // X-axis label interval to prevent overlap
  const labelInterval = n <= 8 ? 1 : n <= 16 ? 2 : n <= 32 ? 4 : Math.ceil(n / 8);

  const activePoint = hoveredIndex !== null ? trend[hoveredIndex] : null;
  const activeX = hoveredIndex !== null ? getX(hoveredIndex) : null;

  // Updated, more vibrant & accessible color palette
  const regColor = '#6366F1';  // Indigo — vivid & distinct
  const chkColor = '#10B981';  // Emerald — high contrast against indigo

  return (
    <div className="bg-white border border-ds-line rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ds-ink tracking-tight">
            Registration & Attendance Trends
          </h2>
          <p className="text-xs text-ds-muted mt-0.5 font-normal">
            Track how registrations and validated check-ins trend over time.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-ds-ink">
            <span className="w-3 h-1.5 rounded-full" style={{ background: regColor }} />
            <span>Registrations</span>
          </div>
          <div className="flex items-center gap-1.5 text-ds-ink">
            <span className="w-3 h-1.5 rounded-full" style={{ background: chkColor }} />
            <span>Check-ins</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[320px] overflow-visible"
        >
          <defs>
            <linearGradient id="regGradientV2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={regColor} stopOpacity="0.20" />
              <stop offset="100%" stopColor={regColor} stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="chkGradientV2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chkColor} stopOpacity="0.12" />
              <stop offset="100%" stopColor={chkColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gridlines & Y-axis labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="#E6E2F0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={tick.y + 3}
                textAnchor="end"
                className="text-[10px] fill-ds-muted font-mono font-medium"
              >
                {tick.val}
              </text>
            </g>
          ))}

          {/* Check-in Area Fill */}
          <path d={chkAreaD} fill="url(#chkGradientV2)" />

          {/* Registration Area Fill */}
          <path d={regAreaD} fill="url(#regGradientV2)" />

          {/* Check-in Line */}
          <path
            d={chkPathD}
            fill="none"
            stroke={chkColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Registration Line */}
          <path
            d={regPathD}
            fill="none"
            stroke={regColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover guideline */}
          {activeX !== null && (
            <line
              x1={activeX}
              y1={padding.top}
              x2={activeX}
              y2={padding.top + plotHeight}
              stroke={regColor}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.5"
            />
          )}

          {/* Data Points */}
          {trend.map((p, i) => {
            const x = getX(i);
            const yReg = getY(p.registrations);
            const yChk = getY(p.checkIns);
            const isHovered = hoveredIndex === i;

            return (
              <g key={i}>
                {/* Registration Point */}
                <circle
                  cx={x}
                  cy={yReg}
                  r={isHovered ? 5.5 : 3.5}
                  fill={regColor}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all"
                />
                {/* Check-in Point */}
                <circle
                  cx={x}
                  cy={yChk}
                  r={isHovered ? 5.5 : 3.5}
                  fill={chkColor}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all"
                />

                {/* X-axis tick label */}
                {(i % labelInterval === 0 || i === n - 1) && (
                  <text
                    x={x}
                    y={height - 12}
                    textAnchor="middle"
                    className="text-[10px] fill-ds-muted font-medium"
                  >
                    {p.label}
                  </text>
                )}

                {/* Invisible hover trigger column */}
                <rect
                  x={x - plotWidth / (2 * Math.max(1, n - 1))}
                  y={padding.top}
                  width={plotWidth / Math.max(1, n - 1)}
                  height={plotHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {activePoint && activeX !== null && (
          <div
            className="absolute top-2 pointer-events-none bg-ds-ink text-white text-xs px-3.5 py-2.5 rounded-xl shadow-lg border border-white/10 z-10 animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${Math.min(
                Math.max(activeX, 70),
                width - 120
              )}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-bold border-b border-white/10 pb-1.5 mb-1.5 text-[11px] text-ds-line">
              {activePoint.label}
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <span className="text-ds-muted flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: regColor }} /> Registrations:
              </span>
              <span className="font-bold tabular-nums">{activePoint.registrations}</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <span className="text-ds-muted flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: chkColor }} /> Check-ins:
              </span>
              <span className="font-bold tabular-nums">{activePoint.checkIns}</span>
            </div>
          </div>
        )}
      </div>

      {/* Screen Reader Accessible Table */}
      <div className="sr-only">
        <table>
          <caption>Registration and Attendance trend data</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Registrations</th>
              <th scope="col">Check-ins</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((p, i) => (
              <tr key={i}>
                <td>{p.label}</td>
                <td>{p.registrations}</td>
                <td>{p.checkIns}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
