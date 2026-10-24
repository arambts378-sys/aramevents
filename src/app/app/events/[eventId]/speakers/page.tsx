'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { speakersService } from '@/services/speakers';
import { peopleService } from '@/services/people';
import { EventPerson, EventSpeakerProfile, Person } from '@/types';
import { createClient } from '@/lib/supabase/client';

export default function SpeakersPage() {
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const eventId = routeParams?.eventId as string;
  const editSpeakerId = searchParams.get('edit');

  const { getEvent, activeWorkspace, currentUser, isHydrated } = useAppContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [speakers, setSpeakers] = useState<EventPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters for Directory Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'standard'>('all');

  // Form State for Editorial Speaker Mode
  const [personForm, setPersonForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    organization: '',
    job_title: '',
    avatar_url: '' as string | null,
  });

  const [speakerForm, setSpeakerForm] = useState({
    headline: '',
    bio: '',
    website_url: '',
    twitter_url: '',
    linkedin_url: '',
    is_featured: false,
    display_order: 0,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Refs for smooth auto-scroll to invalid field
  const firstNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const headlineRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const event = getEvent(eventId);

  // Determine current active speaker in edit mode
  const selectedSpeaker = useMemo(() => {
    if (!editSpeakerId || editSpeakerId === 'new') return null;
    return speakers.find((s) => s.id === editSpeakerId) || null;
  }, [editSpeakerId, speakers]);

  const isEditorialMode = Boolean(editSpeakerId);
  const isEditingExisting = Boolean(editSpeakerId && editSpeakerId !== 'new');

  // Fetch speakers
  const fetchSpeakers = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await speakersService.getEventSpeakers(eventId);
      setSpeakers(data);
    } catch (err: any) {
      console.error('Failed to load speakers:', err);
      setError('Unable to load speakers. Please check your workspace permissions.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (isHydrated && eventId) {
      fetchSpeakers();
    }
  }, [isHydrated, eventId, fetchSpeakers]);

  // Synchronize form values whenever entering edit mode or selected speaker changes
  useEffect(() => {
    if (!isEditorialMode) return;

    if (isEditingExisting && selectedSpeaker) {
      setPersonForm({
        first_name: selectedSpeaker.person?.first_name || '',
        last_name: selectedSpeaker.person?.last_name || '',
        email: selectedSpeaker.person?.email || '',
        phone: selectedSpeaker.person?.phone || '',
        organization: selectedSpeaker.person?.organization || '',
        job_title: selectedSpeaker.person?.job_title || '',
        avatar_url: selectedSpeaker.person?.avatar_url || null,
      });

      setSpeakerForm({
        headline: selectedSpeaker.speaker_profile?.headline || '',
        bio: selectedSpeaker.speaker_profile?.bio || '',
        website_url: selectedSpeaker.speaker_profile?.website_url || '',
        twitter_url: selectedSpeaker.speaker_profile?.twitter_url || '',
        linkedin_url: selectedSpeaker.speaker_profile?.linkedin_url || '',
        is_featured: selectedSpeaker.speaker_profile?.is_featured || false,
        display_order: selectedSpeaker.speaker_profile?.display_order || 0,
      });
    } else if (editSpeakerId === 'new') {
      setPersonForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        organization: '',
        job_title: '',
        avatar_url: null,
      });

      setSpeakerForm({
        headline: '',
        bio: '',
        website_url: '',
        twitter_url: '',
        linkedin_url: '',
        is_featured: false,
        display_order: speakers.length,
      });
    }

    setFormErrors({});
    setIsSavedSuccess(false);
  }, [isEditorialMode, isEditingExisting, selectedSpeaker, editSpeakerId, speakers.length]);

  // Derived Summary Metrics
  const metrics = useMemo(() => {
    const total = speakers.length;
    const active = speakers.filter((s) => s.status === 'active').length;
    const featured = speakers.filter(
      (s) => s.status === 'active' && s.speaker_profile?.is_featured
    ).length;
    return { total, active, featured };
  }, [speakers]);

  // Filtered Speakers for Directory Mode
  const filteredSpeakers = useMemo(() => {
    return speakers.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (featuredFilter === 'featured' && !p.speaker_profile?.is_featured) return false;
      if (featuredFilter === 'standard' && p.speaker_profile?.is_featured) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const first = p.person?.first_name?.toLowerCase() || '';
        const last = p.person?.last_name?.toLowerCase() || '';
        const email = p.person?.email?.toLowerCase() || '';
        const org = p.person?.organization?.toLowerCase() || '';
        const job = p.person?.job_title?.toLowerCase() || '';
        const headline = p.speaker_profile?.headline?.toLowerCase() || '';

        if (
          !first.includes(query) &&
          !last.includes(query) &&
          !email.includes(query) &&
          !org.includes(query) &&
          !job.includes(query) &&
          !headline.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [speakers, searchQuery, statusFilter, featuredFilter]);

  // Status Toggle (Remove / Reactivate)
  const handleToggleStatus = async (speaker: EventPerson) => {
    const newStatus = speaker.status === 'active' ? 'inactive' : 'active';
    if (newStatus === 'inactive') {
      const confirmed = window.confirm(
        `Are you sure you want to deactivate ${speaker.person?.first_name || 'this speaker'}? They will be hidden from the active event lineup while preserving their profile.`
      );
      if (!confirmed) return;
    }

    try {
      if (newStatus === 'inactive') {
        await speakersService.removeSpeaker(speaker.id);
      } else {
        await peopleService.updateEventPersonStatus(speaker.id, 'active');
      }

      setSuccessMessage(
        `Speaker marked as ${newStatus === 'active' ? 'Active' : 'Inactive'}.`
      );
      await fetchSpeakers();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Failed to update status. Check permissions.');
    }
  };

  // Photo Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid image file (PNG, JPG, or WebP).');
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Speaker photo size exceeds 2MB limit. Please choose a smaller photo.');
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Please sign in again before uploading.');
      const fileExt = file.name.split('.').pop() || 'png';
      const cleanFileName = `speaker_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${user.id}/speakers/${cleanFileName}`;

      let bucketName = 'organization-logos';
      let uploadResult = await supabase.storage.from(bucketName).upload(filePath, file, {
        upsert: true,
      });

      if (uploadResult.error) {
        bucketName = 'event-flyers';
        uploadResult = await supabase.storage.from(bucketName).upload(`${user.id}/speaker_avatars/${cleanFileName}`, file, {
          upsert: true,
        });

        if (uploadResult.error) {
          // If direct storage fails, attempt server flyer-upload endpoint as standard fallback
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/events/flyer-upload', {
            method: 'POST',
            body: formData,
          });
          const json = await res.json();
          if (!res.ok || !json.url) {
            throw new Error(json.error || 'Failed to upload photo.');
          }
          setPersonForm((prev) => ({ ...prev, avatar_url: json.url }));
          return;
        }
      }

      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uploadResult.data.path);

      setPersonForm((prev) => ({ ...prev, avatar_url: publicData.publicUrl }));
    } catch (err: any) {
      console.error('Photo upload error:', err);
      alert(err?.message || 'Unable to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setPersonForm((prev) => ({ ...prev, avatar_url: null }));
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!personForm.first_name.trim()) {
      errors.first_name = 'First name is required.';
    }

    if (!personForm.email.trim()) {
      errors.email = 'Email address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(personForm.email.trim())) {
        errors.email = 'Please provide a valid email address.';
      }
    }

    if (!speakerForm.headline.trim()) {
      errors.headline = 'Presenter headline is required.';
    }

    if (speakerForm.website_url.trim()) {
      try {
        new URL(speakerForm.website_url.trim());
      } catch {
        errors.website_url = 'Please enter a valid website URL (e.g. https://example.com).';
      }
    }

    if (speakerForm.linkedin_url.trim()) {
      try {
        new URL(speakerForm.linkedin_url.trim());
      } catch {
        errors.linkedin_url = 'Please enter a valid LinkedIn URL.';
      }
    }

    if (speakerForm.twitter_url.trim()) {
      try {
        new URL(speakerForm.twitter_url.trim());
      } catch {
        errors.twitter_url = 'Please enter a valid Twitter/X URL.';
      }
    }

    setFormErrors(errors);

    // Smooth auto-scroll to first invalid element
    if (errors.first_name && firstNameRef.current) {
      firstNameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstNameRef.current.focus();
    } else if (errors.email && emailRef.current) {
      emailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      emailRef.current.focus();
    } else if (errors.headline && headlineRef.current) {
      headlineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      headlineRef.current.focus();
    }

    return Object.keys(errors).length === 0;
  };

  // Form Submit Handler
  const handleSaveSpeaker = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) return;
    if (!activeWorkspace?.id) {
      alert('No active workspace selected.');
      return;
    }

    setIsSubmitting(true);
    setIsSavedSuccess(false);

    try {
      const personPayload = {
        first_name: personForm.first_name.trim(),
        last_name: personForm.last_name.trim() || undefined,
        email: personForm.email.trim().toLowerCase(),
        phone: personForm.phone.trim() || undefined,
        organization: personForm.organization.trim() || undefined,
        job_title: personForm.job_title.trim() || undefined,
      };

      if (isEditingExisting && selectedSpeaker?.person?.id) {
        // Update existing speaker profile
        const updateSpeakerPayload: Partial<EventSpeakerProfile> = {
          headline: speakerForm.headline.trim() || null,
          bio: speakerForm.bio.trim() || null,
          website_url: speakerForm.website_url.trim() || null,
          twitter_url: speakerForm.twitter_url.trim() || null,
          linkedin_url: speakerForm.linkedin_url.trim() || null,
          is_featured: speakerForm.is_featured,
          display_order: Number(speakerForm.display_order) || 0,
        };

        await speakersService.updateSpeakerProfile(
          selectedSpeaker.id,
          selectedSpeaker.person.id,
          {
            first_name: personPayload.first_name,
            last_name: personPayload.last_name || null,
            phone: personPayload.phone || null,
            organization: personPayload.organization || null,
            job_title: personPayload.job_title || null,
            avatar_url: personForm.avatar_url || null,
          },
          updateSpeakerPayload
        );
      } else {
        // Add new speaker to event
        const addSpeakerPayload = {
          headline: speakerForm.headline.trim() || undefined,
          bio: speakerForm.bio.trim() || undefined,
          website_url: speakerForm.website_url.trim() || undefined,
          twitter_url: speakerForm.twitter_url.trim() || undefined,
          linkedin_url: speakerForm.linkedin_url.trim() || undefined,
          is_featured: speakerForm.is_featured,
        };

        const createdEventPerson = await speakersService.addSpeakerToEvent(
          activeWorkspace.id,
          eventId,
          personPayload,
          addSpeakerPayload
        );

        // Ensure avatar_url is persisted on the person record
        if (personForm.avatar_url && createdEventPerson.person_id) {
          await peopleService.updatePerson(createdEventPerson.person_id, {
            avatar_url: personForm.avatar_url,
          });
        }
      }

      await fetchSpeakers();
      setIsSavedSuccess(true);
      setSuccessMessage(
        `Speaker "${(personForm.first_name + ' ' + (personForm.last_name || '')).trim()}" profile saved successfully.`
      );

      // Return to directory after brief confirmation feedback
      setTimeout(() => {
        setIsSavedSuccess(false);
        router.push(`/app/events/${eventId}/speakers`);
      }, 1000);
    } catch (err: any) {
      console.error('Error saving speaker:', err);
      alert(err?.message || 'Failed to save speaker. Please verify your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for Initials
  const getInitials = (first?: string | null, last?: string | null) => {
    const f = first?.trim().charAt(0) || '';
    const l = last?.trim().charAt(0) || '';
    return (f + l).toUpperCase() || 'SP';
  };

  // Loading Skeleton State
  if (!isHydrated || loading) {
    return (
      <div className="h-full bg-[#F7F5FF] text-[#17152B] antialiased min-h-screen w-full">
        <div className="min-h-screen flex flex-row w-full bg-[#F7F5FF]">
          <Sidebar currentUser={currentUser} />
          <main className="flex-1 min-w-0 bg-[#F7F5FF] min-h-screen px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 overflow-y-auto w-full">
            <div className="w-full space-y-8 animate-pulse">
              <div className="h-5 w-36 bg-[#E6E2F0] rounded-md" />
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <div className="h-10 w-72 bg-[#E6E2F0] rounded-xl" />
                  <div className="h-4 w-96 bg-[#E6E2F0] rounded" />
                </div>
                <div className="h-10 w-36 bg-[#E6E2F0] rounded-xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
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

  // Event Not Found State
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
        {/* Left Persistent Sidebar (230px) */}
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Right Main Content Area */}
        <main className="flex-1 min-w-0 bg-[#F7F5FF] min-h-screen px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 overflow-y-auto w-full">
          <div className="w-full space-y-8">
            {/* Notification Feedback Banner */}
            {successMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-jakarta flex items-center gap-3 shadow-xs">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                  check_circle
                </span>
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-jakarta flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-rose-600 text-[20px]">error</span>
                  <span>{error}</span>
                </div>
                <button
                  onClick={fetchSpeakers}
                  className="px-3 py-1 bg-white border border-rose-200 text-rose-700 font-semibold rounded-lg text-xs hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MODE 1: EDITORIAL SPEAKER EDIT MODE (?edit={speakerId} or ?edit=new)     */}
            {/* ========================================================================= */}
            {isEditorialMode ? (
              <div className="space-y-8">
                {/* 1. Header Hierarchy */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => router.push(`/app/events/${eventId}/speakers`)}
                      className="inline-flex items-center gap-1.5 font-semibold text-[13px] text-[#77738A] hover:text-[#7C5CFC] transition-colors group font-jakarta cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform duration-150">
                        arrow_back
                      </span>
                      <span>Back to Speakers</span>
                    </button>

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

                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-1">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-[#77738A]">
                          EVENT WORKSPACE · {event.name}
                        </span>
                      </div>
                      <h1 className="text-[32px] md:text-[40px] tracking-tight font-bold text-[#17152B] leading-none font-space uppercase">
                        {isEditingExisting ? 'SPEAKER' : 'NEW SPEAKER'}
                      </h1>
                      <p className="text-[14px] text-[#77738A] font-jakarta">
                        Edit speaker profile and event information.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/app/events/${eventId}/speakers`)}
                        disabled={isSubmitting}
                        className="px-4 h-11 rounded-xl bg-white border border-[#E6E2F0] text-[#17152B] font-semibold text-[13px] hover:border-[#7C5CFC] transition-colors font-jakarta shadow-xs disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveSpeaker()}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-6 h-11 rounded-xl bg-[#7C5CFC] text-white font-semibold text-[13px] hover:bg-[#5B3FE8] transition-colors shadow-xs active:scale-[0.99] font-jakarta disabled:opacity-70 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>Saving...</span>
                          </>
                        ) : isSavedSuccess ? (
                          <>
                            <span className="material-symbols-outlined text-[18px]">check</span>
                            <span>Saved</span>
                          </>
                        ) : (
                          <span>Save Changes</span>
                        )}
                      </button>
                    </div>
                  </div>
                </section>

                {/* 2. Editorial Layout (65% Left / 35% Right) */}
                <form onSubmit={handleSaveSpeaker} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* LEFT / MAIN EDITOR (65%) */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* Card 1: PROFILE */}
                    <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
                      <div className="border-b border-[#E6E2F0] pb-4">
                        <h2 className="text-[16px] font-bold text-[#17152B] font-space tracking-tight">
                          PROFILE
                        </h2>
                        <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5">
                          Manage basic speaker information.
                        </p>
                      </div>

                      {/* Photo Upload Section */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 bg-[#FAF9FF] rounded-xl border border-[#E6E2F0]/70">
                        <div className="w-20 h-20 rounded-2xl bg-white border border-[#E6E2F0] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                          {personForm.avatar_url ? (
                            <img
                              src={personForm.avatar_url}
                              alt="Speaker Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl font-bold text-[#7C5CFC] font-space">
                              {getInitials(personForm.first_name, personForm.last_name)}
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => photoInputRef.current?.click()}
                              disabled={isUploadingPhoto || isSubmitting}
                              className="px-3.5 py-1.5 bg-white border border-[#E6E2F0] hover:border-[#7C5CFC] hover:text-[#7C5CFC] text-[13px] font-semibold text-[#17152B] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 font-jakarta flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {isUploadingPhoto ? 'sync' : 'photo_camera'}
                              </span>
                              <span>
                                {isUploadingPhoto
                                  ? 'Uploading...'
                                  : personForm.avatar_url
                                  ? 'Change Photo'
                                  : 'Upload Photo'}
                              </span>
                            </button>

                            {personForm.avatar_url && (
                              <button
                                type="button"
                                onClick={handleRemovePhoto}
                                disabled={isUploadingPhoto || isSubmitting}
                                className="px-3.5 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[13px] font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 font-jakarta flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-[#77738A] font-jakarta">
                            JPG, PNG, or WebP. Max 2MB. Photo will appear immediately in Public Preview.
                          </p>
                          <input
                            type="file"
                            ref={photoInputRef}
                            onChange={handlePhotoUpload}
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="hidden"
                          />
                        </div>
                      </div>

                      {/* Name Fields (2 Columns Desktop) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[13px] font-semibold text-[#17152B] font-jakarta">
                            First Name <span className="text-[#DC2626]">*</span>
                          </label>
                          <input
                            type="text"
                            ref={firstNameRef}
                            value={personForm.first_name}
                            onChange={(e) => {
                              setPersonForm({ ...personForm, first_name: e.target.value });
                              if (formErrors.first_name) {
                                setFormErrors({ ...formErrors, first_name: '' });
                              }
                            }}
                            placeholder="e.g. Jane"
                            className={`w-full px-4 py-2.5 bg-white border rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:ring-1 transition-all font-jakarta shadow-2xs ${
                              formErrors.first_name
                                ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
                                : 'border-[#E6E2F0] focus:border-[#7C5CFC] focus:ring-[#7C5CFC]'
                            }`}
                          />
                          {formErrors.first_name && (
                            <p className="text-[#DC2626] text-xs font-medium font-jakarta mt-1">
                              {formErrors.first_name}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[13px] font-semibold text-[#17152B] font-jakarta">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={personForm.last_name}
                            onChange={(e) =>
                              setPersonForm({ ...personForm, last_name: e.target.value })
                            }
                            placeholder="e.g. Doe"
                            className="w-full px-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-all font-jakarta shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Contact Fields (2 Columns Desktop) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-[13px] font-semibold text-[#17152B] font-jakarta">
                              Email Address <span className="text-[#DC2626]">*</span>
                            </label>
                            {isEditingExisting && (
                              <span className="text-[10px] font-medium text-[#77738A] bg-[#F6F1FF] border border-[#E6E2F0] px-1.5 py-0.5 rounded font-jakarta">
                                Identity Bound
                              </span>
                            )}
                          </div>
                          <input
                            type="email"
                            ref={emailRef}
                            value={personForm.email}
                            disabled={isEditingExisting}
                            onChange={(e) => {
                              setPersonForm({ ...personForm, email: e.target.value });
                              if (formErrors.email) {
                                setFormErrors({ ...formErrors, email: '' });
                              }
                            }}
                            placeholder="e.g. jane@company.com"
                            className={`w-full px-4 py-2.5 border rounded-xl text-[14px] transition-all font-jakarta shadow-2xs ${
                              isEditingExisting
                                ? 'bg-[#FAF9FF] text-[#77738A] border-[#E6E2F0] cursor-not-allowed'
                                : formErrors.email
                                ? 'bg-white border-[#DC2626] text-[#17152B] focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]'
                                : 'bg-white border-[#E6E2F0] text-[#17152B] focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC]'
                            }`}
                          />
                          {formErrors.email && (
                            <p className="text-[#DC2626] text-xs font-medium font-jakarta mt-1">
                              {formErrors.email}
                            </p>
                          )}
                          {isEditingExisting && (
                            <p className="text-[11px] text-[#77738A] font-jakarta">
                              Email address is preserved and tied to workspace identity.
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[13px] font-semibold text-[#17152B] font-jakarta">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={personForm.phone}
                            onChange={(e) =>
                              setPersonForm({ ...personForm, phone: e.target.value })
                            }
                            placeholder="e.g. +1 (555) 000-0000"
                            className="w-full px-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-all font-jakarta shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card 2: PROFESSIONAL INFORMATION */}
                    <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
                      <div className="border-b border-[#E6E2F0] pb-4">
                        <h2 className="text-[16px] font-bold text-[#17152B] font-space tracking-tight">
                          PROFESSIONAL INFORMATION
                        </h2>
                        <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5">
                          Professional background and company affiliation.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[13px] font-semibold text-[#17152B] font-jakarta">
                            Job Title
                          </label>
                          <input
                            type="text"
                            value={personForm.job_title}
                            onChange={(e) =>
                              setPersonForm({ ...personForm, job_title: e.target.value })
                            }
                            placeholder="e.g. AI Engineer"
                            className="w-full px-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-all font-jakarta shadow-2xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[13px] font-semibold text-[#17152B] font-jakarta">
                            Organization
                          </label>
                          <input
                            type="text"
                            value={personForm.organization}
                            onChange={(e) =>
                              setPersonForm({ ...personForm, organization: e.target.value })
                            }
                            placeholder="e.g. ARAM Analytics"
                            className="w-full px-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-all font-jakarta shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card 3: BIOGRAPHY */}
                    <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
                      <div className="border-b border-[#E6E2F0] pb-4">
                        <h2 className="text-[16px] font-bold text-[#17152B] font-space tracking-tight">
                          BIOGRAPHY
                        </h2>
                        <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5">
                          Public presenter summary and event introduction.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[13px] font-semibold text-[#17152B] font-jakarta">
                          Headline <span className="text-[#DC2626]">*</span>
                        </label>
                        <input
                          type="text"
                          ref={headlineRef}
                          value={speakerForm.headline}
                          onChange={(e) => {
                            setSpeakerForm({ ...speakerForm, headline: e.target.value });
                            if (formErrors.headline) {
                              setFormErrors({ ...formErrors, headline: '' });
                            }
                          }}
                          placeholder="e.g. Keynote Speaker & AI Visionary"
                          className={`w-full px-4 py-2.5 bg-white border rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:ring-1 transition-all font-jakarta shadow-2xs ${
                            formErrors.headline
                              ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
                              : 'border-[#E6E2F0] focus:border-[#7C5CFC] focus:ring-[#7C5CFC]'
                          }`}
                        />
                        {formErrors.headline && (
                          <p className="text-[#DC2626] text-xs font-medium font-jakarta mt-1">
                            {formErrors.headline}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-[13px] font-semibold text-[#17152B] font-jakarta">
                            Biography
                          </label>
                          <span className="text-[11px] text-[#77738A] font-mono">
                            {speakerForm.bio.length} chars
                          </span>
                        </div>
                        <textarea
                          value={speakerForm.bio}
                          onChange={(e) =>
                            setSpeakerForm({ ...speakerForm, bio: e.target.value })
                          }
                          rows={5}
                          placeholder="Detailed presenter biography for the public website and program..."
                          className="w-full px-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-all font-jakarta shadow-2xs resize-y"
                        />
                      </div>
                    </div>

                    {/* Card 4: SOCIAL PROFILES */}
                    <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
                      <div className="border-b border-[#E6E2F0] pb-4">
                        <h2 className="text-[16px] font-bold text-[#17152B] font-space tracking-tight">
                          SOCIAL PROFILES
                        </h2>
                        <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5">
                          Connect social media and personal portfolio links.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-[13px] font-semibold text-[#17152B] font-jakarta">
                            LinkedIn URL
                          </label>
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#77738A] text-[18px]">
                              link
                            </span>
                            <input
                              type="url"
                              value={speakerForm.linkedin_url}
                              onChange={(e) =>
                                setSpeakerForm({ ...speakerForm, linkedin_url: e.target.value })
                              }
                              placeholder="https://linkedin.com/in/username"
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-all font-jakarta shadow-2xs"
                            />
                          </div>
                          {formErrors.linkedin_url && (
                            <p className="text-[#DC2626] text-xs font-medium font-jakarta mt-1">
                              {formErrors.linkedin_url}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[13px] font-semibold text-[#17152B] font-jakarta">
                            Website URL
                          </label>
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#77738A] text-[18px]">
                              language
                            </span>
                            <input
                              type="url"
                              value={speakerForm.website_url}
                              onChange={(e) =>
                                setSpeakerForm({ ...speakerForm, website_url: e.target.value })
                              }
                              placeholder="https://yourwebsite.com"
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-all font-jakarta shadow-2xs"
                            />
                          </div>
                          {formErrors.website_url && (
                            <p className="text-[#DC2626] text-xs font-medium font-jakarta mt-1">
                              {formErrors.website_url}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[13px] font-semibold text-[#17152B] font-jakarta">
                            X / Twitter URL
                          </label>
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#77738A] text-[18px]">
                              tag
                            </span>
                            <input
                              type="url"
                              value={speakerForm.twitter_url}
                              onChange={(e) =>
                                setSpeakerForm({ ...speakerForm, twitter_url: e.target.value })
                              }
                              placeholder="https://x.com/username"
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-all font-jakarta shadow-2xs"
                            />
                          </div>
                          {formErrors.twitter_url && (
                            <p className="text-[#DC2626] text-xs font-medium font-jakarta mt-1">
                              {formErrors.twitter_url}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card 5: DANGER ZONE (Bottom Subtle Placement) */}
                    {isEditingExisting && selectedSpeaker && (
                      <div className="bg-white border border-rose-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block">
                            DANGER ZONE
                          </span>
                          <h2 className="text-[16px] font-bold text-[#17152B] font-space mt-0.5">
                            {selectedSpeaker.status === 'active'
                              ? 'Deactivate Speaker'
                              : 'Reactivate Speaker'}
                          </h2>
                          <p className="text-[13px] text-[#77738A] font-jakarta mt-0.5 leading-relaxed">
                            {selectedSpeaker.status === 'active'
                              ? 'Deactivating removes this speaker from the public event website lineup while preserving their profile, history, and workspace record.'
                              : 'Reactivating restores this presenter to the active event speaker roster and public schedule.'}
                          </p>
                        </div>

                        <div className="pt-2 flex justify-start">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(selectedSpeaker)}
                            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer border ${
                              selectedSpeaker.status === 'active'
                                ? 'bg-white border-rose-200 text-rose-700 hover:bg-rose-50'
                                : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {selectedSpeaker.status === 'active'
                              ? 'Deactivate Speaker from Event'
                              : 'Reactivate Speaker'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT / SIDEBAR AREA (35%) */}
                  <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                    
                    {/* Card 1: PUBLIC PREVIEW */}
                    <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 shadow-xs space-y-4">
                      <div className="border-b border-[#E6E2F0] pb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C5CFC] block font-mono">
                          PUBLIC PREVIEW
                        </span>
                        <h2 className="text-[15px] font-bold text-[#17152B] font-space mt-0.5">
                          Lineup Preview
                        </h2>
                        <p className="text-[12px] text-[#77738A] font-jakarta">
                          Live preview of how this speaker appears on the event website.
                        </p>
                      </div>

                      {/* Mocked Website Speaker Card Preview */}
                      <div className="bg-[#FAF9FF] border border-[#E6E2F0] rounded-xl p-5 text-center space-y-3 transition-all duration-150">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-full mx-auto overflow-hidden bg-white border border-[#E6E2F0] flex items-center justify-center shadow-xs">
                          {personForm.avatar_url ? (
                            <img
                              src={personForm.avatar_url}
                              alt="Preview Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#F6F1FF] text-[#7C5CFC] font-bold font-space text-[22px] flex items-center justify-center">
                              {getInitials(personForm.first_name, personForm.last_name)}
                            </div>
                          )}
                        </div>

                        {/* Speaker Name */}
                        <div>
                          <h3 className="font-bold text-[#17152B] font-space text-[16px] leading-tight">
                            {personForm.first_name.trim() || personForm.last_name.trim()
                              ? `${personForm.first_name} ${personForm.last_name}`.trim()
                              : 'Speaker Name'}
                          </h3>
                          <div className="text-[12px] text-[#7C5CFC] font-semibold mt-0.5 line-clamp-1">
                            {speakerForm.headline.trim() || 'Presenter Headline'}
                          </div>
                        </div>

                        {/* Job Title & Org */}
                        {(personForm.job_title || personForm.organization) && (
                          <div className="text-[12px] text-[#77738A] font-jakarta leading-tight line-clamp-1">
                            {personForm.job_title}
                            {personForm.job_title && personForm.organization && ' at '}
                            {personForm.organization}
                          </div>
                        )}

                        {/* Bio snippet */}
                        <div className="text-[12px] text-[#77738A] font-jakarta line-clamp-3 text-left bg-white p-3 rounded-lg border border-[#E6E2F0]/60 italic leading-relaxed">
                          {speakerForm.bio.trim() || 'Speaker biography will appear here.'}
                        </div>

                        {/* Social Link Badges */}
                        <div className="flex items-center justify-center gap-3 pt-2 text-[#77738A]">
                          {speakerForm.linkedin_url && (
                            <a
                              href={speakerForm.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-[#0A66C2] transition-colors"
                              title="LinkedIn"
                            >
                              <span className="material-symbols-outlined text-[18px]">link</span>
                            </a>
                          )}
                          {speakerForm.website_url && (
                            <a
                              href={speakerForm.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-[#7C5CFC] transition-colors"
                              title="Website"
                            >
                              <span className="material-symbols-outlined text-[18px]">language</span>
                            </a>
                          )}
                          {speakerForm.twitter_url && (
                            <a
                              href={speakerForm.twitter_url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-black transition-colors"
                              title="Twitter / X"
                            >
                              <span className="material-symbols-outlined text-[18px]">tag</span>
                            </a>
                          )}
                          {!speakerForm.linkedin_url &&
                            !speakerForm.website_url &&
                            !speakerForm.twitter_url && (
                              <span className="text-[11px] text-[#77738A]/60 font-jakarta">
                                No social links provided
                              </span>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Card 2: EVENT VISIBILITY */}
                    <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 shadow-xs space-y-4">
                      <div className="border-b border-[#E6E2F0] pb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A] block font-mono">
                          EVENT SETTINGS
                        </span>
                        <h2 className="text-[15px] font-bold text-[#17152B] font-space mt-0.5">
                          Visibility &amp; Status
                        </h2>
                        <p className="text-[12px] text-[#77738A] font-jakarta">
                          Control visibility and featured status across this event.
                        </p>
                      </div>

                      {/* Featured Speaker Toggle */}
                      <div className="p-3.5 bg-[#FAF9FF] rounded-xl border border-[#E6E2F0] flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[13px] font-bold text-[#17152B] font-jakarta">
                            Featured Speaker
                          </div>
                          <div className="text-[11px] text-[#77738A] font-jakarta">
                            Highlight this speaker in featured lineups.
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={speakerForm.is_featured}
                            onChange={(e) =>
                              setSpeakerForm({ ...speakerForm, is_featured: e.target.checked })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7C5CFC]"></div>
                        </label>
                      </div>

                      {/* Current Status Badge */}
                      <div className="flex items-center justify-between p-3.5 bg-[#FAF9FF] rounded-xl border border-[#E6E2F0]">
                        <span className="text-[13px] font-bold text-[#17152B] font-jakarta">
                          Speaker Status
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wider ${
                            selectedSpeaker?.status === 'inactive'
                              ? 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              selectedSpeaker?.status === 'inactive'
                                ? 'bg-zinc-400'
                                : 'bg-emerald-500'
                            }`}
                          ></span>
                          <span>{selectedSpeaker?.status || 'active'}</span>
                        </span>
                      </div>

                      {/* Display Order */}
                      <div className="space-y-1.5">
                        <label className="block text-[13px] font-semibold text-[#17152B] font-jakarta">
                          Display Order
                        </label>
                        <input
                          type="number"
                          value={speakerForm.display_order}
                          onChange={(e) =>
                            setSpeakerForm({
                              ...speakerForm,
                              display_order: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          min={0}
                          className="w-full px-4 py-2 bg-white border border-[#E6E2F0] rounded-xl text-[14px] text-[#17152B] font-mono focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] transition-all font-jakarta shadow-2xs"
                        />
                        <p className="text-[11px] text-[#77738A] font-jakarta">
                          Lower numbers appear earlier in presenter lists.
                        </p>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              /* ========================================================================= */
              /* MODE 2: SPEAKER DIRECTORY MODE (/app/events/[eventId]/speakers)           */
              /* ========================================================================= */
              <div className="space-y-8">
                {/* 1. Top Navigation & Eyebrow */}
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
                        SPEAKERS
                      </h1>
                      <p className="text-[14px] text-[#77738A] font-jakarta">
                        Manage speakers, presenters and event participants.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/app/events/${eventId}/speakers?edit=new`)}
                        className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-[#7C5CFC] text-white font-semibold text-[13px] hover:bg-[#5B3FE8] transition-colors shadow-xs active:scale-[0.99] font-jakarta cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        <span>Add Speaker</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* 2. Summary Metric Cards (3 KPI Cards) */}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {/* Card 1: Total Speakers */}
                  <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A] font-jakarta">
                        Total Speakers
                      </span>
                      <span className="material-symbols-outlined text-[20px] text-[#7C5CFC]">
                        podium
                      </span>
                    </div>
                    <div className="text-[28px] font-bold text-[#17152B] font-space leading-tight">
                      {metrics.total}
                    </div>
                    <p className="text-[12px] text-[#77738A] font-jakarta">
                      All event speakers
                    </p>
                  </div>

                  {/* Card 2: Active */}
                  <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A] font-jakarta">
                        Active
                      </span>
                      <span className="material-symbols-outlined text-[20px] text-emerald-600">
                        check_circle
                      </span>
                    </div>
                    <div className="text-[28px] font-bold text-emerald-700 font-space leading-tight">
                      {metrics.active}
                    </div>
                    <p className="text-[12px] text-[#77738A] font-jakarta">
                      Currently active
                    </p>
                  </div>

                  {/* Card 3: Featured */}
                  <div className="bg-white border border-[#E6E2F0] rounded-2xl p-6 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#77738A] font-jakarta">
                        Featured
                      </span>
                      <span className="material-symbols-outlined text-[20px] text-amber-500">
                        star
                      </span>
                    </div>
                    <div className="text-[28px] font-bold text-[#17152B] font-space leading-tight">
                      {metrics.featured}
                    </div>
                    <p className="text-[12px] text-[#77738A] font-jakarta">
                      Featured speakers
                    </p>
                  </div>
                </section>

                {/* 3. Directory Toolbar (Search & Filters) */}
                <section className="bg-white border border-[#E6E2F0] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:w-80">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#77738A] text-[18px]">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search speakers..."
                      className="w-full pl-9 pr-4 py-2 bg-[#FAF9FF] border border-[#E6E2F0] rounded-xl text-[13px] text-[#17152B] placeholder:text-[#77738A] focus:outline-none focus:border-[#7C5CFC] transition-all font-jakarta"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <select
                      value={featuredFilter}
                      onChange={(e) => setFeaturedFilter(e.target.value as any)}
                      className="px-3 py-2 bg-white border border-[#E6E2F0] rounded-xl text-[12px] font-semibold text-[#17152B] focus:outline-none focus:border-[#7C5CFC] transition-colors font-jakarta shadow-2xs"
                    >
                      <option value="all">All Profiles</option>
                      <option value="featured">Featured Only</option>
                      <option value="standard">Standard Only</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-3 py-2 bg-white border border-[#E6E2F0] rounded-xl text-[12px] font-semibold text-[#17152B] focus:outline-none focus:border-[#7C5CFC] transition-colors font-jakarta shadow-2xs"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                    </select>
                  </div>
                </section>

                {/* 4. Speaker Cards Grid / Empty State */}
                {filteredSpeakers.length === 0 ? (
                  <div className="bg-white border border-[#E6E2F0] rounded-2xl py-16 px-6 text-center space-y-4 max-w-md mx-auto shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-[#F6F1FF] text-[#7C5CFC] flex items-center justify-center mx-auto border border-[#E6E2F0]">
                      <span className="material-symbols-outlined text-[28px]">podium</span>
                    </div>
                    {speakers.length === 0 ? (
                      <>
                        <div className="space-y-1">
                          <h3 className="text-[18px] font-bold text-[#17152B] font-space">
                            No speakers added yet
                          </h3>
                          <p className="text-[13px] text-[#77738A] font-jakarta leading-relaxed">
                            Add speakers to build your event program and populate the public presenter lineup.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push(`/app/events/${eventId}/speakers?edit=new`)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7C5CFC] text-white font-semibold text-[13px] hover:bg-[#5B3FE8] transition-colors shadow-xs font-jakarta"
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                          <span>Add Speaker</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <h3 className="text-[18px] font-bold text-[#17152B] font-space">
                            No matching speakers
                          </h3>
                          <p className="text-[13px] text-[#77738A] font-jakarta">
                            Try adjusting your search query or profile filters.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setFeaturedFilter('all');
                            setStatusFilter('all');
                          }}
                          className="px-4 py-2 text-[#7C5CFC] text-xs font-semibold hover:bg-[#F6F1FF] rounded-lg transition-colors font-jakarta"
                        >
                          Clear Filters
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredSpeakers.map((p) => (
                      <div
                        key={p.id}
                        className={`bg-white border border-[#E6E2F0] rounded-2xl p-6 shadow-xs hover:border-[#7C5CFC]/60 transition-all duration-200 flex flex-col justify-between relative group ${
                          p.status === 'inactive' ? 'opacity-60' : ''
                        }`}
                      >
                        {/* Top Badges */}
                        <div className="flex items-center justify-end gap-1.5 min-h-[22px]">
                          {p.speaker_profile?.is_featured && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono font-bold uppercase tracking-wider">
                              <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                              Featured
                            </span>
                          )}
                          {p.status === 'inactive' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-wider">
                              Inactive
                            </span>
                          )}
                        </div>

                        {/* Speaker Identity Info */}
                        <div className="flex flex-col items-center text-center mt-2">
                          <div className="w-20 h-20 rounded-full bg-[#F6F1FF] text-[#7C5CFC] flex items-center justify-center font-bold font-space text-[22px] mb-3 border border-[#E6E2F0] overflow-hidden shadow-2xs">
                            {p.person?.avatar_url ? (
                              <img
                                src={p.person.avatar_url}
                                alt={`${p.person.first_name} ${p.person.last_name}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{getInitials(p.person?.first_name, p.person?.last_name)}</span>
                            )}
                          </div>

                          <h3 className="font-bold text-[#17152B] font-space text-[16px] line-clamp-1">
                            {p.person?.first_name} {p.person?.last_name}
                          </h3>

                          <div className="text-[13px] text-[#7C5CFC] font-semibold mt-0.5 line-clamp-1 min-h-[20px]">
                            {p.speaker_profile?.headline || 'Speaker'}
                          </div>

                          {(p.person?.job_title || p.person?.organization) && (
                            <div className="text-[12px] text-[#77738A] font-jakarta mt-1 line-clamp-1">
                              {p.person?.job_title}
                              {p.person?.job_title && p.person?.organization && ' at '}
                              {p.person?.organization}
                            </div>
                          )}

                          {/* Social Icons */}
                          <div className="flex items-center justify-center gap-3 mt-3 h-5 text-[#77738A]">
                            {p.speaker_profile?.linkedin_url && (
                              <a
                                href={p.speaker_profile.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-[#0A66C2] transition-colors"
                              >
                                <span className="material-symbols-outlined text-[17px]">link</span>
                              </a>
                            )}
                            {p.speaker_profile?.website_url && (
                              <a
                                href={p.speaker_profile.website_url}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-[#7C5CFC] transition-colors"
                              >
                                <span className="material-symbols-outlined text-[17px]">language</span>
                              </a>
                            )}
                            {p.speaker_profile?.twitter_url && (
                              <a
                                href={p.speaker_profile.twitter_url}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-black transition-colors"
                              >
                                <span className="material-symbols-outlined text-[17px]">tag</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="mt-5 pt-4 border-t border-[#E6E2F0] flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(p)}
                            className={`text-[12px] font-semibold transition-colors px-2 py-1 rounded-md cursor-pointer ${
                              p.status === 'active'
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {p.status === 'active' ? 'Remove' : 'Reactivate'}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/app/events/${eventId}/speakers?edit=${p.id}`)
                            }
                            className="px-3 py-1.5 bg-white border border-[#E6E2F0] hover:border-[#7C5CFC] hover:text-[#7C5CFC] text-[#17152B] rounded-lg text-xs font-semibold transition-colors shadow-2xs font-jakarta cursor-pointer"
                          >
                            Edit Profile
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
