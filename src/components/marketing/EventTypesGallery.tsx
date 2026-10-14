'use client';

import React from 'react';

const eventCategories = [
  {
    id: 'conferences',
    tag: 'Conferences',
    title: 'Global Summits & Keynotes',
    description: 'Multi-stage scheduling, badge printing, and breakout validation.',
    tagBg: 'bg-[#7C5CFC] text-white',
    image:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    alt: 'Grand tech conference keynote stage with auditorium lighting',
  },
  {
    id: 'corporate',
    tag: 'Corporate',
    title: 'Leadership Summits',
    description: 'Restricted guestlists, VIP hospitality concierge, and NDAs.',
    tagBg: 'bg-[#5B3FE8] text-white',
    image:
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
    alt: 'Executive corporate summit in a glass boardroom',
  },
  {
    id: 'workshops',
    tag: 'Workshops',
    title: 'Hands-on Labs',
    description: 'Cap-limited seat allocation, sandbox tokens, and mentors.',
    tagBg: 'bg-[#17152B] text-white',
    image:
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    alt: 'Software engineers and designers collaborating in a modern lab',
  },
  {
    id: 'sports',
    tag: 'Sports',
    title: 'Runs & Marathons',
    description: 'RFID chip timing integration, bib allocation, and wave starts.',
    tagBg: 'bg-[#22C55E] text-white',
    image:
      'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=800&q=80',
    alt: 'Marathon start line runners positioned beneath digital timing arch',
  },
  {
    id: 'exhibitions',
    tag: 'Exhibitions',
    title: 'Trade & Expo Halls',
    description: 'Exhibitor lead retrieval badges, zone access, and floor heatmaps.',
    tagBg: 'bg-[#7C5CFC] text-white',
    image:
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
    alt: 'Exhibition and trade show hall with interactive tech booths',
  },
  {
    id: 'festivals',
    tag: 'Cultural',
    title: 'Festivals & Arts',
    description: 'High-volume fast turnstiles, cashless wristbands, and pass tiers.',
    tagBg: 'bg-[#5B3FE8] text-white',
    image:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    alt: 'Open-air festival illuminated stage spotlight event',
  },
  {
    id: 'community',
    tag: 'Community',
    title: 'Tech Meetups',
    description: 'Instant RSVP check-ins, attendee rosters, and simple badges.',
    tagBg: 'bg-[#17152B] text-white',
    image:
      'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80',
    alt: 'Developer meetup in a modern incubator',
  },
];

export function EventTypesGallery() {
  return (
    <section className="py-20 bg-[#F7F5FF] border-y border-[#EDE9FE]" id="event-types">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#7C5CFC] uppercase tracking-wider">Universal Architecture</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#27243A] mt-1 tracking-tight">
            Built for Every Kind of Event.
          </h2>
          <p className="text-base text-[#77738A] mt-2 max-w-2xl font-normal">
            From global tech summits to community hackathons, manage registration, ticketing, and live execution without switching tooling.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#77738A] font-semibold">
          <span>Scroll horizontally</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </div>
      </div>

      {/* Editorial Horizontal Carousel Gallery */}
      <div className="overflow-x-auto custom-scrollbar pb-6 px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex gap-5 w-max">
          {eventCategories.map((item) => (
            <div
              key={item.id}
              className="relative w-80 h-[380px] rounded-2xl overflow-hidden group shadow-md flex-shrink-0 border border-[#EDE9FE]"
            >
              <img
                src={item.image}
                alt={item.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#17152B]/90 via-[#17152B]/30 to-transparent flex flex-col justify-end p-6 text-white">
                <span className={`text-xs font-bold w-max px-2.5 py-1 rounded-md mb-2 ${item.tagBg}`}>
                  {item.tag}
                </span>
                <h4 className="text-xl font-bold text-white leading-tight">{item.title}</h4>
                <p className="text-xs text-[#EDE9FE] mt-1.5 leading-relaxed font-normal">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
