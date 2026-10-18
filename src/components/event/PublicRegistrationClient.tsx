"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registrationsService } from '@/services/registrations';
import { EventRegistrationSettings } from '@/types';
import Link from 'next/link';
import { TicketTemplate } from '../ticket/TicketTemplate';

import { submitRegistrationServerAction } from '@/app/actions/registrationActions';
import { PublicTicketAvailability } from '@/types';
import { formatPaiseToINR } from '@/services/ticketService';
import { isPublicRegistrationEnabled } from '@/lib/security/publicRegistration';

interface Props {
  event: any;
  settings: EventRegistrationSettings | null;
  slug: string;
  walkathonDistances?: any[];
  isWalkathon?: boolean;
  tickets?: PublicTicketAvailability[];
}

export default function PublicRegistrationClient({ event, settings, slug, walkathonDistances = [], isWalkathon = false, tickets = [] }: Props) {
  const router = useRouter();
  
  const isRegistrationOpen = isPublicRegistrationEnabled(settings);
  const [error, setError] = useState<string | null>(isRegistrationOpen ? null : "Registration is currently closed for this event.");
  const [formError, setFormError] = useState<string | null>(null);

  // Selected Ticket State
  const [selectedTicketId, setSelectedTicketId] = useState<string>(() => {
    if (tickets && tickets.length > 0) {
      const firstAvailable = tickets.find(t => t.status === 'on_sale' && t.ticket_type === 'free')
        || tickets.find(t => t.status === 'on_sale')
        || tickets[0];
      return firstAvailable?.id || '';
    }
    return '';
  });
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    organization: '',
    job_title: '',
    distance_category_id: '',
    gender: '',
    age: '',
    t_shirt_size: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ registration_number: string, emailDeliveryFailed?: boolean, qrToken?: string } | null>(null);

  const selectedTicket = tickets?.find(t => t.id === selectedTicketId) || null;
  const isPaidSelected = selectedTicket?.ticket_type === 'paid';
  const isTicketUnavailable = selectedTicket ? (selectedTicket.status === 'sold_out' || selectedTicket.status === 'sales_ended') : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    // Ticket validation
    if (tickets && tickets.length > 0) {
      if (!selectedTicketId) {
        setFormError("Please select a ticket tier.");
        return;
      }
      if (isPaidSelected) {
        setFormError("Payment gateway is not configured for this event. Paid ticket registrations cannot be accepted online at this time.");
        return;
      }
      if (isTicketUnavailable) {
        setFormError("The selected ticket is no longer available.");
        return;
      }
    }
    
    // Walkathon specific validation
    if (isWalkathon) {
      if (!formData.distance_category_id) {
        setFormError("Please select a distance category.");
        return;
      }
      if (!formData.gender || !formData.age || !formData.t_shirt_size) {
        setFormError("Please fill out all required Walkathon fields (Gender, Age, T-Shirt Size).");
        return;
      }
    }
    
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      // Sanitize formData
      const cleanData: any = { ...formData };
      if (!cleanData.distance_category_id) delete cleanData.distance_category_id;
      if (selectedTicketId) {
        cleanData.ticket_type_id = selectedTicketId;
        cleanData.quantity = 1;
      }
      
      const result = await submitRegistrationServerAction(event.id, cleanData);
      setSuccessData({ 
        registration_number: result.registration_number,
        emailDeliveryFailed: result.emailDeliveryFailed,
        qrToken: result.qrToken
      });
    } catch (err: any) {
      setFormError(err.message || "An error occurred during registration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };



  if (error && !successData) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-outline-variant/40 text-center shadow-sm">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">event_busy</span>
          <h1 className="text-title-lg font-bold text-on-surface mb-2">Registration Unavailable</h1>
          <p className="text-body-md text-on-surface-variant mb-8">{error}</p>
          <Link href={`/events/${slug}`} className="px-6 py-2.5 bg-surface-container-highest text-on-surface font-bold rounded-lg hover:bg-surface-variant transition-colors">
            Return to Event Page
          </Link>
        </div>
      </div>
    );
  }

  if (successData) {
    const selectedDistance = walkathonDistances.find(d => d.id === formData.distance_category_id);
    
    const ticketData = {
      event,
      attendee: {
        firstName: formData.first_name,
        lastName: formData.last_name,
        email: formData.email,
        phone: formData.phone,
      },
      registration: {
        registrationNumber: successData.registration_number,
      },
      rawToken: successData.qrToken, // Render the real QR credential token
      distanceCategory: selectedDistance
    };

    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-surface-container-lowest to-surface-container-lowest">
        <div className="max-w-xl w-full bg-white p-10 rounded-3xl border border-outline-variant/40 shadow-xl relative overflow-hidden">
          {/* Confetti decoration abstract */}
          <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
          
          <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-3xl font-bold">check</span>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-headline-sm font-black text-on-surface mb-2">REGISTRATION CONFIRMED</h1>
            <p className="text-body-lg text-on-surface-variant">
              Your registration has been successfully completed.
            </p>
          </div>

          {settings?.confirmation_message && (
            <div className="mb-8 p-4 bg-primary-container/30 text-on-primary-container rounded-xl text-body-md border border-primary/20 text-center print:hidden">
              {settings.confirmation_message}
            </div>
          )}

          {successData.emailDeliveryFailed && (
            <div className="mb-8 p-4 bg-error-container/20 text-on-error-container rounded-xl text-body-md border border-error/20 text-center print:hidden">
              Registration successful. Your ticket is available below, but we encountered an issue sending the confirmation email. Please download or print your ticket here.
            </div>
          )}

          <div className="mb-8 w-full flex justify-center">
            <TicketTemplate data={ticketData} />
          </div>

          <div className="text-center print:hidden">
            <Link href={`/events/${slug}`} className="text-primary font-bold hover:underline inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              Return to Event Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col">
      {/* Mini header */}
      <header className="h-16 border-b border-outline-variant/60 bg-white flex items-center justify-center px-6">
        <Link href={`/events/${slug}`} className="font-bold text-title-lg text-primary">
          {event?.name}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="max-w-2xl w-full bg-white rounded-3xl border border-outline-variant/50 shadow-xl overflow-hidden flex flex-col md:flex-row">
          
          {/* Form Side */}
          <div className="w-full p-8 md:p-10">
            <div className="mb-8">
              <h1 className="text-headline-sm font-bold text-on-surface mb-2">
                {settings?.title || 'Register for Event'}
              </h1>
              <p className="text-body-md text-on-surface-variant">
                {settings?.description || 'Please fill out the form below to secure your spot.'}
              </p>
            </div>

            {formError && (
              <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl text-body-sm flex items-start gap-3">
                <span className="material-symbols-outlined text-error mt-0.5">error</span>
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Ticket Selection Tier (When tickets are configured) */}
              {tickets && tickets.length > 0 && (
                <div className="space-y-3 pb-4 border-b border-outline-variant/60">
                  <div className="flex items-center justify-between">
                    <label className="text-label-sm font-bold text-on-surface-variant">
                      Select Ticket Tier *
                    </label>
                    <span className="text-xs text-on-surface-variant font-medium">
                      {tickets.length} {tickets.length === 1 ? 'tier available' : 'tiers available'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {tickets.map((ticket) => {
                      const isSelected = selectedTicketId === ticket.id;
                      const isSoldOut = ticket.status === 'sold_out';
                      const isEnded = ticket.status === 'sales_ended';
                      const isScheduled = ticket.status === 'scheduled';
                      const isUnavailable = isSoldOut || isEnded || isScheduled;

                      return (
                        <label
                          key={ticket.id}
                          className={`relative flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#7C5CFC] bg-[#F6F1FF]/60 ring-1 ring-[#7C5CFC]'
                              : isUnavailable
                              ? 'border-outline-variant/40 bg-zinc-50 opacity-60 cursor-not-allowed'
                              : 'border-outline-variant/60 hover:border-[#7C5CFC]/60 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="selected_ticket"
                            disabled={isUnavailable}
                            value={ticket.id}
                            checked={isSelected}
                            onChange={() => setSelectedTicketId(ticket.id)}
                            className="w-4 h-4 mt-1 text-[#7C5CFC] focus:ring-[#7C5CFC]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[15px] text-[#17152B]">
                                {ticket.name}
                              </span>
                              <span className="font-mono font-bold text-[15px] text-[#17152B]">
                                {formatPaiseToINR(ticket.price_amount)}
                              </span>
                            </div>

                            {ticket.description && (
                              <p className="text-[12px] text-[#77738A] mt-0.5 line-clamp-2">
                                {ticket.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                              {isSoldOut ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
                                  Sold Out
                                </span>
                              ) : isEnded ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700">
                                  Sales Ended
                                </span>
                              ) : isScheduled ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                                  Sales Start Soon
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                  Available
                                </span>
                              )}

                              {ticket.quantity_remaining !== undefined && ticket.quantity_remaining <= 10 && !isSoldOut && (
                                <span className="text-[11px] text-amber-700 font-semibold">
                                  Only {ticket.quantity_remaining} left
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Payment Gateway Warning if Paid Ticket Selected */}
                  {isPaidSelected && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">account_balance_wallet</span>
                      <div>
                        <strong className="block text-amber-950">Payment Gateway Not Configured</strong>
                        Online payment processing is not configured for this event. Paid ticket registrations cannot be accepted online at this time. Please select a complimentary pass or contact the organizer.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-on-surface-variant">First Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.first_name}
                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                    className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-on-surface-variant">Last Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.last_name}
                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                    className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-bold text-on-surface-variant">Email Address *</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-bold text-on-surface-variant">Phone Number *</label>
                <input 
                  type="tel" 
                  required
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label-sm font-bold text-on-surface-variant">Organization (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.organization}
                      onChange={e => setFormData({...formData, organization: e.target.value})}
                      className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label-sm font-bold text-on-surface-variant">Job Title (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.job_title}
                      onChange={e => setFormData({...formData, job_title: e.target.value})}
                      className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                    </div>
                  </div>
              {isWalkathon && (
                <>
                  <div className="pt-4 pb-2 border-b border-outline-variant/60">
                    <h3 className="text-title-md font-bold text-on-surface">Walkathon Details</h3>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-label-sm font-bold text-on-surface-variant">Distance Category *</label>
                    <div className="flex flex-col gap-3 mt-1">
                      {walkathonDistances.length > 0 ? (
                        walkathonDistances.map(distance => (
                          <label key={distance.id} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formData.distance_category_id === distance.id ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary/50'}`}>
                            <input 
                              type="radio"
                              name="distance_category"
                              value={distance.id}
                              checked={formData.distance_category_id === distance.id}
                              onChange={e => setFormData({...formData, distance_category_id: e.target.value})}
                              className="w-5 h-5 text-primary focus:ring-primary border-outline"
                              required
                            />
                            <span className="font-bold text-on-surface">{distance.name}</span>
                          </label>
                        ))
                      ) : (
                        <div className="p-4 bg-error-container/20 border border-error-container text-on-surface rounded-xl">
                          <p className="font-bold text-error mb-1">Configuration Error</p>
                          <p className="text-body-sm">No distance categories have been configured for this Walkathon event. Please contact the event organizer.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-sm font-bold text-on-surface-variant">Gender *</label>
                      <select
                        required
                        value={formData.gender}
                        onChange={e => setFormData({...formData, gender: e.target.value})}
                        className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      >
                        <option value="" disabled>Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-sm font-bold text-on-surface-variant">Age *</label>
                      <input 
                        type="number"
                        min="1"
                        max="120"
                        required
                        value={formData.age}
                        onChange={e => setFormData({...formData, age: e.target.value})}
                        className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-label-sm font-bold text-on-surface-variant">T-Shirt Size *</label>
                    <select
                      required
                      value={formData.t_shirt_size}
                      onChange={e => setFormData({...formData, t_shirt_size: e.target.value})}
                      className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    >
                      <option value="" disabled>Select Size</option>
                      <option value="XS">XS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="XXL">XXL</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-sm font-bold text-on-surface-variant">Emergency Contact Name *</label>
                      <input 
                        type="text" 
                        required
                        value={formData.emergency_contact_name}
                        onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})}
                        className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-sm font-bold text-on-surface-variant">Emergency Contact Phone *</label>
                      <input 
                        type="tel" 
                        required
                        value={formData.emergency_contact_phone}
                        onChange={e => setFormData({...formData, emergency_contact_phone: e.target.value})}
                        className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              <button 
                type="submit"
                disabled={isSubmitting || (isWalkathon && walkathonDistances.length === 0) || (tickets && tickets.length > 0 && isPaidSelected) || isTicketUnavailable}
                className="mt-4 w-full py-4 bg-primary text-white font-bold text-label-lg rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    Processing...
                  </>
                ) : isPaidSelected ? (
                  'Payment Gateway Not Configured'
                ) : isTicketUnavailable ? (
                  'Selected Ticket Unavailable'
                ) : (
                  'Complete Registration'
                )}
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
