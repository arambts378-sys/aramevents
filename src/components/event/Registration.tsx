'use client';

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { useParams } from 'next/navigation';
import { registrationsService } from '@/services/registrations';
import { ticketService, formatPaiseToINR } from '@/services/ticketService';
import { EventRegistrationSettings, PublicTicketAvailability } from '@/types';
import { RegistrationVariant } from '@/data/templates';

interface RegistrationProps {
  event?: any;
  section?: any;
  variant?: RegistrationVariant;
}

export default function Registration({ event, section, variant = "split" }: RegistrationProps) {
  const routeParams = useParams();
  const slug = routeParams?.slug as string;
  const content = section?.content || {};
  const [settings, setSettings] = useState<EventRegistrationSettings | null>(null);
  const [tickets, setTickets] = useState<PublicTicketAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (event?.id) {
      Promise.all([
        registrationsService.getEventRegistrationSettings(event.id),
        ticketService.getPublicTicketAvailability(event.id)
      ])
        .then(([settingsData, ticketsData]) => {
          setSettings(settingsData);
          setTickets(ticketsData || []);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load registration data:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [event?.id]);

  if (loading) {
    return <div className="py-24 text-center text-brand-muted">Loading registration...</div>;
  }

  // Do not render section if registration is not enabled
  if (!settings || !settings.is_enabled) {
    return null;
  }

  const registerUrl = content.buttonUrl || `/events/${event?.slug || event?.id || slug}/register`;
  const headingText = content.heading || (
    variant === "invitation" ? "Formal Invitation" :
    variant === "pass-cards" ? "Festival Passes" :
    variant === "banner" ? "Registration Open" :
    "Registration"
  );

  const titleText = content.title || settings.title || (
    variant === "invitation" ? "Request Your Delegate Pass" :
    variant === "pass-cards" ? "Secure Your Festival Experience" :
    variant === "banner" ? "Register For Race Day" :
    "Reserve your place."
  );

  const descriptionText = content.description || settings.description || (
    variant === "invitation" ? "Attendance is curated to preserve high-level dialogue and strategic exchanges among senior leaders." :
    "Join leaders and decision-makers for two days of meaningful conversations and high-impact networking."
  );

  const buttonText = content.buttonText || "Register Now";

  return (
    <section id="registration" className="bg-brand-soft py-20 md:py-28 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* VARIANT: INVITATION (Summit / Executive) */}
        {variant === "invitation" && (
          <div className="max-w-3xl mx-auto bg-brand-white border-2 border-brand-dark p-8 md:p-14 rounded-2xl shadow-md text-center space-y-6">
            <span className="text-xs font-mono uppercase tracking-widest text-brand-maroon font-bold bg-brand-soft px-3 py-1 rounded">
              {headingText}
            </span>
            <h2 className="text-3xl md:text-5xl font-serif text-brand-dark leading-tight">
              {titleText}
            </h2>
            <p className="text-lg text-brand-muted max-w-xl mx-auto leading-relaxed">
              {descriptionText}
            </p>
            {tickets.length > 0 && (
              <div className="py-4 border-y border-brand-border/60 max-w-md mx-auto space-y-2">
                <span className="text-[11px] font-mono uppercase text-brand-muted block">Delegate Tiers</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {tickets.map(t => (
                    <span key={t.id} className="text-xs font-medium px-2.5 py-1 rounded bg-brand-soft border border-brand-border">
                      {t.name} · {formatPaiseToINR(t.price_amount)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-2">
              <Link
                href={registerUrl}
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-brand-white bg-brand-dark hover:bg-brand-maroon transition-colors rounded shadow-sm"
              >
                {buttonText}
              </Link>
            </div>
          </div>
        )}

        {/* VARIANT: PRICING-TABLE (Conference multi-column tiers) */}
        {variant === "pricing-table" && (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-mono text-brand-maroon uppercase tracking-widest font-bold block mb-3">
                {headingText}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-brand-dark leading-tight mb-4">
                {titleText}
              </h2>
              <p className="text-base text-brand-muted">
                {descriptionText}
              </p>
            </div>

            {tickets.length > 0 ? (
              <div className={`grid grid-cols-1 md:grid-cols-${Math.min(tickets.length, 3)} gap-6 items-stretch max-w-5xl mx-auto`}>
                {tickets.map((t, idx) => (
                  <div
                    key={t.id}
                    className={`bg-brand-white border rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-xs transition-all ${
                      idx === 0 ? "border-brand-maroon ring-1 ring-brand-maroon" : "border-brand-border"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono font-bold uppercase text-brand-maroon">
                          Pass Tier {idx + 1}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-brand-soft text-brand-dark">
                          {t.status === 'sold_out' ? 'Sold Out' : 'Available'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-brand-dark mb-2">{t.name}</h3>
                      {t.description && (
                        <p className="text-xs text-brand-muted mb-6 leading-relaxed">{t.description}</p>
                      )}
                      <div className="text-3xl md:text-4xl font-black font-mono text-brand-dark mb-6">
                        {formatPaiseToINR(t.price_amount)}
                      </div>
                    </div>
                    <Link
                      href={registerUrl}
                      className="block w-full text-center py-3 px-4 text-sm font-semibold rounded bg-brand-maroon text-white hover:bg-brand-deep-maroon transition-colors"
                    >
                      {buttonText}
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <Link
                  href={registerUrl}
                  className="inline-flex px-8 py-4 bg-brand-maroon text-white font-semibold rounded text-base"
                >
                  {buttonText}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* VARIANT: PASS-CARDS (Festival energy cards) */}
        {variant === "pass-cards" && (
          <div className="space-y-12">
            <div className="max-w-2xl">
              <span className="text-xs font-mono uppercase tracking-widest text-brand-maroon font-bold block mb-2">
                // {headingText}
              </span>
              <h2 className="text-3xl md:text-5xl font-black uppercase text-brand-dark leading-none tracking-tight">
                {titleText}
              </h2>
            </div>

            {tickets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tickets.map((t) => (
                  <div key={t.id} className="border-2 border-brand-dark bg-brand-white p-6 rounded-xl shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-mono uppercase font-bold text-brand-maroon mb-2">Festival Pass</div>
                      <h3 className="text-xl font-black uppercase text-brand-dark mb-2">{t.name}</h3>
                      {t.description && <p className="text-xs text-brand-muted mb-4">{t.description}</p>}
                      <div className="text-2xl font-black font-mono text-brand-dark mb-6">
                        {formatPaiseToINR(t.price_amount)}
                      </div>
                    </div>
                    <Link
                      href={registerUrl}
                      className="block text-center py-3 bg-brand-dark text-white font-bold uppercase text-xs tracking-wider rounded hover:bg-brand-maroon transition-colors"
                    >
                      Get Pass
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <Link href={registerUrl} className="inline-block px-8 py-4 bg-brand-dark text-white font-black uppercase text-sm rounded">
                {buttonText}
              </Link>
            )}
          </div>
        )}

        {/* VARIANT: BANNER (Sports / High-tempo full-width callout) */}
        {variant === "banner" && (
          <div className="bg-brand-dark text-white p-8 md:p-14 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-8 shadow-md">
            <div className="max-w-xl text-center lg:text-left">
              <span className="text-xs font-mono uppercase tracking-widest text-brand-maroon bg-white/10 px-2.5 py-1 rounded inline-block mb-3 font-bold">
                {headingText}
              </span>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
                {titleText}
              </h2>
              <p className="text-sm text-white/80 leading-relaxed">
                {descriptionText}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-3">
              <Link
                href={registerUrl}
                className="px-8 py-4 bg-brand-maroon hover:bg-brand-deep-maroon text-white font-bold uppercase text-sm tracking-wider rounded transition-all shadow-sm"
              >
                {buttonText}
              </Link>
              <span className="text-[11px] font-mono text-white/60">Instant Confirmation</span>
            </div>
          </div>
        )}

        {/* VARIANT: CENTERED & SPLIT (Default 2-column & Centered) */}
        {(variant === "split" || variant === "centered") && (
          <div className={`flex flex-col ${variant === "centered" ? "items-center text-center max-w-3xl mx-auto" : "lg:flex-row lg:items-center lg:justify-between lg:space-x-12"}`}>
            <div className={`max-w-2xl mb-12 ${variant === "centered" ? "mb-8" : "lg:mb-0"}`}>
              <div className="inline-flex items-center space-x-2 mb-6">
                <span className="w-8 h-[1px] bg-brand-maroon"></span>
                <span className="text-xs font-mono text-brand-maroon uppercase tracking-widest font-semibold">
                  {headingText}
                </span>
                {variant === "centered" && <span className="w-8 h-[1px] bg-brand-maroon"></span>}
              </div>
              <h2 className="text-3xl md:text-5xl font-medium text-brand-dark leading-tight tracking-tight mb-6">
                {titleText}
              </h2>
              <p className="text-lg text-brand-muted leading-relaxed whitespace-pre-line">
                {descriptionText}
              </p>
            </div>

            <div className={`w-full ${variant === "centered" ? "max-w-md" : "lg:w-[460px]"}`}>
              {tickets && tickets.length > 0 ? (
                <div className="bg-brand-white p-6 md:p-8 border border-brand-border shadow-sm space-y-4 rounded-xl text-left">
                  <div className="border-b border-brand-border pb-3">
                    <h3 className="text-xl font-medium text-brand-dark">Available Passes</h3>
                    <p className="text-xs text-brand-muted mt-0.5">Select a pass during registration</p>
                  </div>

                  <div className="space-y-3">
                    {tickets.map((t) => (
                      <div key={t.id} className="p-3.5 border border-brand-border rounded bg-brand-soft/40 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm text-brand-dark">{t.name}</div>
                          {t.description && (
                            <div className="text-xs text-brand-muted truncate max-w-[200px]">{t.description}</div>
                          )}
                          <span className="inline-block text-[10px] font-mono uppercase tracking-wider text-brand-maroon mt-1">
                            {t.status === 'sold_out' ? 'Sold Out' : t.status === 'sales_ended' ? 'Sales Ended' : 'Available'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-base text-brand-dark">
                            {formatPaiseToINR(t.price_amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={registerUrl}
                    className="block w-full text-center px-8 py-3.5 text-base font-medium text-brand-white bg-brand-maroon hover:bg-brand-deep-maroon transition-all duration-300 rounded mt-4"
                  >
                    {buttonText}
                  </Link>
                </div>
              ) : (
                <div className="bg-brand-white p-8 border border-brand-border shadow-sm rounded-xl text-left">
                  <h3 className="text-xl font-medium text-brand-dark mb-2">Event Registration</h3>
                  <p className="text-sm text-brand-muted mb-6">
                    Full access to keynotes, sessions, and networking.
                  </p>
                  <Link
                    href={registerUrl}
                    className="block w-full text-center px-8 py-3.5 text-base font-medium text-brand-white bg-brand-maroon hover:bg-brand-deep-maroon transition-all duration-300 rounded"
                  >
                    {buttonText}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
