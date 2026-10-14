"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Event, UserPreferences, WorkspaceDetails } from '../types';
import { createClient } from '@/lib/supabase/client';

export type Workspace = WorkspaceDetails;

interface AppContextType {
  currentUser: User | null;
  currentRole: string | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  userPreferences: UserPreferences | null;
  events: Event[];
  isHydrated: boolean;
  createEvent: (event: Partial<Event>) => Promise<Event>;
  getEvent: (id: string) => Event | undefined;
  getEventBySlug: (slug: string) => Event | undefined;
  updateEvent: (event: Event) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
  updateUserPreferences: (prefs: Partial<UserPreferences>) => Promise<UserPreferences>;
  updateActiveWorkspace: (updates: Partial<Workspace>) => Promise<Workspace>;
  refreshContext: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  
  const supabase = createClient();

  const refreshContext = async () => {
    try {
      // 1. Get authenticated user (checking session or getUser for reliable SSR cookie reading)
      let authUser = null;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        authUser = session.user;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          authUser = userData.user;
        }
      }
      
      if (!authUser) {
        setCurrentUser(null);
        setCurrentRole(null);
        setWorkspaces([]);
        setActiveWorkspace(null);
        setUserPreferences(null);
        setEvents([]);
        setIsHydrated(true);
        return;
      }

      // 2. Fetch profile with fallback to auth metadata
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const resolvedName = profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';

      setCurrentUser({
        id: authUser.id,
        name: resolvedName,
        email: authUser.email || '',
      });

      // 3. Fetch user preferences
      try {
        const { data: prefs, error: prefErr } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (prefs && !prefErr) {
          setUserPreferences(prefs as UserPreferences);
        }
      } catch {
        // Table may be pending remote migration
      }

      // 4. Fetch workspaces user is member of
      let userWorkspaces: Workspace[] = [];
      const { data: memberWorkspaces } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(*)')
        .eq('user_id', authUser.id);

      if (memberWorkspaces && memberWorkspaces.length > 0) {
        userWorkspaces = memberWorkspaces
          .map((mw: any) => mw.workspaces)
          .filter(Boolean) as Workspace[];
      }

      // Fallback: Check if user owns workspaces directly
      if (userWorkspaces.length === 0) {
        const { data: ownedWorkspaces } = await supabase
          .from('workspaces')
          .select('*')
          .eq('owner_id', authUser.id);
        if (ownedWorkspaces && ownedWorkspaces.length > 0) {
          userWorkspaces = ownedWorkspaces as Workspace[];
        }
      }

      // Fallback: If user has no workspace at all, create one
      if (userWorkspaces.length === 0) {
        const fallbackSlug = `ws-${Math.random().toString(36).substring(2, 10)}`;
        const wsName = resolvedName ? `${resolvedName}'s Workspace` : 'My Workspace';
        const { data: newWs } = await supabase
          .from('workspaces')
          .insert({
            name: wsName,
            slug: fallbackSlug,
            owner_id: authUser.id,
          })
          .select()
          .maybeSingle();

        if (newWs) {
          await supabase.from('workspace_members').insert({
            workspace_id: newWs.id,
            user_id: authUser.id,
            role_id: '98ea8ad3-2801-4ac5-9697-ef1c5e845269',
          });
          userWorkspaces = [newWs as Workspace];
        }
      }

      if (userWorkspaces.length > 0) {
        setWorkspaces(userWorkspaces);
        
        // Pick first workspace as active (or maintain currently active if still valid)
        const currentActive = activeWorkspace && userWorkspaces.some(w => w.id === activeWorkspace.id)
          ? userWorkspaces.find(w => w.id === activeWorkspace.id)!
          : userWorkspaces[0];
        setActiveWorkspace(currentActive);

        // 5. Fetch user's role in the active workspace
        if (currentActive) {
          try {
            const { data: memberData } = await supabase
              .from('workspace_members')
              .select('role_id, roles(name)')
              .eq('workspace_id', currentActive.id)
              .eq('user_id', authUser.id)
              .maybeSingle();

            if (memberData && (memberData as any).roles) {
              setCurrentRole((memberData as any).roles.name);
            } else if (currentActive.owner_id === authUser.id) {
              setCurrentRole('workspace_owner');
            } else {
              setCurrentRole('member');
            }
          } catch {
            if (currentActive.owner_id === authUser.id) {
              setCurrentRole('workspace_owner');
            } else {
              setCurrentRole('member');
            }
          }

          // 6. Fetch events for active workspace
          const { data: workspaceEvents } = await supabase
            .from('events')
            .select('*')
            .eq('workspace_id', currentActive.id)
            .order('created_at', { ascending: false });

          if (workspaceEvents) {
            // Map DB snake_case back to domain camelCase
            const mappedEvents = workspaceEvents.map(e => ({
              id: e.id,
              slug: e.slug,
              name: e.name,
              type: e.type,
              format: e.format,
              startDate: e.start_date,
              endDate: e.end_date,
              startTime: e.start_time,
              endTime: e.end_time,
              timezone: e.timezone,
              location: e.location,
              description: e.description,
              status: e.status,
              workspace_id: e.workspace_id,
              createdAt: e.created_at,
              flyer: e.flyer_url,
              website: e.website
            }));
            setEvents(mappedEvents as Event[]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load application context from Supabase', e);
    } finally {
      setIsHydrated(true);
    }
  };

  useEffect(() => {
    refreshContext();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      refreshContext();
    });

    return () => subscription.unsubscribe();
  }, []);

  const createEvent = async (newEventData: Partial<Event>): Promise<Event> => {
    let effectiveUser = currentUser;
    let effectiveWorkspace = activeWorkspace;

    // Self-healing: if state hasn't hydrated or is missing, resolve directly from Supabase
    if (!effectiveUser || !effectiveWorkspace) {
      let authUser = null;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        authUser = session.user;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        authUser = userData?.user;
      }

      if (!authUser) {
        throw new Error('Not authenticated. Please sign in to create an event.');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      effectiveUser = {
        id: authUser.id,
        name: profile?.full_name || authUser.user_metadata?.full_name || 'Organizer',
        email: authUser.email || '',
      };
      setCurrentUser(effectiveUser);

      const { data: memberWorkspaces } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(*)')
        .eq('user_id', authUser.id);

      let foundWorkspaces: Workspace[] = [];
      if (memberWorkspaces && memberWorkspaces.length > 0) {
        foundWorkspaces = memberWorkspaces
          .map((mw: any) => mw.workspaces)
          .filter(Boolean) as Workspace[];
      }

      if (foundWorkspaces.length === 0) {
        const { data: ownedWorkspaces } = await supabase
          .from('workspaces')
          .select('*')
          .eq('owner_id', authUser.id);
        if (ownedWorkspaces && ownedWorkspaces.length > 0) {
          foundWorkspaces = ownedWorkspaces as Workspace[];
        }
      }

      if (foundWorkspaces.length > 0) {
        effectiveWorkspace = foundWorkspaces[0];
        setActiveWorkspace(effectiveWorkspace);
        setWorkspaces(foundWorkspaces);
      }
    }

    if (!effectiveUser) {
      throw new Error('Not authenticated. Please sign in to create an event.');
    }
    if (!effectiveWorkspace) {
      throw new Error('No active workspace found. Please select or create a workspace.');
    }

    const { data, error } = await supabase
      .from('events')
      .insert([{
        workspace_id: effectiveWorkspace.id,
        created_by: effectiveUser.id,
        name: newEventData.name,
        slug: newEventData.slug,
        type: newEventData.type,
        format: newEventData.format,
        status: newEventData.status || 'draft',
        start_date: newEventData.startDate,
        end_date: newEventData.endDate,
        start_time: newEventData.startTime,
        end_time: newEventData.endTime,
        timezone: newEventData.timezone || 'UTC',
        location: newEventData.location,
        description: newEventData.description,
        flyer_url: newEventData.flyer,
        website: newEventData.website || {}
      }])
      .select()
      .single();

    if (error) throw error;

    const mappedCreatedEvent: Event = {
      id: data.id,
      slug: data.slug,
      name: data.name,
      type: data.type,
      format: data.format,
      startDate: data.start_date,
      endDate: data.end_date,
      startTime: data.start_time,
      endTime: data.end_time,
      timezone: data.timezone,
      location: data.location,
      description: data.description,
      status: data.status,
      workspace_id: data.workspace_id,
      createdAt: data.created_at,
      flyer: data.flyer_url,
      website: data.website
    };

    setEvents(prev => [mappedCreatedEvent, ...prev]);
    return mappedCreatedEvent;
  };

  const getEvent = (id: string) => {
    return events.find(e => e.id === id);
  };

  const getEventBySlug = (slug: string) => {
    return events.find(e => e.slug === slug);
  };

  const updateEvent = async (updatedEvent: Event): Promise<Event> => {
    const { data, error } = await supabase
      .from('events')
      .update({
        name: updatedEvent.name,
        slug: updatedEvent.slug,
        type: updatedEvent.type,
        format: updatedEvent.format,
        status: updatedEvent.status,
        start_date: updatedEvent.startDate,
        end_date: updatedEvent.endDate,
        start_time: updatedEvent.startTime,
        end_time: updatedEvent.endTime,
        timezone: updatedEvent.timezone,
        location: updatedEvent.location,
        description: updatedEvent.description,
        flyer_url: updatedEvent.flyer,
        website: updatedEvent.website
      })
      .eq('id', updatedEvent.id)
      .select()
      .single();

    if (error) throw error;

    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    return updatedEvent;
  };

  const deleteEvent = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const updateUserPreferences = async (newPrefs: Partial<UserPreferences>): Promise<UserPreferences> => {
    if (!currentUser) throw new Error('Not authenticated');

    const payload: any = {
      user_id: currentUser.id,
      ...newPrefs,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    setUserPreferences(data as UserPreferences);
    return data as UserPreferences;
  };

  const updateActiveWorkspace = async (updates: Partial<Workspace>): Promise<Workspace> => {
    if (!activeWorkspace) throw new Error('No active workspace');

    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.logo_url !== undefined) payload.logo_url = updates.logo_url;

    const { data, error } = await supabase
      .from('workspaces')
      .update(payload)
      .eq('id', activeWorkspace.id)
      .select()
      .single();

    if (error) throw error;
    const updatedWs = { ...activeWorkspace, ...data };
    setActiveWorkspace(updatedWs);
    setWorkspaces(prev => prev.map(w => w.id === updatedWs.id ? updatedWs : w));
    return updatedWs;
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      currentRole,
      workspaces,
      activeWorkspace,
      userPreferences,
      events,
      isHydrated,
      createEvent,
      getEvent,
      getEventBySlug,
      updateEvent,
      deleteEvent,
      updateUserPreferences,
      updateActiveWorkspace,
      refreshContext
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
