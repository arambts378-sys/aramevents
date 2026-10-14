import { createClient } from '@/lib/supabase/client';

export type DateRangePreset = '7d' | '30d' | '90d' | 'all' | 'custom';

export interface AnalyticsFilterOptions {
  workspaceId: string;
  selectedEventId?: string; // 'all' or specific event UUID
  dateRange: DateRangePreset;
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string;   // YYYY-MM-DD
}

export interface TrendDataPoint {
  dateKey: string;      // YYYY-MM-DD
  label: string;        // e.g. "Sep 28"
  registrations: number;
  checkIns: number;     // unique allowed attendees on that day
}

export interface BreakdownItem {
  name: string;
  count: number;
  percentage: number;
}

export interface EventPerformanceRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  format: string;
  status: string;
  startDate: string;
  registrationsCount: number;
  checkInsCount: number;
  attendanceRate: number | null; // null if 0 registrations
}

export interface ZoneActivityItem {
  zoneId: string;
  zoneName: string;
  allowedScans: number;
  deniedScans: number;
  totalScans: number;
}

export interface PeakHourItem {
  hour: number;
  label: string;
  count: number;
}

export interface OperationalData {
  totalScans: number;
  allowedScans: number;
  deniedScans: number;
  allowedRate: number | null;
  deniedRate: number | null;
  zoneActivities: ZoneActivityItem[];
  peakHours: PeakHourItem[];
}

export interface AnalyticsData {
  workspaceId: string;
  selectedEventId: string;
  dateRange: DateRangePreset;
  hasEvents: boolean;
  hasData: boolean;
  overview: {
    totalEvents: number;
    totalRegistrations: number;
    totalCheckIns: number; // unique attendees with allowed check-ins
    attendanceRate: number | null; // null if 0 registrations
  };
  trend: TrendDataPoint[];
  breakdowns: {
    eventType: BreakdownItem[];
    registrationStatus: BreakdownItem[];
    walkathonDistance?: BreakdownItem[];
  };
  eventPerformance: EventPerformanceRow[];
  operational: OperationalData;
}

function parseDateBoundary(options: AnalyticsFilterOptions): {
  startDate: Date | null;
  endDate: Date | null;
} {
  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (options.dateRange === '7d') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  } else if (options.dateRange === '30d') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  } else if (options.dateRange === '90d') {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  } else if (options.dateRange === 'custom') {
    if (options.customStartDate) {
      startDate = new Date(`${options.customStartDate}T00:00:00`);
    }
    if (options.customEndDate) {
      endDate = new Date(`${options.customEndDate}T23:59:59.999`);
    }
  }

  return { startDate, endDate };
}

export async function fetchAnalyticsData(
  options: AnalyticsFilterOptions,
  customClient?: any
): Promise<AnalyticsData> {
  const supabase = customClient || createClient();
  const selectedEventId = options.selectedEventId || 'all';

  // 1. Fetch authorized events for active workspace
  const { data: rawEvents, error: eventsError } = await supabase
    .from('events')
    .select('id, name, slug, type, format, status, start_date, created_at')
    .eq('workspace_id', options.workspaceId)
    .order('created_at', { ascending: false });

  if (eventsError) {
    console.error('Error fetching events for analytics:', eventsError);
    throw new Error('Unable to load events for this workspace.');
  }

  const workspaceEvents: any[] = rawEvents || [];

  if (workspaceEvents.length === 0) {
    return {
      workspaceId: options.workspaceId,
      selectedEventId,
      dateRange: options.dateRange,
      hasEvents: false,
      hasData: false,
      overview: {
        totalEvents: 0,
        totalRegistrations: 0,
        totalCheckIns: 0,
        attendanceRate: null,
      },
      trend: [],
      breakdowns: {
        eventType: [],
        registrationStatus: [],
      },
      eventPerformance: [],
      operational: {
        totalScans: 0,
        allowedScans: 0,
        deniedScans: 0,
        allowedRate: null,
        deniedRate: null,
        zoneActivities: [],
        peakHours: [],
      },
    };
  }

  // 2. Validate Selected Event Access
  let targetEventIds: string[] = [];
  if (selectedEventId !== 'all') {
    const isAuthorized = workspaceEvents.some((e) => e.id === selectedEventId);
    if (!isAuthorized) {
      throw new Error('Unauthorized event selection for this workspace.');
    }
    targetEventIds = [selectedEventId];
  } else {
    targetEventIds = workspaceEvents.map((e) => e.id);
  }

  // 3. Resolve Date Boundaries
  const { startDate, endDate } = parseDateBoundary(options);

  // 4. Concurrently query Registrations, Check-ins, Zones, and Walkathon Distances
  let regQuery = supabase
    .from('registrations')
    .select('id, event_id, status, created_at, distance_category_id')
    .in('event_id', targetEventIds);

  if (startDate) {
    regQuery = regQuery.gte('created_at', startDate.toISOString());
  }
  if (endDate) {
    regQuery = regQuery.lte('created_at', endDate.toISOString());
  }

  let checkinQuery = supabase
    .from('check_ins')
    .select('id, event_id, registration_id, access_zone_id, result, scanned_at')
    .in('event_id', targetEventIds);

  if (startDate) {
    checkinQuery = checkinQuery.gte('scanned_at', startDate.toISOString());
  }
  if (endDate) {
    checkinQuery = checkinQuery.lte('scanned_at', endDate.toISOString());
  }

  const zonesQuery = supabase
    .from('access_zones')
    .select('id, name, event_id')
    .in('event_id', targetEventIds);

  const distancesQuery = supabase
    .from('walkathon_distance_categories')
    .select('id, name, event_id')
    .in('event_id', targetEventIds);

  const [regRes, checkinRes, zonesRes, distRes] = await Promise.all([
    regQuery,
    checkinQuery,
    zonesQuery,
    distancesQuery,
  ]);

  if (regRes.error) {
    console.error('Error querying registrations for analytics:', regRes.error);
    throw new Error('Unable to load registration analytics.');
  }
  if (checkinRes.error) {
    console.error('Error querying check-ins for analytics:', checkinRes.error);
    throw new Error('Unable to load check-in analytics.');
  }

  const registrations: any[] = regRes.data || [];
  const checkins: any[] = checkinRes.data || [];
  const zones: any[] = zonesRes.data || [];
  const distanceCategories: any[] = distRes.data || [];

  // 5. Calculate Overview Metrics
  const totalEvents = targetEventIds.length;
  const totalRegistrations = registrations.length;

  // Distinct attendees with allowed check-ins
  const allowedCheckins = checkins.filter((c) => c.result === 'allowed');
  const uniqueAllowedAttendeeIds = new Set(allowedCheckins.map((c) => c.registration_id));
  const totalCheckIns = uniqueAllowedAttendeeIds.size;

  const attendanceRate =
    totalRegistrations > 0
      ? Math.round((totalCheckIns / totalRegistrations) * 1000) / 10
      : null;

  // 6. Generate Time-Series Trend Buckets
  const trendMap = new Map<string, { dateKey: string; label: string; registrations: number; checkIns: number }>();

  // Helper to format date keys
  const formatDateKey = (d: Date) => d.toISOString().split('T')[0];
  const formatDisplayLabel = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // If a bounded date range is selected, populate continuous date series
  if (startDate) {
    const cursor = new Date(startDate);
    const endCursor = endDate ? new Date(endDate) : new Date();
    while (cursor <= endCursor) {
      const key = formatDateKey(cursor);
      trendMap.set(key, {
        dateKey: key,
        label: formatDisplayLabel(cursor),
        registrations: 0,
        checkIns: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Populate registrations into trend
  registrations.forEach((r) => {
    const key = r.created_at.split('T')[0];
    if (!trendMap.has(key)) {
      const d = new Date(r.created_at);
      trendMap.set(key, {
        dateKey: key,
        label: formatDisplayLabel(d),
        registrations: 0,
        checkIns: 0,
      });
    }
    const entry = trendMap.get(key)!;
    entry.registrations += 1;
  });

  // Populate unique check-ins per day into trend
  const dailyUniqueCheckins = new Map<string, Set<string>>();
  allowedCheckins.forEach((c) => {
    const key = c.scanned_at.split('T')[0];
    if (!dailyUniqueCheckins.has(key)) {
      dailyUniqueCheckins.set(key, new Set());
    }
    dailyUniqueCheckins.get(key)!.add(c.registration_id);
  });

  dailyUniqueCheckins.forEach((attendeeSet, key) => {
    if (!trendMap.has(key)) {
      const d = new Date(`${key}T00:00:00`);
      trendMap.set(key, {
        dateKey: key,
        label: formatDisplayLabel(d),
        registrations: 0,
        checkIns: 0,
      });
    }
    const entry = trendMap.get(key)!;
    entry.checkIns = attendeeSet.size;
  });

  const trend = Array.from(trendMap.values()).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey)
  );

  // 7. Calculate Registration Breakdowns
  // A. Event Type Breakdown
  const eventTypeCountMap = new Map<string, number>();
  registrations.forEach((r) => {
    const event = workspaceEvents.find((e) => e.id === r.event_id);
    const type = event?.type || 'Standard';
    eventTypeCountMap.set(type, (eventTypeCountMap.get(type) || 0) + 1);
  });

  const eventTypeBreakdown: BreakdownItem[] = Array.from(eventTypeCountMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // B. Registration Status Breakdown
  const statusCountMap = new Map<string, number>();
  registrations.forEach((r) => {
    const status = r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : 'Confirmed';
    statusCountMap.set(status, (statusCountMap.get(status) || 0) + 1);
  });

  const registrationStatusBreakdown: BreakdownItem[] = Array.from(statusCountMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // C. Walkathon Distance Breakdown (if applicable)
  let walkathonDistanceBreakdown: BreakdownItem[] | undefined = undefined;
  const distMap = new Map<string, string>();
  distanceCategories.forEach((dc) => distMap.set(dc.id, dc.name));

  const distanceCounts = new Map<string, number>();
  registrations.forEach((r) => {
    if (r.distance_category_id && distMap.has(r.distance_category_id)) {
      const distName = distMap.get(r.distance_category_id)!;
      distanceCounts.set(distName, (distanceCounts.get(distName) || 0) + 1);
    }
  });

  if (distanceCounts.size > 0) {
    const totalDistRegistrations = Array.from(distanceCounts.values()).reduce((a, b) => a + b, 0);
    walkathonDistanceBreakdown = Array.from(distanceCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage:
          totalDistRegistrations > 0
            ? Math.round((count / totalDistRegistrations) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // 8. Event Performance Table
  const eventPerformance: EventPerformanceRow[] = workspaceEvents
    .filter((e) => targetEventIds.includes(e.id))
    .map((e) => {
      const eventRegs = registrations.filter((r) => r.event_id === e.id);
      const eventAllowedCheckins = checkins.filter(
        (c) => c.event_id === e.id && c.result === 'allowed'
      );
      const uniqueEventCheckins = new Set(eventAllowedCheckins.map((c) => c.registration_id)).size;
      const rate =
        eventRegs.length > 0
          ? Math.round((uniqueEventCheckins / eventRegs.length) * 1000) / 10
          : null;

      return {
        id: e.id,
        name: e.name,
        slug: e.slug,
        type: e.type,
        format: e.format,
        status: e.status ? e.status.charAt(0).toUpperCase() + e.status.slice(1) : 'Published',
        startDate: e.start_date,
        registrationsCount: eventRegs.length,
        checkInsCount: uniqueEventCheckins,
        attendanceRate: rate,
      };
    })
    .sort((a, b) => b.registrationsCount - a.registrationsCount);

  // 9. Operational Insights
  const totalScans = checkins.length;
  const allowedScansCount = checkins.filter((c) => c.result === 'allowed').length;
  const deniedScansCount = checkins.filter((c) => c.result === 'denied').length;

  const allowedRate =
    totalScans > 0 ? Math.round((allowedScansCount / totalScans) * 1000) / 10 : null;
  const deniedRate =
    totalScans > 0 ? Math.round((deniedScansCount / totalScans) * 1000) / 10 : null;

  // Zone activity breakdown
  const zoneMap = new Map<string, string>();
  zones.forEach((z) => zoneMap.set(z.id, z.name));

  const zoneActivityMap = new Map<string, { allowed: number; denied: number }>();
  checkins.forEach((c) => {
    if (c.access_zone_id) {
      if (!zoneActivityMap.has(c.access_zone_id)) {
        zoneActivityMap.set(c.access_zone_id, { allowed: 0, denied: 0 });
      }
      const item = zoneActivityMap.get(c.access_zone_id)!;
      if (c.result === 'allowed') item.allowed++;
      else item.denied++;
    }
  });

  const zoneActivities: ZoneActivityItem[] = Array.from(zoneActivityMap.entries())
    .map(([zoneId, stats]) => ({
      zoneId,
      zoneName: zoneMap.get(zoneId) || 'General Checkpoint',
      allowedScans: stats.allowed,
      deniedScans: stats.denied,
      totalScans: stats.allowed + stats.denied,
    }))
    .sort((a, b) => b.totalScans - a.totalScans);

  // Peak check-in hours distribution (0 - 23)
  const hourCounts = new Array(24).fill(0);
  checkins.forEach((c) => {
    const date = new Date(c.scanned_at);
    const hour = date.getHours();
    hourCounts[hour]++;
  });

  const peakHours: PeakHourItem[] = hourCounts
    .map((count, hour) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      return {
        hour,
        label: `${displayHour}:00 ${period}`,
        count,
      };
    })
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count);

  const hasData = totalRegistrations > 0 || totalScans > 0;

  return {
    workspaceId: options.workspaceId,
    selectedEventId,
    dateRange: options.dateRange,
    hasEvents: true,
    hasData,
    overview: {
      totalEvents,
      totalRegistrations,
      totalCheckIns,
      attendanceRate,
    },
    trend,
    breakdowns: {
      eventType: eventTypeBreakdown,
      registrationStatus: registrationStatusBreakdown,
      walkathonDistance: walkathonDistanceBreakdown,
    },
    eventPerformance,
    operational: {
      totalScans,
      allowedScans: allowedScansCount,
      deniedScans: deniedScansCount,
      allowedRate,
      deniedRate,
      zoneActivities,
      peakHours,
    },
  };
}
