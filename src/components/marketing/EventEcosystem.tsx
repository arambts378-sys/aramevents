'use client';

import React from 'react';

const mosaicItems = [
  {
    tag: 'CONFERENCE',
    tagBg: 'bg-[#7C5CFC] text-white',
    title: 'AI Summit 2026',
    description: 'Multi-track agenda orchestrator with speaker prep rooms and instant badge issuance.',
    feature: 'Multi-Track Ready',
    featureColor: 'text-[#7C5CFC]',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    alt: 'Expansive modern conference hall',
  },
  {
    tag: 'SPORTS & TIMING',
    tagBg: 'bg-[#22C55E] text-white',
    title: 'National Corporate Games',
    description: 'Timing integration, wave gate management, and dynamic digital bib allocation.',
    feature: 'RFID Chip Wave Sync',
    featureColor: 'text-[#22C55E]',
    image: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=800&q=80',
    alt: 'Athletes at corporate run starting gantry',
  },
  {
    tag: 'WORKSHOPS & LABS',
    tagBg: 'bg-[#5B3FE8] text-white',
    title: 'AI Engineering Lab',
    description: 'Hands-on cloud sandbox allocation, seat reservations, and mentor queue dispatch.',
    feature: 'Seat & Sandbox Limits',
    featureColor: 'text-[#5B3FE8]',
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    alt: 'Tech workshop hackathon classroom',
  },
  {
    tag: 'TRADE EXPOS',
    tagBg: 'bg-[#7C5CFC] text-white',
    title: 'Future Tech Expo 2026',
    description: 'Exhibitor lead retrieval apps, interactive booth mapping, and dwell-time heatmaps.',
    feature: 'Interactive Floor Plan',
    featureColor: 'text-[#7C5CFC]',
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
    alt: 'Trade exhibition hall filled with corporate booths',
  },
  {
    tag: 'CORPORATE SUMMITS',
    tagBg: 'bg-[#17152B] text-white',
    title: 'Global Leadership Summit',
    description: 'Private executive concierge, NDA signing gates, and custom security sync.',
    feature: 'VIP NDA & White-glove',
    featureColor: 'text-[#27243A]',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
    alt: 'Executive boardroom during corporate summit',
  },
  {
    tag: 'COMMUNITY HUBS',
    tagBg: 'bg-[#77738A] text-white',
    title: 'Chennai Tech Meetup',
    description: 'Fast RSVP whitelisting, peer speed-networking tables, and automated attendee badges.',
    feature: 'Zero-Config RSVPs',
    featureColor: 'text-[#5B3FE8]',
    image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80',
    alt: 'Community meetup space in incubator',
  },
];

export function EventEcosystem() {
  return (
    <section className="py-24 bg-[#F7F5FF] border-y border-[#EDE9FE]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-[#7C5CFC] uppercase tracking-wider">Multi-Vertical Ecosystem</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#27243A] mt-1 tracking-tight">
            Different Events. One Operating System.
          </h2>
          <p className="text-base text-[#77738A] mt-2 font-normal">
            From developer hackathons to marathon timing and trade show floor maps, ARAM BTS eliminates siloed ticketing engines.
          </p>
        </div>

        {/* Asymmetric Mosaic Visual Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mosaicItems.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl overflow-hidden border border-[#EDE9FE] shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="h-48 relative overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-md ${item.tagBg}`}>
                    {item.tag}
                  </div>
                </div>
                <div className="p-5">
                  <h4 className="text-lg font-bold text-[#27243A]">{item.title}</h4>
                  <p className="text-xs text-[#77738A] mt-1.5 leading-relaxed font-normal">{item.description}</p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-0">
                <div className={`pt-3 border-t border-[#EDE9FE] flex items-center justify-between text-xs font-semibold ${item.featureColor}`}>
                  <span>{item.feature}</span>
                  <span className="material-symbols-outlined text-base">check_circle</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
