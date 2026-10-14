import { createClient } from '@/lib/supabase/client';
import { Person } from '@/types';

export interface PeopleFilterOptions {
  workspaceId: string;
  searchQuery?: string;
  eventId?: string; // 'all' or specific event UUID
  status?: string; // 'all' or specific status ('active', 'inactive', 'confirmed', 'pending', etc.)
  dateRange?: 'all' | '7d' | '30d' | '90d';
}

export interface WorkspacePersonRow {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  organization?: string | null;
  job_title?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  eventsCount: number;
  registrationStatus: string | null;
  hasAttended: boolean;
  attendanceCount: number; // unique events with allowed check-ins
  lastActivityAt: string;
  events: Array<{
    id: string;
    name: string;
  }>;
}

export interface PersonEventParticipation {
  eventId: string;
  eventName: string;
  eventSlug?: string | null;
  eventStartDate?: string | null;
  personType: string;
  personStatus: string;
  registrationId?: string | null;
  registrationNumber?: string | null;
  registrationStatus?: string | null;
  registeredAt?: string | null;
  hasAttended: boolean;
  checkInCount: number;
  firstCheckInAt?: string | null;
  lastCheckInAt?: string | null;
  checkIns: Array<{
    id: string;
    scannedAt: string;
    result: 'allowed' | 'denied';
    zoneName?: string | null;
    reason?: string | null;
  }>;
}

export interface PersonDetailData {
  person: Person & { fullName: string };
  stats: {
    eventsCount: number;
    registrationsCount: number;
    checkInsCount: number; // unique events attended via allowed check-ins
    totalScansCount: number;
  };
  eventHistory: PersonEventParticipation[];
}

export interface CreatePersonInput {
  first_name: string;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  organization?: string | null;
  job_title?: string | null;
}

export interface UpdatePersonInput {
  first_name?: string;
  last_name?: string | null;
  email?: string;
  phone?: string | null;
  organization?: string | null;
  job_title?: string | null;
}

/**
 * Format full name nicely from first and optional last name
 */
export function formatPersonName(firstName: string, lastName?: string | null): string {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();
  if (first && last) return `${first} ${last}`;
  return first || last || 'Unnamed Person';
}

/**
 * Calculate date boundary from preset
 */
function getDateBoundary(preset?: 'all' | '7d' | '30d' | '90d'): Date | null {
  if (!preset || preset === 'all') return null;
  const now = new Date();
  const boundary = new Date(now);
  if (preset === '7d') boundary.setDate(now.getDate() - 7);
  else if (preset === '30d') boundary.setDate(now.getDate() - 30);
  else if (preset === '90d') boundary.setDate(now.getDate() - 90);
  boundary.setHours(0, 0, 0, 0);
  return boundary;
}

/**
 * Fetch all people in the active workspace with related event, registration,
 * and attendance metadata using bulk queries (zero N+1 queries).
 */
export async function fetchWorkspacePeople(
  options: PeopleFilterOptions,
  customClient?: any
): Promise<WorkspacePersonRow[]> {
  const supabase = customClient || createClient();

  if (!options.workspaceId) {
    throw new Error('Active workspace ID is required.');
  }

  // 1. Build Query for people table
  let peopleQuery = supabase
    .from('people')
    .select('id, workspace_id, profile_id, first_name, last_name, email, phone, organization, job_title, avatar_url, created_at, updated_at')
    .eq('workspace_id', options.workspaceId)
    .order('created_at', { ascending: false });

  // Date filtering on created_at
  const dateBoundary = getDateBoundary(options.dateRange);
  if (dateBoundary) {
    peopleQuery = peopleQuery.gte('created_at', dateBoundary.toISOString());
  }

  // Database-side search filtering where supported
  const trimmedSearch = options.searchQuery?.trim();
  if (trimmedSearch) {
    const cleanSearch = trimmedSearch.replace(/[%_,()]/g, '');
    if (cleanSearch) {
      peopleQuery = peopleQuery.or(
        `first_name.ilike.%${cleanSearch}%,last_name.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,organization.ilike.%${cleanSearch}%`
      );
    }
  }

  const { data: rawPeople, error: peopleError } = await peopleQuery;

  if (peopleError) {
    console.error('Error fetching people:', peopleError);
    throw new Error('Unable to load people for this workspace.');
  }

  const people: any[] = rawPeople || [];

  if (people.length === 0) {
    return [];
  }

  const personIds: string[] = people.map((p: any) => p.id);

  // 2. Concurrently fetch event_people and registrations in bulk
  const eventPeopleQuery = supabase
    .from('event_people')
    .select(`
      id,
      event_id,
      person_id,
      person_type,
      status,
      created_at,
      updated_at,
      events:event_id (id, name, slug, start_date)
    `)
    .in('person_id', personIds);

  const registrationsQuery = supabase
    .from('registrations')
    .select('id, event_id, person_id, event_person_id, registration_number, status, registered_at, created_at, updated_at')
    .in('person_id', personIds);

  const [epRes, regRes] = await Promise.all([eventPeopleQuery, registrationsQuery]);

  if (epRes.error) {
    console.error('Error fetching event_people for people directory:', epRes.error);
    throw new Error('Unable to load event links for people.');
  }
  if (regRes.error) {
    console.error('Error fetching registrations for people directory:', regRes.error);
    throw new Error('Unable to load registration records for people.');
  }

  const eventPeople: any[] = epRes.data || [];
  const registrations: any[] = regRes.data || [];

  // 3. Bulk fetch check_ins for all registrations
  const registrationIds: string[] = registrations.map((r: any) => r.id);
  let checkIns: any[] = [];

  if (registrationIds.length > 0) {
    const { data: checkInData, error: ciError } = await supabase
      .from('check_ins')
      .select('id, event_id, registration_id, result, scanned_at, created_at')
      .in('registration_id', registrationIds);

    if (ciError) {
      console.error('Error fetching check-ins for people directory:', ciError);
    } else {
      checkIns = checkInData || [];
    }
  }

  // 4. Group data by person_id
  const epByPerson = new Map<string, any[]>();
  eventPeople.forEach((ep: any) => {
    if (!epByPerson.has(ep.person_id)) {
      epByPerson.set(ep.person_id, []);
    }
    epByPerson.get(ep.person_id)!.push(ep);
  });

  const regsByPerson = new Map<string, any[]>();
  registrations.forEach((r: any) => {
    if (!regsByPerson.has(r.person_id)) {
      regsByPerson.set(r.person_id, []);
    }
    regsByPerson.get(r.person_id)!.push(r);
  });

  const checkInsByRegId = new Map<string, any[]>();
  checkIns.forEach((ci: any) => {
    if (!checkInsByRegId.has(ci.registration_id)) {
      checkInsByRegId.set(ci.registration_id, []);
    }
    checkInsByRegId.get(ci.registration_id)!.push(ci);
  });

  // 5. Build computed person rows
  const rows: WorkspacePersonRow[] = people.map((person: any) => {
    const pEventPeople: any[] = epByPerson.get(person.id) || [];
    const pRegs: any[] = regsByPerson.get(person.id) || [];

    // All registrations for this person
    const pCheckIns: any[] = [];
    pRegs.forEach((r: any) => {
      const cis = checkInsByRegId.get(r.id) || [];
      pCheckIns.push(...cis);
    });

    // Unique events connected either via event_people or registrations
    const eventMap = new Map<string, { id: string; name: string }>();
    pEventPeople.forEach((ep: any) => {
      const eventObj = ep.events;
      if (eventObj?.id && eventObj?.name) {
        eventMap.set(eventObj.id, { id: eventObj.id, name: eventObj.name });
      }
    });
    const uniqueEvents = Array.from(eventMap.values());
    const eventsCount = uniqueEvents.length;

    // Attendance calculation: unique events attended with at least one allowed scan
    const allowedCheckIns = pCheckIns.filter((ci: any) => ci.result === 'allowed');
    const attendedEventIds = new Set(allowedCheckIns.map((ci: any) => ci.event_id));
    const attendanceCount = attendedEventIds.size;
    const hasAttended = attendanceCount > 0;

    // Latest registration status
    let registrationStatus: string | null = null;
    if (pRegs.length > 0) {
      const sortedRegs = [...pRegs].sort(
        (a: any, b: any) =>
          new Date(b.registered_at || b.created_at).getTime() -
          new Date(a.registered_at || a.created_at).getTime()
      );
      const latest = sortedRegs[0];
      registrationStatus = latest.status
        ? latest.status.charAt(0).toUpperCase() + latest.status.slice(1)
        : 'Confirmed';
    } else if (pEventPeople.length > 0) {
      const sortedEp = [...pEventPeople].sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      registrationStatus = sortedEp[0].status === 'active' ? 'Active' : 'Inactive';
    }

    // Meaningful Last Activity calculation
    const timestamps: number[] = [
      new Date(person.updated_at || person.created_at).getTime(),
    ];
    pEventPeople.forEach((ep: any) => {
      if (ep.updated_at) timestamps.push(new Date(ep.updated_at).getTime());
      if (ep.created_at) timestamps.push(new Date(ep.created_at).getTime());
    });
    pRegs.forEach((r: any) => {
      if (r.updated_at) timestamps.push(new Date(r.updated_at).getTime());
      if (r.registered_at) timestamps.push(new Date(r.registered_at).getTime());
      if (r.created_at) timestamps.push(new Date(r.created_at).getTime());
    });
    pCheckIns.forEach((ci: any) => {
      if (ci.scanned_at) timestamps.push(new Date(ci.scanned_at).getTime());
      if (ci.created_at) timestamps.push(new Date(ci.created_at).getTime());
    });
    const maxTimestamp = Math.max(...timestamps.filter((t) => !isNaN(t)));
    const lastActivityAt = new Date(maxTimestamp).toISOString();

    const fullName = formatPersonName(person.first_name, person.last_name);

    return {
      id: person.id,
      workspace_id: person.workspace_id,
      first_name: person.first_name,
      last_name: person.last_name,
      fullName,
      email: person.email,
      phone: person.phone,
      organization: person.organization,
      job_title: person.job_title,
      avatar_url: person.avatar_url,
      created_at: person.created_at,
      updated_at: person.updated_at,
      eventsCount,
      registrationStatus,
      hasAttended,
      attendanceCount,
      lastActivityAt,
      events: uniqueEvents,
    };
  });

  // 6. Apply post-query filters (Event and Status)
  let filteredRows = rows;

  if (options.eventId && options.eventId !== 'all') {
    filteredRows = filteredRows.filter((r) =>
      r.events.some((ev) => ev.id === options.eventId)
    );
  }

  if (options.status && options.status !== 'all') {
    const targetStatus = options.status.toLowerCase();
    filteredRows = filteredRows.filter((r) => {
      if (targetStatus === 'attended') return r.hasAttended;
      if (targetStatus === 'not_attended') return !r.hasAttended;
      return r.registrationStatus?.toLowerCase() === targetStatus;
    });
  }

  return filteredRows;
}

/**
 * Fetch a single person's detailed profile and their complete event,
 * registration, and check-in participation history.
 */
export async function fetchPersonDetail(
  personId: string,
  workspaceId: string,
  customClient?: any
): Promise<PersonDetailData> {
  const supabase = customClient || createClient();

  if (!personId || !workspaceId) {
    throw new Error('Person ID and Workspace ID are required.');
  }

  // 1. Fetch person record strictly within the active workspace
  const { data: person, error: personError } = await supabase
    .from('people')
    .select('*')
    .eq('id', personId)
    .eq('workspace_id', workspaceId)
    .single();

  if (personError || !person) {
    console.error('Error fetching person detail:', personError);
    throw new Error('Person not found or unauthorized.');
  }

  // 2. Fetch event_people for this person
  const { data: eventPeople, error: epError } = await supabase
    .from('event_people')
    .select(`
      id,
      event_id,
      person_id,
      person_type,
      status,
      created_at,
      updated_at,
      events:event_id (id, name, slug, start_date)
    `)
    .eq('person_id', personId);

  if (epError) {
    console.error('Error fetching event_people for person detail:', epError);
    throw new Error('Unable to load event links for this person.');
  }

  // 3. Fetch registrations for this person
  const { data: registrations, error: regError } = await supabase
    .from('registrations')
    .select(`
      id,
      event_id,
      person_id,
      event_person_id,
      registration_number,
      status,
      confirmation_status,
      registered_at,
      confirmed_at,
      cancelled_at,
      metadata,
      created_at,
      updated_at
    `)
    .eq('person_id', personId);

  if (regError) {
    console.error('Error fetching registrations for person detail:', regError);
    throw new Error('Unable to load registration records for this person.');
  }

  const pEventPeople: any[] = eventPeople || [];
  const pRegs: any[] = registrations || [];

  // 4. Fetch check_ins for these registrations
  const regIds: string[] = pRegs.map((r: any) => r.id);
  let pCheckIns: any[] = [];

  if (regIds.length > 0) {
    const { data: ciData, error: ciError } = await supabase
      .from('check_ins')
      .select(`
        id,
        event_id,
        registration_id,
        access_zone_id,
        result,
        reason,
        scanned_at,
        created_at,
        access_zones:access_zone_id (id, name)
      `)
      .in('registration_id', regIds)
      .order('scanned_at', { ascending: false });

    if (ciError) {
      console.error('Error fetching check-ins for person detail:', ciError);
    } else {
      pCheckIns = ciData || [];
    }
  }

  // 5. Consolidate events from event_people & registrations
  const eventIdsSet = new Set<string>();
  pEventPeople.forEach((ep: any) => eventIdsSet.add(ep.event_id));
  pRegs.forEach((r: any) => eventIdsSet.add(r.event_id));

  const eventHistory: PersonEventParticipation[] = Array.from(eventIdsSet).map((eventId) => {
    const ep = pEventPeople.find((item: any) => item.event_id === eventId);
    const reg = pRegs.find((item: any) => item.event_id === eventId);
    const eventCheckIns = pCheckIns.filter((ci: any) => ci.event_id === eventId);

    const eventObj = ep?.events;
    const eventName = eventObj?.name || 'Unnamed Event';
    const eventSlug = eventObj?.slug || null;
    const eventStartDate = eventObj?.start_date || null;

    const allowedScans = eventCheckIns.filter((ci: any) => ci.result === 'allowed');
    const hasAttended = allowedScans.length > 0;

    // Check-in timestamp extremes
    let firstCheckInAt: string | null = null;
    let lastCheckInAt: string | null = null;
    if (allowedScans.length > 0) {
      const sortedScans = [...allowedScans].sort(
        (a: any, b: any) =>
          new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
      );
      firstCheckInAt = sortedScans[0].scanned_at;
      lastCheckInAt = sortedScans[sortedScans.length - 1].scanned_at;
    }

    return {
      eventId,
      eventName,
      eventSlug,
      eventStartDate,
      personType: ep?.person_type || 'attendee',
      personStatus: ep?.status || 'active',
      registrationId: reg?.id || null,
      registrationNumber: reg?.registration_number || null,
      registrationStatus: reg?.status
        ? reg.status.charAt(0).toUpperCase() + reg.status.slice(1)
        : null,
      registeredAt: reg?.registered_at || reg?.created_at || null,
      hasAttended,
      checkInCount: allowedScans.length,
      firstCheckInAt,
      lastCheckInAt,
      checkIns: eventCheckIns.map((ci: any) => ({
        id: ci.id,
        scannedAt: ci.scanned_at,
        result: ci.result as 'allowed' | 'denied',
        zoneName: ci.access_zones?.name || null,
        reason: ci.reason || null,
      })),
    };
  });

  // Sort event history by start date or registration date descending
  eventHistory.sort((a, b) => {
    const timeA = new Date(a.eventStartDate || a.registeredAt || 0).getTime();
    const timeB = new Date(b.eventStartDate || b.registeredAt || 0).getTime();
    return timeB - timeA;
  });

  // Calculate high-level stats
  const eventsCount = eventHistory.length;
  const registrationsCount = pRegs.length;
  const attendedEventsCount = eventHistory.filter((eh) => eh.hasAttended).length;
  const totalScansCount = pCheckIns.length;

  const fullName = formatPersonName(person.first_name, person.last_name);

  return {
    person: {
      ...person,
      fullName,
    },
    stats: {
      eventsCount,
      registrationsCount,
      checkInsCount: attendedEventsCount,
      totalScansCount,
    },
    eventHistory,
  };
}

/**
 * Create a new Person in the active workspace.
 * Gracefully handles duplicate email conflicts on UNIQUE(workspace_id, email).
 */
export async function createPerson(
  input: CreatePersonInput,
  workspaceId: string,
  customClient?: any
): Promise<Person> {
  const supabase = customClient || createClient();

  if (!workspaceId) {
    throw new Error('Active workspace ID is required.');
  }

  const firstName = input.first_name?.trim();
  const lastName = input.last_name?.trim() || null;
  const email = input.email?.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  const organization = input.organization?.trim() || null;
  const jobTitle = input.job_title?.trim() || null;

  if (!firstName) {
    throw new Error('First name is required.');
  }
  if (!email) {
    throw new Error('Email address is required.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Please enter a valid email address.');
  }

  const { data, error } = await supabase
    .from('people')
    .insert({
      workspace_id: workspaceId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      organization,
      job_title: jobTitle,
    })
    .select('*')
    .single();

  if (error) {
    if (
      error.code === '23505' ||
      error.message.toLowerCase().includes('unique') ||
      error.message.toLowerCase().includes('duplicate')
    ) {
      throw new Error('This email is already associated with a person in this workspace.');
    }
    console.error('Error creating person:', error);
    throw new Error('Unable to create person. Please try again.');
  }

  return data as Person;
}

/**
 * Update an existing Person's details in the active workspace.
 * Gracefully handles unique constraint collisions.
 */
export async function updatePerson(
  personId: string,
  input: UpdatePersonInput,
  workspaceId: string,
  customClient?: any
): Promise<Person> {
  const supabase = customClient || createClient();

  if (!personId || !workspaceId) {
    throw new Error('Person ID and Workspace ID are required.');
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.first_name !== undefined) {
    const fName = input.first_name.trim();
    if (!fName) throw new Error('First name cannot be empty.');
    updates.first_name = fName;
  }

  if (input.last_name !== undefined) {
    updates.last_name = input.last_name?.trim() || null;
  }

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    if (!email) throw new Error('Email cannot be empty.');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address.');
    }
    updates.email = email;
  }

  if (input.phone !== undefined) {
    updates.phone = input.phone?.trim() || null;
  }

  if (input.organization !== undefined) {
    updates.organization = input.organization?.trim() || null;
  }

  if (input.job_title !== undefined) {
    updates.job_title = input.job_title?.trim() || null;
  }

  const { data, error } = await supabase
    .from('people')
    .update(updates)
    .eq('id', personId)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single();

  if (error) {
    if (
      error.code === '23505' ||
      error.message.toLowerCase().includes('unique') ||
      error.message.toLowerCase().includes('duplicate')
    ) {
      throw new Error('This email is already associated with another person in this workspace.');
    }
    console.error('Error updating person:', error);
    throw new Error('Unable to update person details. Please try again.');
  }

  return data as Person;
}
