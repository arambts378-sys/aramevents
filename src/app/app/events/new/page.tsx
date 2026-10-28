'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Event } from '@/types';
import { buildDefaultWebsite, buildEventSlug } from '@/lib/events/defaultWebsite';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default function CreateEventPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { createEvent, deleteEvent, currentUser, userPreferences, activeWorkspace } = useAppContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    format: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    timezone: 'Asia/Kolkata',
    location: '',
    description: '',
  });

  // Apply saved event defaults when available without overriding manual edits
  const defaultsAppliedRef = useRef(false);

  React.useEffect(() => {
    if (userPreferences && !defaultsAppliedRef.current) {
      defaultsAppliedRef.current = true;
      setFormData((prev) => {
        const nextFormat = prev.format || userPreferences.default_event_format || '';
        const shouldSetLocation =
          nextFormat !== 'Virtual' &&
          !prev.location &&
          userPreferences.default_location;

        return {
          ...prev,
          type: prev.type || userPreferences.default_event_type || prev.type,
          format: nextFormat,
          // The field starts on IST, so only an untouched value takes the saved default.
          timezone:
            prev.timezone === 'Asia/Kolkata' && userPreferences.default_timezone
              ? userPreferences.default_timezone
              : prev.timezone,
          location: shouldSetLocation ? (userPreferences.default_location as string) : prev.location,
        };
      });
    }
  }, [userPreferences]);

  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState('');

  // Walkathon specific state
  const [walkathonDistances, setWalkathonDistances] = useState([
    { distance_km: 3, name: '3 KM', capacity: '', is_active: true },
    { distance_km: 5, name: '5 KM', capacity: '', is_active: true },
  ]);

  const handleWalkathonDistanceChange = (index: number, field: string, value: any) => {
    const newDistances = [...walkathonDistances];
    newDistances[index] = { ...newDistances[index], [field]: value };
    setWalkathonDistances(newDistances);
    if (fieldErrors.walkathon) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.walkathon;
        return next;
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Flyer must be a JPG, PNG or WEBP image.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Flyer file size exceeds 5MB limit. Please choose a smaller file.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setFileName(file.name);
      if (error) setError('');
    }
  };

  const handleRemoveFile = () => {
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Field-level Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Event name is required';
    if (!formData.type) newErrors.type = 'Please select an event type';
    if (!formData.format) newErrors.format = 'Please select an event format';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';

    if (formData.format !== 'Virtual' && !formData.location.trim()) {
      newErrors.location = 'Location is required for In-person and Hybrid events';
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'End date cannot be earlier than start date';
    } else if (
      formData.startDate &&
      formData.startDate === formData.endDate &&
      formData.startTime &&
      formData.endTime &&
      formData.endTime <= formData.startTime
    ) {
      newErrors.endTime = 'End time must be after the start time';
    }

    if (formData.type === 'Walkathon') {
      const active = walkathonDistances.filter((d) => d.is_active);
      if (active.length === 0) {
        newErrors.walkathon = 'Keep at least one distance active';
      } else if (
        active.some(
          (d) =>
            !(d.distance_km > 0) ||
            !d.name.trim() ||
            (d.capacity !== '' && !(Number.isInteger(Number(d.capacity)) && Number(d.capacity) > 0))
        )
      ) {
        newErrors.walkathon =
          'Each active distance needs a distance above 0 km, a name, and a whole-number capacity (or leave capacity empty)';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      const missingFields = Object.keys(newErrors)
        .map((k) => {
          switch (k) {
            case 'name': return 'Event Name';
            case 'type': return 'Event Type';
            case 'format': return 'Event Format';
            case 'startDate': return 'Start Date';
            case 'startTime': return 'Start Time';
            case 'endDate': return 'End Date';
            case 'endTime': return 'End Time';
            case 'location': return 'Location';
            case 'walkathon': return 'Walkathon distances';
            default: return k;
          }
        })
        .join(', ');

      const summaryMessage = `Check these fields: ${missingFields}.`;
      setError(summaryMessage);

      // Scroll to the first invalid field or error banner with smooth behavior
      setTimeout(() => {
        const firstKey = Object.keys(newErrors)[0];
        const el =
          document.getElementById(firstKey) ||
          document.querySelector(`[name="${firstKey}"]`) ||
          document.getElementById('bottom-error-banner') ||
          document.getElementById('top-error-banner');

        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLElement).focus?.();
        }
      }, 50);
      return;
    }

    setFieldErrors({});
    setError('');

    if (activeWorkspace?.is_suspended) {
      setError('This workspace is suspended, so new events cannot be created. Contact support to reactivate it.');
      return;
    }

    const eventId = Math.random().toString(36).substring(2, 10);
    const slug = buildEventSlug(formData.name);

    try {
      setIsSubmitting(true);
      setSubmittingStep('Preparing event...');

      let uploadedFlyerUrl = '';
      if (fileInputRef.current?.files?.length) {
        setSubmittingStep('Uploading flyer...');
        const file = fileInputRef.current.files[0];

        try {
          // Upload only through the server route, which verifies the file really is an image.
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);

          const res = await fetch('/api/events/flyer-upload', {
            method: 'POST',
            body: uploadFormData,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.url) {
            throw new Error(data.error || 'Failed to upload flyer');
          }
          uploadedFlyerUrl = data.url;
        } catch (uploadErr: any) {
          console.error('Flyer upload error:', uploadErr);
          setError(`Flyer upload failed: ${uploadErr.message || 'Please check file format and size (<5MB).'}`);
          setIsSubmitting(false);
          setSubmittingStep('');
          setTimeout(() => {
            const errBanner = document.getElementById('bottom-error-banner') || document.getElementById('top-error-banner');
            errBanner?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
          return;
        }
      }

      setSubmittingStep('Creating event in workspace...');

      const defaultWebsite = buildDefaultWebsite({ flyerUrl: uploadedFlyerUrl, format: formData.format });

      const newEvent: Event = {
        id: eventId,
        slug: slug,
        name: formData.name.trim(),
        type: formData.type,
        format: formData.format,
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        timezone: formData.timezone || 'UTC',
        location: formData.location.trim(),
        description: formData.description.trim(),
        status: 'draft',
        workspace_id: activeWorkspace?.id ?? '',
        createdAt: new Date().toISOString(),
        flyer: uploadedFlyerUrl || undefined,
        website: defaultWebsite,
      };

      const createdEvent = await createEvent(newEvent);

      // If Walkathon, create distance categories
      if (formData.type === 'Walkathon') {
        const supabase = createClient();

        const distanceInserts = walkathonDistances.map((d) => ({
          event_id: createdEvent.id,
          distance_km: d.distance_km,
          name: d.name.trim(),
          capacity: d.capacity ? parseInt(d.capacity as string, 10) : null,
          is_active: d.is_active,
        }));

        if (distanceInserts.length > 0) {
          const { error: distanceError } = await supabase
            .from('walkathon_distance_categories')
            .insert(distanceInserts);

          if (distanceError) {
            // Distances can't be added after creation, so undo the event and let the organizer retry.
            console.error('Failed to create walkathon distances:', distanceError);
            await deleteEvent(createdEvent.id).catch(() => undefined);
            throw new Error('Walkathon distances could not be saved, so the event was not created. Please try again.');
          }
        }
      }

      setSubmittingStep('Opening event workspace...');
      router.push(`/app/events/${createdEvent.id}`);
    } catch (err: any) {
      console.error('Event creation submission error:', err);
      const rawMsg = err?.message || '';
      const isInternal = /supabase|postgres|sql|relation|foreign key|syntax error|uuid|column|table|database/i.test(rawMsg);
      setError(
        isInternal || !rawMsg
          ? 'Unable to create event. Please check the provided information and try again.'
          : rawMsg
      );
      setIsSubmitting(false);
      setSubmittingStep('');
      setTimeout(() => {
        const errBanner = document.getElementById('bottom-error-banner') || document.getElementById('top-error-banner');
        errBanner?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  };

  return (
    <div className="h-full bg-ds-canvas text-ds-ink antialiased min-h-screen w-full">
      <div className="min-h-screen flex flex-row w-full bg-ds-canvas">
        {/* Left Persistent Sidebar (230px) */}
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Right Main Workspace */}
        <main className="flex-1 min-w-0 bg-ds-canvas min-h-screen px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-6 overflow-y-auto w-full">
          {/* Top Breadcrumb & Back Navigation */}
          <div className="flex items-center justify-between pb-4 border-b border-ds-line">
            <div className="flex items-center gap-3">
              <Link
                href="/app/events"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ds-muted hover:text-ds-ink transition-colors group"
              >
                <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">
                  arrow_back
                </span>
                <span>Back to Events</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-ds-ink bg-white border border-ds-line rounded-lg shadow-xs"
                aria-label="Open navigation menu"
              >
                <span className="material-symbols-outlined text-[16px]">menu</span>
                <span>Menu</span>
              </button>

              <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-ds-muted font-jakarta">
                <Link href="/app/events" className="hover:text-ds-ink transition-colors">
                  Events
                </Link>
                <span>&gt;</span>
                <span className="text-ds-ink font-semibold">Create Event</span>
              </div>
            </div>
          </div>

          {/* Centered Form Wrapper */}
          <div className="w-full max-w-[800px] mx-auto">
            {/* Step Indicator & Page Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ds-accent-soft border border-ds-line text-[11px] font-mono font-medium text-ds-accent mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-ds-accent"></span>
                <span>STEP 1 OF 1 · BASIC INFORMATION</span>
              </div>
              <h1 className="text-[32px] md:text-[36px] font-bold tracking-tight text-ds-ink leading-tight font-space">
                Create your event
              </h1>
              <p className="text-[14px] text-ds-muted mt-1 font-jakarta">
                Start with the basics. You can add more details later.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div
                id="top-error-banner"
                className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 shadow-xs animate-in fade-in"
                role="alert"
              >
                <span className="material-symbols-outlined text-red-600 text-[20px] mt-0.5 shrink-0">
                  error
                </span>
                <div>
                  <h4 className="text-[14px] font-semibold font-space">
                    Unable to create event
                  </h4>
                  <p className="text-[13px] text-red-700 mt-0.5 font-jakarta">{error}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SECTION 1: EVENT BASICS */}
              <div className="bg-white rounded-xl border border-ds-line p-6 sm:p-7 shadow-xs space-y-5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ds-accent block">
                    EVENT BASICS
                  </span>
                  <p className="text-[13px] text-ds-muted mt-0.5 font-jakarta">
                    Give your event a name and choose how it will be organized.
                  </p>
                </div>

                {/* Event Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="name"
                    className="block text-[13px] font-semibold text-ds-ink font-jakarta"
                  >
                    Event name <span className="text-ds-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Global Tech Summit 2026 or Annual Marathon"
                    disabled={isSubmitting}
                    className={`w-full px-4 py-2.5 bg-white border ${
                      fieldErrors.name
                        ? 'border-red-400 ring-1 ring-red-400 bg-red-50/20'
                        : 'border-ds-line'
                    } rounded-xl text-[14px] text-ds-ink placeholder:text-ds-muted focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent transition-colors font-jakarta shadow-xs disabled:opacity-60`}
                  />
                  {fieldErrors.name && (
                    <p className="text-red-600 text-[12px] font-medium font-jakarta mt-1">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Event Type & Event Format (2-Column Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Event Type */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="type"
                      className="block text-[13px] font-semibold text-ds-ink font-jakarta"
                    >
                      Event type <span className="text-ds-danger">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className={`w-full appearance-none pl-3.5 pr-9 py-2.5 bg-white border ${
                          fieldErrors.type
                            ? 'border-red-400 ring-1 ring-red-400 bg-red-50/20'
                            : 'border-ds-line'
                        } rounded-xl text-[14px] text-ds-ink focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent transition-colors font-jakarta shadow-xs cursor-pointer disabled:opacity-60`}
                      >
                        <option value="" disabled className="text-ds-muted">
                          Select event type
                        </option>
                        <option value="Conference">Conference</option>
                        <option value="Corporate Event">Corporate Event</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Exhibition">Exhibition</option>
                        <option value="Summit">Summit</option>
                        <option value="Networking">Networking</option>
                        <option value="Training">Training</option>
                        <option value="Walkathon">Walkathon</option>
                        <option value="Other">Other</option>
                      </select>
                      <span
                        className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ds-muted text-[18px]"
                        data-icon="expand_more"
                      >
                        expand_more
                      </span>
                    </div>
                    {fieldErrors.type && (
                      <p className="text-red-600 text-[12px] font-medium font-jakarta mt-1">
                        {fieldErrors.type}
                      </p>
                    )}
                  </div>

                  {/* Event Format */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="format"
                      className="block text-[13px] font-semibold text-ds-ink font-jakarta"
                    >
                      Event format <span className="text-ds-danger">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="format"
                        name="format"
                        value={formData.format}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className={`w-full appearance-none pl-3.5 pr-9 py-2.5 bg-white border ${
                          fieldErrors.format
                            ? 'border-red-400 ring-1 ring-red-400 bg-red-50/20'
                            : 'border-ds-line'
                        } rounded-xl text-[14px] text-ds-ink focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent transition-colors font-jakarta shadow-xs cursor-pointer disabled:opacity-60`}
                      >
                        <option value="" disabled className="text-ds-muted">
                          Select event format
                        </option>
                        <option value="In-person">In-person</option>
                        <option value="Virtual">Virtual</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                      <span
                        className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ds-muted text-[18px]"
                        data-icon="expand_more"
                      >
                        expand_more
                      </span>
                    </div>
                    {fieldErrors.format && (
                      <p className="text-red-600 text-[12px] font-medium font-jakarta mt-1">
                        {fieldErrors.format}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: DATE & TIME */}
              <div className="bg-white rounded-xl border border-ds-line p-6 sm:p-7 shadow-xs space-y-5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ds-accent block">
                    DATE & TIME
                  </span>
                  <p className="text-[13px] text-ds-muted mt-0.5 font-jakarta">
                    Set when your event starts and ends.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* SCHEDULE START */}
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-semibold text-ds-ink font-jakarta">
                      Starts <span className="text-ds-danger">*</span>
                    </label>
                    <div className="grid grid-cols-1 min-[380px]:grid-cols-7 gap-2">
                      <div className="min-[380px]:col-span-4">
                        <input
                          type="date"
                          id="startDate"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          aria-label="Start Date"
                          className={`w-full px-3 py-2 bg-white border ${
                            fieldErrors.startDate
                              ? 'border-red-400 ring-1 ring-red-400 bg-red-50/20'
                              : 'border-ds-line'
                          } rounded-xl text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent transition-colors shadow-xs font-jakarta disabled:opacity-60`}
                        />
                        {fieldErrors.startDate && (
                          <p className="text-red-600 text-[11px] font-medium font-jakarta mt-1">
                            {fieldErrors.startDate}
                          </p>
                        )}
                      </div>
                      <div className="min-[380px]:col-span-3">
                        <input
                          type="time"
                          id="startTime"
                          name="startTime"
                          value={formData.startTime}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          aria-label="Start Time"
                          className={`w-full px-3 py-2 bg-white border ${
                            fieldErrors.startTime
                              ? 'border-red-400 ring-1 ring-red-400 bg-red-50/20'
                              : 'border-ds-line'
                          } rounded-xl text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent transition-colors shadow-xs font-jakarta disabled:opacity-60`}
                        />
                        {fieldErrors.startTime && (
                          <p className="text-red-600 text-[11px] font-medium font-jakarta mt-1">
                            {fieldErrors.startTime}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SCHEDULE CONCLUSION */}
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-semibold text-ds-ink font-jakarta">
                      Ends <span className="text-ds-danger">*</span>
                    </label>
                    <div className="grid grid-cols-1 min-[380px]:grid-cols-7 gap-2">
                      <div className="min-[380px]:col-span-4">
                        <input
                          type="date"
                          id="endDate"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          aria-label="End Date"
                          className={`w-full px-3 py-2 bg-white border ${
                            fieldErrors.endDate
                              ? 'border-red-400 ring-1 ring-red-400 bg-red-50/20'
                              : 'border-ds-line'
                          } rounded-xl text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent transition-colors shadow-xs font-jakarta disabled:opacity-60`}
                        />
                        {fieldErrors.endDate && (
                          <p className="text-red-600 text-[11px] font-medium font-jakarta mt-1">
                            {fieldErrors.endDate}
                          </p>
                        )}
                      </div>
                      <div className="min-[380px]:col-span-3">
                        <input
                          type="time"
                          id="endTime"
                          name="endTime"
                          value={formData.endTime}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          aria-label="End Time"
                          className={`w-full px-3 py-2 bg-white border ${
                            fieldErrors.endTime
                              ? 'border-red-400 ring-1 ring-red-400 bg-red-50/20'
                              : 'border-ds-line'
                          } rounded-xl text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent transition-colors shadow-xs font-jakarta disabled:opacity-60`}
                        />
                        {fieldErrors.endTime && (
                          <p className="text-red-600 text-[11px] font-medium font-jakarta mt-1">
                            {fieldErrors.endTime}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timezone */}
                <div className="space-y-1.5 pt-1">
                  <label
                    htmlFor="timezone"
                    className="block text-[13px] font-semibold text-ds-ink font-jakarta"
                  >
                    Timezone <span className="text-ds-danger">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="timezone"
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="w-full appearance-none pl-3.5 pr-9 py-2.5 bg-white border border-ds-line rounded-xl text-[14px] text-ds-ink focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent transition-colors font-jakarta shadow-xs cursor-pointer disabled:opacity-60"
                    >
                      <option value="" disabled className="text-ds-muted">
                        Select time zone
                      </option>
                      <option value="Asia/Kolkata">
                        India Standard Time (IST) — UTC+05:30
                      </option>
                      <option value="America/New_York">
                        Eastern Time (ET) — UTC-05:00 / -04:00
                      </option>
                      <option value="America/Los_Angeles">
                        Pacific Time (PT) — UTC-08:00 / -07:00
                      </option>
                      <option value="Europe/London">
                        Greenwich Mean Time / BST — UTC+00:00 / +01:00
                      </option>
                      <option value="Europe/Berlin">
                        Central European Time (CET) — UTC+01:00 / +02:00
                      </option>
                      <option value="Asia/Singapore">
                        Singapore Standard Time (SGT) — UTC+08:00
                      </option>
                      <option value="Asia/Dubai">
                        Gulf Standard Time (GST) — UTC+04:00
                      </option>
                    </select>
                    <span
                      className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ds-muted text-[18px]"
                      data-icon="expand_more"
                    >
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: LOCATION */}
              <div className="bg-white rounded-xl border border-ds-line p-6 sm:p-7 shadow-xs space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ds-accent block">
                    LOCATION
                  </span>
                  <p className="text-[13px] text-ds-muted mt-0.5 font-jakarta">
                    Where will your event take place?
                  </p>
                </div>

                {formData.format !== 'Virtual' ? (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="location"
                      className="block text-[13px] font-semibold text-ds-ink font-jakarta"
                    >
                      Venue or Physical Address <span className="text-ds-danger">*</span>
                    </label>
                    <div className="relative">
                      <span
                        className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-ds-muted pointer-events-none"
                        data-icon="location_on"
                      >
                        location_on
                      </span>
                      <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="Enter venue name, address, or hall"
                        disabled={isSubmitting}
                        className={`w-full pl-10 pr-4 py-2.5 bg-white border ${
                          fieldErrors.location
                            ? 'border-red-400 ring-1 ring-red-400 bg-red-50/20'
                            : 'border-ds-line'
                        } rounded-xl text-[14px] text-ds-ink placeholder:text-ds-muted focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent transition-colors font-jakarta shadow-xs disabled:opacity-60`}
                      />
                    </div>
                    {fieldErrors.location && (
                      <p className="text-red-600 text-[12px] font-medium font-jakarta mt-1">
                        {fieldErrors.location}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-ds-accent-soft border border-ds-line flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-ds-line flex items-center justify-center text-ds-accent">
                        <span className="material-symbols-outlined text-[18px]">videocam</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-ds-ink">
                          Online Event
                        </p>
                        <p className="text-[12px] text-ds-muted">
                          No physical venue needed. You can add meeting links or stream URLs later in the workspace.
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-medium text-ds-accent bg-white border border-ds-line px-2 py-0.5 rounded-full shrink-0">
                      Virtual
                    </span>
                  </div>
                )}
              </div>

              {/* WALKATHON SPECIFIC CONFIGURATION */}
              {formData.type === 'Walkathon' && (
                <div className="bg-white rounded-xl border border-ds-line p-6 sm:p-7 shadow-xs space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ds-accent block">
                      WALKATHON CONFIGURATION
                    </span>
                    <p className="text-[13px] text-ds-muted mt-0.5 font-jakarta">
                      Configure the distances available for this walkathon.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {walkathonDistances.map((distance, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border border-ds-line bg-ds-accent-soft/40"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={distance.is_active}
                            onChange={(e) =>
                              handleWalkathonDistanceChange(
                                index,
                                'is_active',
                                e.target.checked
                              )
                            }
                            id={`dist-active-${index}`}
                            className="w-4 h-4 text-ds-accent border-ds-line rounded focus:ring-ds-accent"
                          />
                          <label
                            htmlFor={`dist-active-${index}`}
                            className="text-xs font-semibold text-ds-ink"
                          >
                            Active
                          </label>
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-ds-muted mb-1">
                              Distance (KM)
                            </label>
                            <input
                              type="number"
                              value={distance.distance_km}
                              onChange={(e) =>
                                handleWalkathonDistanceChange(
                                  index,
                                  'distance_km',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              disabled={!distance.is_active || isSubmitting}
                              className="w-full px-3 py-1.5 bg-white border border-ds-line rounded-lg text-sm text-ds-ink disabled:opacity-50"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-ds-muted mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={distance.name}
                              onChange={(e) =>
                                handleWalkathonDistanceChange(
                                  index,
                                  'name',
                                  e.target.value
                                )
                              }
                              disabled={!distance.is_active || isSubmitting}
                              className="w-full px-3 py-1.5 bg-white border border-ds-line rounded-lg text-sm text-ds-ink disabled:opacity-50"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-ds-muted mb-1">
                              Capacity (Optional)
                            </label>
                            <input
                              type="number"
                              placeholder="Unlimited"
                              value={distance.capacity}
                              onChange={(e) =>
                                handleWalkathonDistanceChange(
                                  index,
                                  'capacity',
                                  e.target.value
                                )
                              }
                              disabled={!distance.is_active || isSubmitting}
                              className="w-full px-3 py-1.5 bg-white border border-ds-line rounded-lg text-sm text-ds-ink disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {fieldErrors.walkathon && (
                    <p id="walkathon" tabIndex={-1} className="text-red-600 text-[12px] font-medium font-jakarta">
                      {fieldErrors.walkathon}
                    </p>
                  )}
                </div>
              )}

              {/* SECTION 4: DESCRIPTION */}
              <div className="bg-white rounded-xl border border-ds-line p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ds-accent block">
                      DESCRIPTION
                    </span>
                    <p className="text-[13px] text-ds-muted mt-0.5 font-jakarta">
                      Brief overview of what attendees can expect.
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-ds-muted bg-ds-accent-soft border border-ds-line px-2 py-0.5 rounded-full font-jakarta">
                    Optional
                  </span>
                </div>

                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  disabled={isSubmitting}
                  placeholder="Tell attendees what this event is about"
                  className="w-full px-4 py-2.5 bg-white border border-ds-line rounded-xl text-[14px] text-ds-ink placeholder:text-ds-muted focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent transition-colors font-jakarta shadow-xs resize-y disabled:opacity-60"
                />
              </div>

              {/* SECTION 5: EVENT FLYER */}
              <div className="bg-white rounded-xl border border-ds-line p-6 sm:p-7 shadow-xs space-y-4">
                <div>
                  <h3 className="text-[16px] font-bold text-ds-ink font-space">
                    Have an event flyer?
                  </h3>
                  <p className="text-[13px] text-ds-muted mt-0.5 font-jakarta">
                    Turn your flyer into the starting point for your event website.
                  </p>
                </div>

                {!fileName ? (
                  <div
                    onClick={() => !isSubmitting && fileInputRef.current?.click()}
                    className="border border-dashed border-ds-line hover:border-ds-accent bg-ds-accent-soft/30 hover:bg-ds-subtle/70 rounded-xl p-6 text-center transition-all cursor-pointer group"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        fileInputRef.current?.click();
                      }
                    }}
                    aria-label="Upload event flyer"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white group-hover:bg-ds-subtle text-ds-accent flex items-center justify-center mx-auto mb-2.5 transition-colors border border-ds-line shadow-xs">
                      <span className="material-symbols-outlined text-[22px]">upload_file</span>
                    </div>
                    <div className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-white border border-ds-line text-[13px] font-semibold text-ds-ink group-hover:text-ds-accent group-hover:border-ds-accent transition-all shadow-xs mb-1 font-jakarta">
                      Upload Event Flyer
                    </div>
                    <p className="text-[12px] text-ds-muted font-jakarta">
                      JPG, PNG or WEBP, up to 5MB · <span className="font-mono text-ds-muted">Optional</span>
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      disabled={isSubmitting}
                    />
                  </div>
                ) : (
                  <div className="bg-white border border-ds-line rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-ds-accent-soft border border-ds-line flex items-center justify-center text-ds-accent shrink-0">
                        <span className="material-symbols-outlined text-[20px]">description</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[13px] text-ds-ink truncate max-w-[200px] sm:max-w-[280px]">
                            {fileName}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Flyer uploaded
                          </span>
                        </div>
                        <p className="text-[12px] text-ds-muted mt-0.5 font-jakarta">
                          Aram Events will use this flyer when preparing your event website.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-ds-line">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                        className="text-[12px] font-semibold text-ds-accent hover:underline px-2 py-1 cursor-pointer disabled:opacity-50"
                      >
                        Replace
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.webp"
                        className="hidden"
                        disabled={isSubmitting}
                      />
                      <span className="text-ds-line">•</span>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        disabled={isSubmitting}
                        className="text-[12px] font-semibold text-ds-danger hover:underline px-2 py-1 cursor-pointer disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Error Banner */}
              {error && (
                <div
                  id="bottom-error-banner"
                  className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 shadow-xs animate-in fade-in"
                  role="alert"
                >
                  <span className="material-symbols-outlined text-red-600 text-[20px] mt-0.5 shrink-0">
                    error
                  </span>
                  <div className="flex-1">
                    <h4 className="text-[14px] font-semibold font-space">
                      Unable to create event
                    </h4>
                    <p className="text-[13px] text-red-700 mt-0.5 font-jakarta">{error}</p>
                  </div>
                </div>
              )}

              {/* BOTTOM ACTION BUTTONS */}
              <div className="pt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                <Link
                  href="/app/events"
                  className="w-full sm:w-auto h-[44px] px-5 border border-ds-line bg-white hover:bg-ds-subtle text-ds-ink text-[14px] font-semibold rounded-lg transition-colors shadow-xs flex items-center justify-center font-jakarta"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-[44px] px-6 bg-ds-accent hover:bg-ds-accent-strong text-white text-[14px] font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 cursor-pointer font-jakarta"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>{submittingStep || 'Creating Event...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Create Event</span>
                      <span
                        className="material-symbols-outlined text-[18px]"
                        data-icon="arrow_forward"
                      >
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}