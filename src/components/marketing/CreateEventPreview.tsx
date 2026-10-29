'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const eventTemplates = [
  {
    id: 'conference',
    label: 'Conference',
    title: 'International Tech Convention',
    capacity: '2,500 Attendees',
    name: 'Future of Innovation 2026',
    date: '15 Nov 2026, 08:00 AM',
    location: 'Convention Centre, Tech District',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'sports',
    label: 'Sports Event',
    title: 'City Marathon & Run',
    capacity: '5,000 Athletes',
    name: 'Metro City Run 2026',
    date: '22 Nov 2026, 06:00 AM',
    location: 'City Sports Complex & Park',
    image: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'workshop',
    label: 'Workshop',
    title: 'Full-Stack AI Masterclass',
    capacity: '150 Participants',
    name: 'Hands-on AI Engineering Lab',
    date: '02 Dec 2026, 09:30 AM',
    location: 'Innovation Hub Pod 4',
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'exhibition',
    label: 'Exhibition',
    title: 'Global Tech & Hardware Expo',
    capacity: '10,000 Visitors',
    name: 'Future Tech Expo 2026',
    date: '10 Dec 2026, 10:00 AM',
    location: 'Trade & Expo Center Hall 1-3',
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'corporate',
    label: 'Corporate Summit',
    title: 'Executive Leadership Forum',
    capacity: '300 Executives',
    name: 'Global Leadership Summit',
    date: '18 Dec 2026, 08:30 AM',
    location: 'Grand Plaza Hotel Ballroom',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'community',
    label: 'Community',
    title: 'Developer Meetup & Hackathon',
    capacity: '400 Developers',
    name: 'Chennai Tech Meetup',
    date: '20 Dec 2026, 05:00 PM',
    location: 'Open Source Hub Auditorium',
    image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80',
  },
];

export function CreateEventPreview() {
  const [activeTab, setActiveTab] = useState('conference');
  const activeTemplate = eventTemplates.find((t) => t.id === activeTab) || eventTemplates[0];

  return (
    <section className="py-20 bg-ds-canvas border-t border-ds-line">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Dynamic Event Visual with Type Pill Selector */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {eventTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-ds-accent text-white shadow-sm'
                      : 'bg-white text-ds-muted hover:bg-ds-subtle border border-ds-line'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-ds-line h-96 group">
              <img
                src={activeTemplate.image}
                alt={activeTemplate.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ds-ink/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-white border border-ds-line flex items-center justify-between shadow-md">
                <div>
                  <div className="text-[10px] font-bold text-ds-accent uppercase tracking-wider">EVENT TEMPLATE PREVIEW</div>
                  <div className="text-base font-bold text-ds-body">{activeTemplate.title}</div>
                </div>
                <span className="text-xs bg-[#22C55E]/15 text-[#22C55E] font-bold px-2.5 py-1 rounded-md">
                  Preset Active
                </span>
              </div>
            </div>
          </div>

          {/* Right: Creation Configuration Modal UI */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold text-ds-accent uppercase tracking-wider">01 / CREATE</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-ds-body mt-1 tracking-tight">
                Start With an Event.
              </h2>
              <p className="text-base text-ds-muted mt-2 font-normal">
                Choose the event type, configure the experience, and launch in minutes. Adapt tickets, capacities, and staff roles on the fly.
              </p>
            </div>

            {/* Realistic SaaS Creation Modal */}
            <div className="bg-white p-6 rounded-2xl border border-ds-line shadow-xl shadow-black/5 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-ds-line">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-ds-accent text-xl">add_box</span>
                  <span className="text-sm font-bold text-ds-body">Create New Experience</span>
                </div>
                <span className="text-xs text-ds-muted">Step 1 of 3</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-ds-muted block mb-1.5">Event Type</label>
                  <div className="w-full p-2.5 rounded-xl border border-ds-line bg-ds-canvas flex items-center justify-between text-ds-body text-xs font-semibold">
                    <span>{activeTemplate.label}</span>
                    <span className="material-symbols-outlined text-sm text-ds-muted">expand_more</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ds-muted block mb-1.5">Target Capacity</label>
                  <input
                    className="w-full p-2.5 rounded-xl border border-ds-line bg-ds-canvas text-ds-body text-xs font-semibold outline-none"
                    readOnly
                    type="text"
                    value={activeTemplate.capacity}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ds-muted block mb-1.5">Event Name</label>
                <input
                  className="w-full p-2.5 rounded-xl border border-ds-line bg-ds-canvas text-ds-body text-xs font-bold outline-none"
                  readOnly
                  type="text"
                  value={activeTemplate.name}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-ds-muted block mb-1.5">Date & Time</label>
                  <div className="w-full p-2.5 rounded-xl border border-ds-line bg-ds-canvas flex items-center justify-between text-ds-body text-xs font-semibold">
                    <span>{activeTemplate.date}</span>
                    <span className="material-symbols-outlined text-sm text-ds-muted">calendar_today</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ds-muted block mb-1.5">Venue / Location</label>
                  <div className="w-full p-2.5 rounded-xl border border-ds-line bg-ds-canvas flex items-center justify-between text-ds-body text-xs font-semibold">
                    <span className="truncate">{activeTemplate.location}</span>
                    <span className="material-symbols-outlined text-sm text-ds-muted">location_on</span>
                  </div>
                </div>
              </div>

              {/* Access Tiers Setup Preview */}
              <div>
                <label className="text-xs font-semibold text-ds-muted block mb-1.5">Configured Access Tiers</label>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-ds-canvas rounded-lg text-xs font-semibold text-ds-body border border-ds-line">
                    <span className="w-2 h-2 rounded-full bg-ds-accent" /> VIP All-Access ($499)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-ds-canvas rounded-lg text-xs font-semibold text-ds-body border border-ds-line">
                    <span className="w-2 h-2 rounded-full bg-ds-accent-strong" /> General Delegate ($199)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-ds-canvas rounded-lg text-xs font-semibold text-ds-body border border-ds-line">
                    <span className="w-2 h-2 rounded-full bg-ds-muted" /> Workshop Pass ($89)
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/app/events/new"
                  className="w-full py-3 bg-ds-accent hover:bg-ds-accent-strong text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
                >
                  <span>Create Event & Configure Tracks</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
