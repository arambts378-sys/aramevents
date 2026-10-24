'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { AccessControlMetrics } from '@/components/access-control/AccessControlMetrics';
import { VolunteerAccessCard } from '@/components/access-control/VolunteerAccessCard';
import { AccessZoneCard, AccessZoneData } from '@/components/access-control/AccessZoneCard';
import { AccessZoneModal } from '@/components/access-control/AccessZoneModal';
import { DeleteZoneModal } from '@/components/access-control/DeleteZoneModal';
import { AccessActivityTable, ScanRecord } from '@/components/access-control/AccessActivityTable';

export default function AccessControlPage() {
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, isHydrated, currentUser } = useAppContext();

  // Mobile sidebar state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Loading & syncing
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'zones' | 'activity'>('zones');

  // Core Data
  const [zones, setZones] = useState<AccessZoneData[]>([]);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  // Filtering for Access Zones view
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const [zoneStatusFilter, setZoneStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<AccessZoneData | null>(null);
  const [deletingZone, setDeletingZone] = useState<AccessZoneData | null>(null);

  // Notification banners
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Fetch all real access-control data
  const loadData = useCallback(async (isRefresh = false) => {
    if (!eventId) return;
    const supabase = createClient();

    if (isRefresh) {
      setSyncing(true);
    } else {
      setLoading(true);
    }

    try {
      // 1. Load Zones
      const { data: zonesData } = await supabase
        .from('access_zones')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (zonesData) {
        setZones(zonesData);
      }

      // 2. Load Recent Scans
      const { data: scansData } = await supabase
        .from('check_ins')
        .select(`
          id,
          scanned_at,
          result,
          reason,
          access_zone_id,
          access_zones ( name ),
          registrations (
            registration_number,
            event_people (
              people ( first_name, last_name, email )
            )
          )
        `)
        .eq('event_id', eventId)
        .order('scanned_at', { ascending: false })
        .limit(100);

      if (scansData) {
        setRecentScans(scansData as any);
      }

      // 3. Load Volunteer Scanner Sessions (for volunteer counts & scanner assignment mapping)
      try {
        const res = await fetch(`/api/events/${eventId}/scanner-sessions`);
        if (res.ok) {
          const sData = await res.json();
          setSessions(sData.sessions || []);
        }
      } catch (sessErr) {
        console.warn('Could not load volunteer sessions:', sessErr);
      }
    } catch (err: any) {
      console.error('Error loading access control data:', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (isHydrated && eventId) {
      loadData();
    }
  }, [isHydrated, eventId, loadData]);

  // Derived KPI metrics
  const activeZonesCount = useMemo(() => zones.filter((z) => z.is_active).length, [zones]);
  const totalZonesCount = zones.length;
  const todayScansCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return recentScans.filter((s) => new Date(s.scanned_at).toDateString() === todayStr).length;
  }, [recentScans]);

  const activeVolunteersCount = useMemo(() => {
    return sessions.filter((s) => {
      const notExpired = !s.expires_at || new Date(s.expires_at).getTime() > Date.now();
      return s.status === 'active' && notExpired;
    }).length;
  }, [sessions]);

  // Map of zoneId -> assigned volunteers count
  const zoneScannerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
      const notExpired = !s.expires_at || new Date(s.expires_at).getTime() > Date.now();
      if (s.status === 'active' && notExpired) {
        s.volunteer_scanner_zones?.forEach((vsz: any) => {
          if (vsz.zone_id) {
            counts[vsz.zone_id] = (counts[vsz.zone_id] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [sessions]);

  // Map of zoneId -> today's scans count in this zone
  const zoneTodayScans = useMemo(() => {
    const counts: Record<string, number> = {};
    const todayStr = new Date().toDateString();
    recentScans.forEach((s: any) => {
      if (new Date(s.scanned_at).toDateString() === todayStr) {
        const zoneId = s.access_zone_id;
        if (zoneId) {
          counts[zoneId] = (counts[zoneId] || 0) + 1;
        }
      }
    });
    return counts;
  }, [recentScans]);

  // Filtered zones
  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      if (zoneStatusFilter === 'active' && !z.is_active) return false;
      if (zoneStatusFilter === 'inactive' && z.is_active) return false;

      if (zoneSearchQuery.trim()) {
        const q = zoneSearchQuery.toLowerCase();
        const nameMatch = z.name.toLowerCase().includes(q);
        const typeMatch = z.zone_type.toLowerCase().includes(q);
        const descMatch = z.description ? z.description.toLowerCase().includes(q) : false;
        const locMatch = z.location ? z.location.toLowerCase().includes(q) : false;
        if (!nameMatch && !typeMatch && !descMatch && !locMatch) {
          return false;
        }
      }

      return true;
    });
  }, [zones, zoneStatusFilter, zoneSearchQuery]);

  // Handler: Create Zone
  const handleCreateZone = async (newZone: any) => {
    const supabase = createClient();
    const limit =
      newZone.zone_type === 'Food Court' && newZone.entitlement_limit
        ? parseInt(newZone.entitlement_limit, 10)
        : null;
    const unit =
      newZone.zone_type === 'Food Court' && newZone.entitlement_unit
        ? newZone.entitlement_unit
        : null;

    const { data: zoneData, error: zoneError } = await supabase
      .from('access_zones')
      .insert({
        event_id: eventId,
        name: newZone.name.trim(),
        zone_type: newZone.zone_type,
        description: newZone.description?.trim() || null,
        location: newZone.location?.trim() || null,
        requires_qr: newZone.requires_qr,
        allow_reentry: newZone.allow_reentry,
        entitlement_limit: limit,
        entitlement_unit: unit,
        is_active: newZone.is_active,
        checkpoint_type:
          newZone.zone_type === 'Walkathon Checkpoint' ? newZone.checkpoint_type : null,
        distance_km:
          newZone.zone_type === 'Walkathon Checkpoint' && newZone.distance_km
            ? parseFloat(newZone.distance_km)
            : null,
        sequence:
          newZone.zone_type === 'Walkathon Checkpoint' && newZone.sequence
            ? parseInt(newZone.sequence, 10)
            : null,
      })
      .select()
      .single();

    if (zoneError) {
      throw new Error(zoneError.message || 'Failed to create access zone.');
    }

    // Default rule: All confirmed attendees
    await supabase.from('access_rules').insert({
      zone_id: zoneData.id,
      rule_type: 'all_confirmed_attendees',
      rule_value: {},
    });

    setZones((prev) => [...prev, zoneData]);
    setSuccessBanner(`Access zone "${zoneData.name}" created successfully.`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Handler: Edit Zone
  const handleEditZone = async (updatedData: any) => {
    if (!editingZone) return;
    const supabase = createClient();

    const limit =
      updatedData.zone_type === 'Food Court' && updatedData.entitlement_limit
        ? parseInt(updatedData.entitlement_limit, 10)
        : null;
    const unit =
      updatedData.zone_type === 'Food Court' && updatedData.entitlement_unit
        ? updatedData.entitlement_unit
        : null;

    const { data: resultZone, error: updateError } = await supabase
      .from('access_zones')
      .update({
        name: updatedData.name.trim(),
        zone_type: updatedData.zone_type,
        description: updatedData.description?.trim() || null,
        location: updatedData.location?.trim() || null,
        requires_qr: updatedData.requires_qr,
        allow_reentry: updatedData.allow_reentry,
        entitlement_limit: limit,
        entitlement_unit: unit,
        is_active: updatedData.is_active,
        checkpoint_type:
          updatedData.zone_type === 'Walkathon Checkpoint' ? updatedData.checkpoint_type : null,
        distance_km:
          updatedData.zone_type === 'Walkathon Checkpoint' && updatedData.distance_km
            ? parseFloat(updatedData.distance_km)
            : null,
        sequence:
          updatedData.zone_type === 'Walkathon Checkpoint' && updatedData.sequence
            ? parseInt(updatedData.sequence, 10)
            : null,
      })
      .eq('id', editingZone.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update access zone.');
    }

    setZones((prev) => prev.map((z) => (z.id === editingZone.id ? resultZone : z)));
    setSuccessBanner(`Access zone "${resultZone.name}" updated successfully.`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Handler: Toggle Activate/Deactivate
  const handleToggleActive = async (zoneId: string, currentStatus: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('access_zones')
      .update({ is_active: !currentStatus })
      .eq('id', zoneId);

    if (!error) {
      setZones((prev) =>
        prev.map((z) => (z.id === zoneId ? { ...z, is_active: !currentStatus } : z))
      );
    }
  };

  // Handler: Delete Zone
  const handleDeleteZone = async (zoneId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('access_zones').delete().eq('id', zoneId);

    if (error) {
      throw new Error(error.message || 'Failed to delete access zone.');
    }

    setZones((prev) => prev.filter((z) => z.id !== zoneId));
    setSuccessBanner('Access zone deleted successfully.');
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Handler: Export Zones CSV
  const handleExportZonesCSV = () => {
    if (zones.length === 0) return;

    const headers = ['Name', 'Zone Type', 'Status', 'QR Required', 'Re-entry', 'Location', 'Description'];
    const rows = filteredZones.map((z) => [
      z.name,
      z.zone_type,
      z.is_active ? 'Active' : 'Inactive',
      z.requires_qr ? 'Yes' : 'No',
      z.allow_reentry ? 'Yes' : 'No',
      z.location || '',
      z.description || '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`));

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `access_zones_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const event = getEvent(eventId);

  // Loading state
  if (!isHydrated || loading) {
    return (
      <div className="h-full bg-[#F7F5FF] text-[#17152B] antialiased min-h-screen w-full">
        <div className="min-h-screen flex flex-row w-full bg-[#F7F5FF]">
          <Sidebar currentUser={currentUser} />
          <main className="flex-1 min-w-0 bg-[#F7F5FF] min-h-screen px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 overflow-y-auto w-full">
            <div className="w-full space-y-8 animate-pulse">
              <div className="h-5 w-32 bg-[#E6E2F0] rounded-md" />
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <div className="h-10 w-72 bg-[#E6E2F0] rounded-xl" />
                  <div className="h-4 w-96 bg-[#E6E2F0] rounded" />
                </div>
                <div className="h-10 w-36 bg-[#E6E2F0] rounded-xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 bg-white border border-[#E6E2F0] rounded-2xl" />
                ))}
              </div>
              <div className="h-96 bg-white border border-[#E6E2F0] rounded-2xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Event not found state
  if (!event) {
    return (
      <div className="h-full bg-[#F7F5FF] text-[#17152B] antialiased min-h-screen w-full">
        <div className="min-h-screen flex flex-row w-full bg-[#F7F5FF]">
          <Sidebar currentUser={currentUser} />
          <main className="flex-1 min-w-0 bg-[#F7F5FF] min-h-screen p-6 flex items-center justify-center w-full">
            <div className="max-w-md w-full bg-white border border-[#E6E2F0] rounded-2xl p-8 text-center shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#F6F1FF] text-[#7C5CFC] flex items-center justify-center mx-auto border border-[#E6E2F0]">
                <span className="material-symbols-outlined text-[24px]">event_busy</span>
              </div>
              <h2 className="text-xl font-bold font-space text-[#17152B]">Event Not Found</h2>
              <p className="text-sm text-[#77738A] font-jakarta">
                The requested event could not be located in this workspace.
              </p>
              <Link
                href="/app/events"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C5CFC] text-white text-sm font-semibold rounded-xl hover:bg-[#5B3FE8] transition-colors"
              >
                Back to Events
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#F7F5FF] text-[#17152B] antialiased min-h-screen w-full">
      <div className="min-h-screen flex flex-row w-full bg-[#F7F5FF]">
        {/* Persistent Left Sidebar */}
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 bg-[#F7F5FF] min-h-screen px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 overflow-y-auto w-full">
          <div className="w-full space-y-8">
            {/* Top Navigation & Breadcrumb */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/app/events/${eventId}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-[13px] text-[#77738A] hover:text-[#7C5CFC] transition-colors group font-jakarta"
                >
                  <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform duration-150">
                    arrow_back
                  </span>
                  <span>Back to Workspace</span>
                </Link>

                {/* Mobile Menu Button */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#17152B] bg-white border border-[#E6E2F0] rounded-lg shadow-xs"
                  aria-label="Open navigation menu"
                >
                  <span className="material-symbols-outlined text-[16px]">menu</span>
                  <span>Menu</span>
                </button>
              </div>

              {/* Header Title & Primary Action */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-[#77738A]">
                      EVENT WORKSPACE · {event.name}
                    </span>
                  </div>
                  <h1 className="text-[32px] md:text-[40px] tracking-tight font-bold text-[#17152B] leading-none font-space">
                    QR &amp; ACCESS
                  </h1>
                  <p className="text-[14px] text-[#77738A] font-jakarta">
                    Configure event access, checkpoints, entitlements, and volunteer permissions.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => loadData(true)}
                    disabled={syncing}
                    title="Refresh access zones and scan activity"
                    className="px-4 py-2.5 rounded-xl border border-[#E6E2F0] bg-white text-[#17152B] hover:bg-[#F6F1FF] hover:border-[#7C5CFC]/60 transition-colors font-jakarta text-[13px] font-semibold flex items-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        syncing ? 'animate-spin text-[#7C5CFC]' : 'text-[#77738A]'
                      }`}
                    >
                      sync
                    </span>
                    <span>{syncing ? 'Syncing...' : 'Credential Sync'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white font-jakarta text-[13px] font-semibold transition-all duration-150 shadow-xs flex items-center gap-2 active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>+ Create Access Zone</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Notification Banner */}
            {successBanner && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-jakarta flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-emerald-600">
                    check_circle
                  </span>
                  <span className="font-medium">{successBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessBanner(null)}
                  className="text-emerald-600 hover:text-emerald-800 p-1"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            {/* KPI Metrics Section */}
            <AccessControlMetrics
              activeZones={activeZonesCount}
              totalZones={totalZonesCount}
              todayScans={todayScansCount}
              activeVolunteers={activeVolunteersCount}
            />

            {/* Volunteer Access Feature Card */}
            <VolunteerAccessCard eventId={eventId} />

            {/* Main Access Control Workspace Card */}
            <section className="bg-white rounded-2xl border border-[#E6E2F0] p-6 lg:p-7 shadow-xs space-y-6">
              {/* Card Header & Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E2F0]/60 pb-5">
                <div>
                  <h2 className="font-space text-[20px] text-[#17152B] font-bold tracking-tight">
                    ACCESS CONTROL
                  </h2>
                  <p className="font-jakarta text-[13px] text-[#77738A] mt-0.5">
                    Manage checkpoints, scanner zones, and access activity for this event.
                  </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-8 border-b-2 sm:border-b-0 border-transparent">
                  {/* ACCESS ZONES TAB */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('zones')}
                    className={`flex items-center gap-2 pb-2 sm:pb-3 border-b-2 font-jakarta text-[13px] transition-all ${
                      activeTab === 'zones'
                        ? 'border-[#7C5CFC] text-[#7C5CFC] font-bold'
                        : 'border-transparent text-[#77738A] hover:text-[#17152B] font-medium'
                    }`}
                  >
                    <span>ACCESS ZONES</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        activeTab === 'zones'
                          ? 'bg-[#E5DEFF] text-[#5B3FE8]'
                          : 'bg-[#F6F1FF] text-[#77738A]'
                      }`}
                    >
                      {zones.length}
                    </span>
                  </button>

                  {/* ACTIVITY TAB */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className={`flex items-center gap-2 pb-2 sm:pb-3 border-b-2 font-jakarta text-[13px] transition-all ${
                      activeTab === 'activity'
                        ? 'border-[#7C5CFC] text-[#7C5CFC] font-bold'
                        : 'border-transparent text-[#77738A] hover:text-[#17152B] font-medium'
                    }`}
                  >
                    {recentScans.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    )}
                    <span>ACTIVITY</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        activeTab === 'activity'
                          ? 'bg-[#E5DEFF] text-[#5B3FE8]'
                          : 'bg-[#F6F1FF] text-[#77738A]'
                      }`}
                    >
                      {recentScans.length} {recentScans.length === 1 ? 'scan' : 'scans'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Access Zones */}
              {activeTab === 'zones' && (
                <div className="space-y-5">
                  {/* Toolbar */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Search & Filter Cluster */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search Input */}
                      <div className="relative w-full sm:w-72">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#77738A] pointer-events-none">
                          search
                        </span>
                        <input
                          type="text"
                          className="w-full pl-9 pr-3.5 py-2 text-[13px] font-jakarta bg-white border border-[#E6E2F0] rounded-xl text-[#17152B] placeholder-[#77738A]/60 focus:outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20 transition-all"
                          placeholder="Search access zones..."
                          value={zoneSearchQuery}
                          onChange={(e) => setZoneSearchQuery(e.target.value)}
                        />
                      </div>

                      {/* Filter Pills */}
                      <div className="flex items-center gap-1 p-1 bg-[#F6F1FF] rounded-xl border border-[#E6E2F0]/60">
                        <button
                          type="button"
                          onClick={() => setZoneStatusFilter('all')}
                          className={`px-3 py-1 rounded-lg font-jakarta text-[12px] font-semibold transition-all ${
                            zoneStatusFilter === 'all'
                              ? 'bg-white text-[#17152B] shadow-xs'
                              : 'text-[#77738A] hover:text-[#17152B]'
                          }`}
                        >
                          All ({zones.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoneStatusFilter('active')}
                          className={`px-3 py-1 rounded-lg font-jakarta text-[12px] font-semibold transition-all ${
                            zoneStatusFilter === 'active'
                              ? 'bg-white text-emerald-700 shadow-xs'
                              : 'text-[#77738A] hover:text-[#17152B]'
                          }`}
                        >
                          Active ({activeZonesCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoneStatusFilter('inactive')}
                          className={`px-3 py-1 rounded-lg font-jakarta text-[12px] font-semibold transition-all ${
                            zoneStatusFilter === 'inactive'
                              ? 'bg-white text-[#17152B] shadow-xs'
                              : 'text-[#77738A] hover:text-[#17152B]'
                          }`}
                        >
                          Inactive ({zones.length - activeZonesCount})
                        </button>
                      </div>
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex items-center gap-2 self-end lg:self-auto">
                      <button
                        type="button"
                        onClick={handleExportZonesCSV}
                        disabled={zones.length === 0}
                        className="px-3.5 py-2 border border-[#E6E2F0] rounded-xl text-[#77738A] hover:text-[#17152B] hover:bg-[#F6F1FF] transition-colors font-jakarta text-[12px] font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[17px]">file_download</span>
                        <span>Export CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white font-jakarta text-[12px] font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
                      >
                        <span className="material-symbols-outlined text-[17px]">add</span>
                        <span>+ Create Access Zone</span>
                      </button>
                    </div>
                  </div>

                  {/* Zones List */}
                  {filteredZones.length === 0 ? (
                    <div className="py-16 px-6 text-center border border-[#E6E2F0] rounded-2xl bg-white shadow-xs">
                      <div className="w-12 h-12 rounded-2xl bg-[#F6F1FF] text-[#7C5CFC] flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-[24px]">door_sliding</span>
                      </div>
                      <h4 className="font-space text-[17px] font-bold text-[#17152B]">
                        {zones.length === 0 ? 'No access zones yet' : 'No matching access zones'}
                      </h4>
                      <p className="font-jakarta text-[13px] text-[#77738A] mt-1 max-w-md mx-auto">
                        {zones.length === 0
                          ? 'Create your first access zone to control where volunteers can scan and validate event tickets.'
                          : 'Try modifying your search query or status filter.'}
                      </p>
                      {zones.length === 0 && (
                        <div className="mt-5">
                          <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-5 py-2.5 rounded-xl bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white font-jakarta text-[13px] font-semibold transition-all shadow-xs inline-flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            <span>+ Create Access Zone</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3.5 pt-1">
                      {filteredZones.map((zone) => (
                        <AccessZoneCard
                          key={zone.id}
                          zone={zone}
                          eventId={eventId}
                          assignedScannersCount={zoneScannerCounts[zone.id] || 0}
                          todayScansCount={zoneTodayScans[zone.id] || 0}
                          onEdit={(z) => setEditingZone(z)}
                          onToggleActive={handleToggleActive}
                          onDelete={(z) => setDeletingZone(z)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Activity Log */}
              {activeTab === 'activity' && (
                <AccessActivityTable scans={recentScans} />
              )}
            </section>
          </div>
        </main>
      </div>

      {/* MODALS */}
      {/* Create Modal */}
      <AccessZoneModal
        mode="create"
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateZone}
      />

      {/* Edit Modal */}
      <AccessZoneModal
        mode="edit"
        isOpen={Boolean(editingZone)}
        initialData={editingZone}
        onClose={() => setEditingZone(null)}
        onSubmit={handleEditZone}
      />

      {/* Delete Confirmation Modal */}
      <DeleteZoneModal
        isOpen={Boolean(deletingZone)}
        zone={deletingZone}
        onClose={() => setDeletingZone(null)}
        onConfirm={handleDeleteZone}
      />
    </div>
  );
}
