export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  accent: string;
  border: string;
  muted: string;
}

export interface ThemeTypography {
  headingFont: string;
  bodyFont: string;
  headingScale: 'compact' | 'standard' | 'large';
  bodyScale: 'compact' | 'standard' | 'large';
}

export interface ThemeLayout {
  contentWidth: 'compact' | 'standard' | 'wide' | 'full';
  cardStyle: 'flat' | 'bordered' | 'elevated';
  buttonStyle: 'sharp' | 'rounded' | 'pill';
  density: 'compact' | 'standard' | 'spacious';
}

export type HeroVariant =
  | 'asymmetric'
  | 'split'
  | 'full-bleed'
  | 'centered'
  | 'cinematic'
  | 'outcome-focused'
  | 'stats-driven'
  | 'poster'
  | 'story-led'
  | 'minimal';

export type SpeakerVariant =
  | 'spotlight'
  | 'executive'
  | 'asymmetric'
  | 'grid'
  | 'compact'
  | 'circular'
  | 'lineup';

export type AgendaVariant =
  | 'timeline'
  | 'multi-track'
  | 'cards'
  | 'modules'
  | 'chronological'
  | 'race-day'
  | 'daily-rhythm'
  | 'table';

export type VenueVariant =
  | 'editorial'
  | 'split'
  | 'immersive'
  | 'map'
  | 'compact';

export type RegistrationVariant =
  | 'centered'
  | 'split'
  | 'banner'
  | 'pricing'
  | 'pricing-table'
  | 'invitation'
  | 'pass-cards'
  | 'floating-card';

export type FooterVariant =
  | 'editorial'
  | 'corporate'
  | 'minimal'
  | 'multi-column'
  | 'community'
  | 'festival'
  | 'artistic'
  | 'split';

export type HeaderVariant =
  | 'minimal'
  | 'corporate'
  | 'pill-nav'
  | 'bold'
  | 'sticky-blur'
  | 'floating'
  | 'transparent'
  | 'solid';

export type AboutVariant =
  | 'editorial'
  | 'briefing'
  | 'manifesto'
  | 'split'
  | 'outcomes'
  | 'categories'
  | 'story';

export type EventInfoVariant =
  | 'editorial-meta'
  | 'stats-strip'
  | 'highlights-grid'
  | 'metric-cards'
  | 'minimal-pills';

export interface TemplateVariants {
  header: HeaderVariant;
  hero: HeroVariant;
  eventInfo: EventInfoVariant;
  about: AboutVariant;
  speakers: SpeakerVariant;
  agenda: AgendaVariant;
  venue: VenueVariant;
  sponsors: 'minimal' | 'tiered' | 'banner' | 'grid';
  exhibitors: 'minimal' | 'grid';
  register: RegistrationVariant;
  contact: 'minimal' | 'split' | 'cards';
  footer: FooterVariant;
}

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
  variants: TemplateVariants;
  defaultSections: string[];
}

export const colorPalettes: { id: string; name: string; colors: ThemeColors }[] = [
  {
    id: 'signature-violet',
    name: 'Signature Violet',
    colors: {
      primary: '#7C5CFC',
      secondary: '#5B3FE8',
      background: '#F7F5FF',
      surface: '#FFFFFF',
      text: '#17152B',
      accent: '#A78BFA',
      border: '#E6E2F0',
      muted: '#77738A',
    },
  },
  {
    id: 'obsidian-dark',
    name: 'Obsidian Dark',
    colors: {
      primary: '#818CF8',
      secondary: '#6366F1',
      background: '#11101A',
      surface: '#1A1829',
      text: '#F9FAFB',
      accent: '#C084FC',
      border: '#2D2B3D',
      muted: '#9CA3AF',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    colors: {
      primary: '#059669',
      secondary: '#047857',
      background: '#F0FDF4',
      surface: '#FFFFFF',
      text: '#064E3B',
      accent: '#10B981',
      border: '#D1FAE5',
      muted: '#047857',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      primary: '#2563EB',
      secondary: '#1D4ED8',
      background: '#EFF6FF',
      surface: '#FFFFFF',
      text: '#1E3A8A',
      accent: '#38BDF8',
      border: '#DBEAFE',
      muted: '#64748B',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      primary: '#EA580C',
      secondary: '#C2410C',
      background: '#FFF7ED',
      surface: '#FFFFFF',
      text: '#7C2D12',
      accent: '#FB923C',
      border: '#FFEDD5',
      muted: '#9A3412',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      primary: '#E11D48',
      secondary: '#BE123C',
      background: '#FFF1F2',
      surface: '#FFFFFF',
      text: '#881337',
      accent: '#FB7185',
      border: '#FFE4E6',
      muted: '#9F1239',
    },
  },
  {
    id: 'classic-maroon',
    name: 'Classic Maroon',
    colors: {
      primary: '#7A1F3D',
      secondary: '#4A1024',
      background: '#FAF8F5',
      surface: '#FFFFFF',
      text: '#171717',
      accent: '#E09E5F',
      border: '#E7E2DD',
      muted: '#6B6B6B',
    },
  },
];

export const fontPairings: {
  id: string;
  name: string;
  headingFont: string;
  bodyFont: string;
}[] = [
  {
    id: 'modern',
    name: 'Modern',
    headingFont: 'Space Grotesk',
    bodyFont: 'Inter',
  },
  {
    id: 'professional',
    name: 'Professional',
    headingFont: 'Plus Jakarta Sans',
    bodyFont: 'Inter',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    headingFont: 'Space Grotesk',
    bodyFont: 'Plus Jakarta Sans',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    headingFont: 'Inter',
    bodyFont: 'Inter',
  },
  {
    id: 'bold',
    name: 'Bold',
    headingFont: 'Space Grotesk',
    bodyFont: 'Space Grotesk',
  },
];

export const templates: TemplateConfig[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Clean, text-focused, sophisticated layout tailored for summits and thought-leadership.',
    category: 'Conference',
    tags: ['Asymmetric Hero', 'Spotlight Speaker', 'Editorial Timeline'],
    colors: {
      primary: '#7A1F3D',
      secondary: '#4A1024',
      background: '#FAF8F5',
      surface: '#FFFFFF',
      text: '#171717',
      accent: '#E09E5F',
      border: '#E7E2DD',
      muted: '#6B6B6B',
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'Plus Jakarta Sans',
      headingScale: 'large',
      bodyScale: 'standard',
    },
    layout: {
      contentWidth: 'standard',
      cardStyle: 'flat',
      buttonStyle: 'rounded',
      density: 'spacious',
    },
    variants: {
      header: 'minimal',
      hero: 'asymmetric',
      eventInfo: 'editorial-meta',
      about: 'editorial',
      speakers: 'spotlight',
      agenda: 'timeline',
      venue: 'editorial',
      sponsors: 'minimal',
      exhibitors: 'minimal',
      register: 'centered',
      contact: 'minimal',
      footer: 'editorial',
    },
    defaultSections: ['header', 'hero', 'event_info', 'about', 'speakers', 'agenda', 'venue', 'register', 'footer'],
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Dark, authoritative, corporate aesthetic built for enterprise and global governance summits.',
    category: 'Corporate',
    tags: ['Split Hero', 'Metrics Strip', 'Executive Grid'],
    colors: {
      primary: '#6366F1',
      secondary: '#4F46E5',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F8FAFC',
      accent: '#38BDF8',
      border: '#334155',
      muted: '#94A3B8',
    },
    typography: {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Inter',
      headingScale: 'standard',
      bodyScale: 'standard',
    },
    layout: {
      contentWidth: 'standard',
      cardStyle: 'bordered',
      buttonStyle: 'sharp',
      density: 'compact',
    },
    variants: {
      header: 'corporate',
      hero: 'split',
      eventInfo: 'stats-strip',
      about: 'briefing',
      speakers: 'executive',
      agenda: 'multi-track',
      venue: 'split',
      sponsors: 'tiered',
      exhibitors: 'grid',
      register: 'split',
      contact: 'split',
      footer: 'corporate',
    },
    defaultSections: ['header', 'hero', 'event_info', 'about', 'speakers', 'agenda', 'venue', 'sponsors', 'register', 'footer'],
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Bold, expressive, and vibrant aesthetic perfect for hackathons, design weeks, and tech festivals.',
    category: 'Creative',
    tags: ['Full-Bleed Hero', 'Manifesto', 'Offset Cards'],
    colors: {
      primary: '#8B5CF6',
      secondary: '#7C3AED',
      background: '#111827',
      surface: '#1F2937',
      text: '#F9FAFB',
      accent: '#EC4899',
      border: '#374151',
      muted: '#9CA3AF',
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'Inter',
      headingScale: 'large',
      bodyScale: 'standard',
    },
    layout: {
      contentWidth: 'wide',
      cardStyle: 'elevated',
      buttonStyle: 'pill',
      density: 'spacious',
    },
    variants: {
      header: 'pill-nav',
      hero: 'full-bleed',
      eventInfo: 'highlights-grid',
      about: 'manifesto',
      speakers: 'asymmetric',
      agenda: 'cards',
      venue: 'immersive',
      sponsors: 'grid',
      exhibitors: 'grid',
      register: 'banner',
      contact: 'cards',
      footer: 'minimal',
    },
    defaultSections: ['header', 'hero', 'about', 'event_info', 'speakers', 'agenda', 'venue', 'sponsors', 'register', 'footer'],
  },
  {
    id: 'conference',
    name: 'Conference',
    description: 'Professional multi-track layout with prominent keynotes, agenda tracks, and partner exhibits.',
    category: 'Conference',
    tags: ['Grand Hero', 'Speaker Grid', 'Multi-Track Agenda'],
    colors: {
      primary: '#1D4ED8',
      secondary: '#1E40AF',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#0F172A',
      accent: '#0EA5E9',
      border: '#E2E8F0',
      muted: '#64748B',
    },
    typography: {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Inter',
      headingScale: 'standard',
      bodyScale: 'standard',
    },
    layout: {
      contentWidth: 'standard',
      cardStyle: 'bordered',
      buttonStyle: 'rounded',
      density: 'standard',
    },
    variants: {
      header: 'corporate',
      hero: 'centered',
      eventInfo: 'stats-strip',
      about: 'split',
      speakers: 'grid',
      agenda: 'multi-track',
      venue: 'map',
      sponsors: 'tiered',
      exhibitors: 'grid',
      register: 'pricing',
      contact: 'split',
      footer: 'multi-column',
    },
    defaultSections: ['header', 'hero', 'event_info', 'about', 'speakers', 'agenda', 'exhibitors', 'venue', 'sponsors', 'register', 'contact', 'footer'],
  },
  {
    id: 'summit',
    name: 'Summit',
    description: 'Premium corporate design featuring high-contrast hero, luminary speakers, and VIP tiers.',
    category: 'Corporate',
    tags: ['Cinematic Hero', 'Pillars', 'VIP Pass Invitation'],
    colors: {
      primary: '#D97706',
      secondary: '#B45309',
      background: '#0B132B',
      surface: '#1C2541',
      text: '#F8FAFC',
      accent: '#F59E0B',
      border: '#3A506B',
      muted: '#8D99AE',
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'Plus Jakarta Sans',
      headingScale: 'large',
      bodyScale: 'standard',
    },
    layout: {
      contentWidth: 'standard',
      cardStyle: 'elevated',
      buttonStyle: 'rounded',
      density: 'spacious',
    },
    variants: {
      header: 'minimal',
      hero: 'cinematic',
      eventInfo: 'metric-cards',
      about: 'editorial',
      speakers: 'executive',
      agenda: 'timeline',
      venue: 'immersive',
      sponsors: 'minimal',
      exhibitors: 'minimal',
      register: 'floating-card',
      contact: 'minimal',
      footer: 'editorial',
    },
    defaultSections: ['header', 'hero', 'about', 'event_info', 'speakers', 'agenda', 'venue', 'register', 'footer'],
  },
  {
    id: 'workshop',
    name: 'Workshop',
    description: 'Practical, focused structure emphasizing curriculum, instructor bios, and immediate seat registration.',
    category: 'Conference',
    tags: ['Outcome Hero', 'Learning Modules', 'Seat Reservation'],
    colors: {
      primary: '#0F766E',
      secondary: '#115E59',
      background: '#F0FDFA',
      surface: '#FFFFFF',
      text: '#134E4A',
      accent: '#14B8A6',
      border: '#CCFBF1',
      muted: '#5EEAD4',
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'Inter',
      headingScale: 'standard',
      bodyScale: 'compact',
    },
    layout: {
      contentWidth: 'compact',
      cardStyle: 'bordered',
      buttonStyle: 'rounded',
      density: 'compact',
    },
    variants: {
      header: 'minimal',
      hero: 'outcome-focused',
      eventInfo: 'minimal-pills',
      about: 'outcomes',
      speakers: 'compact',
      agenda: 'modules',
      venue: 'compact',
      sponsors: 'minimal',
      exhibitors: 'minimal',
      register: 'floating-card',
      contact: 'cards',
      footer: 'minimal',
    },
    defaultSections: ['header', 'hero', 'about', 'event_info', 'speakers', 'agenda', 'venue', 'register', 'contact', 'footer'],
  },
  {
    id: 'networking',
    name: 'Networking',
    description: 'People-first layout highlighting attendees, roundtables, venue lounges, and social mixers.',
    category: 'Networking',
    tags: ['Social Hero', 'Circular Avatars', 'Mixer Timeline'],
    colors: {
      primary: '#7C5CFC',
      secondary: '#5B3FE8',
      background: '#F7F5FF',
      surface: '#FFFFFF',
      text: '#17152B',
      accent: '#A78BFA',
      border: '#E6E2F0',
      muted: '#77738A',
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'Plus Jakarta Sans',
      headingScale: 'standard',
      bodyScale: 'standard',
    },
    layout: {
      contentWidth: 'standard',
      cardStyle: 'elevated',
      buttonStyle: 'pill',
      density: 'standard',
    },
    variants: {
      header: 'pill-nav',
      hero: 'story-led',
      eventInfo: 'stats-strip',
      about: 'split',
      speakers: 'circular',
      agenda: 'chronological',
      venue: 'split',
      sponsors: 'grid',
      exhibitors: 'minimal',
      register: 'split',
      contact: 'split',
      footer: 'community',
    },
    defaultSections: ['header', 'hero', 'event_info', 'about', 'speakers', 'agenda', 'venue', 'sponsors', 'register', 'contact', 'footer'],
  },
  {
    id: 'festival',
    name: 'Festival',
    description: 'Immersive visual experience with high-energy banner imagery, artist stages, and festival passes.',
    category: 'Festival',
    tags: ['Poster Hero', 'Lineup Typography', 'Stage Blocks'],
    colors: {
      primary: '#C026D3',
      secondary: '#A21CAF',
      background: '#18181B',
      surface: '#27272A',
      text: '#FAFAFA',
      accent: '#F97316',
      border: '#3F3F46',
      muted: '#A1A1AA',
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'Inter',
      headingScale: 'large',
      bodyScale: 'standard',
    },
    layout: {
      contentWidth: 'full',
      cardStyle: 'flat',
      buttonStyle: 'pill',
      density: 'spacious',
    },
    variants: {
      header: 'bold',
      hero: 'poster',
      eventInfo: 'highlights-grid',
      about: 'manifesto',
      speakers: 'lineup',
      agenda: 'cards',
      venue: 'immersive',
      sponsors: 'grid',
      exhibitors: 'grid',
      register: 'banner',
      contact: 'minimal',
      footer: 'festival',
    },
    defaultSections: ['header', 'hero', 'about', 'speakers', 'agenda', 'event_info', 'venue', 'sponsors', 'register', 'footer'],
  },
  {
    id: 'sports',
    name: 'Sports',
    description: 'Dynamic, high-impact athletic layout with course routes, race categories, and live registration.',
    category: 'Sports',
    tags: ['Stats-Driven Hero', 'Race Categories', 'Race-Day Timeline'],
    colors: {
      primary: '#DC2626',
      secondary: '#B91C1C',
      background: '#FAFAFA',
      surface: '#FFFFFF',
      text: '#18181B',
      accent: '#F59E0B',
      border: '#E4E4E7',
      muted: '#71717A',
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'Inter',
      headingScale: 'large',
      bodyScale: 'standard',
    },
    layout: {
      contentWidth: 'wide',
      cardStyle: 'bordered',
      buttonStyle: 'sharp',
      density: 'standard',
    },
    variants: {
      header: 'bold',
      hero: 'stats-driven',
      eventInfo: 'stats-strip',
      about: 'categories',
      speakers: 'compact',
      agenda: 'race-day',
      venue: 'map',
      sponsors: 'tiered',
      exhibitors: 'minimal',
      register: 'banner',
      contact: 'split',
      footer: 'corporate',
    },
    defaultSections: ['header', 'hero', 'event_info', 'about', 'agenda', 'venue', 'sponsors', 'register', 'contact', 'footer'],
  },
  {
    id: 'wellness',
    name: 'Wellness',
    description: 'Calm, harmonious aesthetic with serene earth tones, mindful schedule, and restorative retreat details.',
    category: 'Wellness',
    tags: ['Serene Hero', 'Circular Portraits', 'Daily Rhythm'],
    colors: {
      primary: '#4D7C0F',
      secondary: '#3F6212',
      background: '#F7FEE7',
      surface: '#FFFFFF',
      text: '#1A2E05',
      accent: '#84CC16',
      border: '#ECFCCB',
      muted: '#65A30D',
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'Plus Jakarta Sans',
      headingScale: 'standard',
      bodyScale: 'standard',
    },
    layout: {
      contentWidth: 'compact',
      cardStyle: 'flat',
      buttonStyle: 'pill',
      density: 'spacious',
    },
    variants: {
      header: 'minimal',
      hero: 'minimal',
      eventInfo: 'minimal-pills',
      about: 'story',
      speakers: 'circular',
      agenda: 'daily-rhythm',
      venue: 'immersive',
      sponsors: 'minimal',
      exhibitors: 'minimal',
      register: 'centered',
      contact: 'minimal',
      footer: 'minimal',
    },
    defaultSections: ['header', 'hero', 'about', 'event_info', 'speakers', 'agenda', 'venue', 'register', 'contact', 'footer'],
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Clean, structured enterprise portal with executive keynotes, investor agenda, and partner logos.',
    category: 'Corporate',
    tags: ['Corporate Split', 'Strategic Briefing', 'Executive Tracks'],
    colors: {
      primary: '#2563EB',
      secondary: '#1D4ED8',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#0F172A',
      accent: '#38BDF8',
      border: '#E2E8F0',
      muted: '#64748B',
    },
    typography: {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Inter',
      headingScale: 'standard',
      bodyScale: 'standard',
    },
    layout: {
      contentWidth: 'standard',
      cardStyle: 'bordered',
      buttonStyle: 'rounded',
      density: 'compact',
    },
    variants: {
      header: 'corporate',
      hero: 'split',
      eventInfo: 'metric-cards',
      about: 'briefing',
      speakers: 'executive',
      agenda: 'multi-track',
      venue: 'split',
      sponsors: 'tiered',
      exhibitors: 'grid',
      register: 'pricing',
      contact: 'split',
      footer: 'corporate',
    },
    defaultSections: ['header', 'hero', 'about', 'event_info', 'speakers', 'agenda', 'venue', 'sponsors', 'register', 'footer'],
  },
  {
    id: 'community',
    name: 'Community',
    description: 'Warm, inviting neighborhood & volunteer design celebrating shared stories and local gathering.',
    category: 'Community',
    tags: ['Story-Led Hero', 'Community Highlights', 'Activity Flow'],
    colors: {
      primary: '#C2410C',
      secondary: '#9A3412',
      background: '#FFF7ED',
      surface: '#FFFFFF',
      text: '#431407',
      accent: '#F97316',
      border: '#FFEDD5',
      muted: '#7C2D12',
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'Plus Jakarta Sans',
      headingScale: 'standard',
      bodyScale: 'standard',
    },
    layout: {
      contentWidth: 'standard',
      cardStyle: 'elevated',
      buttonStyle: 'rounded',
      density: 'standard',
    },
    variants: {
      header: 'pill-nav',
      hero: 'story-led',
      eventInfo: 'highlights-grid',
      about: 'story',
      speakers: 'grid',
      agenda: 'chronological',
      venue: 'split',
      sponsors: 'grid',
      exhibitors: 'minimal',
      register: 'centered',
      contact: 'cards',
      footer: 'community',
    },
    defaultSections: ['header', 'hero', 'about', 'event_info', 'speakers', 'agenda', 'venue', 'register', 'contact', 'footer'],
  },
];
