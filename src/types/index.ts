export interface User {
  id: string;
  name: string;
  email: string;
}

export interface WebsiteSection {
  id: string; // e.g., 'home', 'about', 'speakers'
  type: string;
  visible: boolean;
  order: number;
  content?: {
    image?: string;
    layout?: 'banner' | 'split';
    imageFit?: 'contain' | 'cover';
    imageAlignment?: 'left' | 'center' | 'right';
    overlay?: 'none' | 'light' | 'dark';
    showEventInfo?: boolean;
    heroHeight?: 'small' | 'medium' | 'large';
    [key: string]: unknown;
  };
}

export interface ThemeConfig {
  colors?: import('@/data/templates').ThemeColors;
  typography?: import('@/data/templates').ThemeTypography;
  layout?: import('@/data/templates').ThemeLayout;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  fontHeading?: string;
  fontBody?: string;
  buttonStyle?: string;
  [key: string]: unknown;
}

export interface WebsiteState {
  templateId: string;
  status: 'draft' | 'published';
  theme: ThemeConfig;
  sections: WebsiteSection[];
  seo?: Record<string, unknown>;
}

export interface WebsiteConfig {
  status: 'draft' | 'published';
  draft?: WebsiteState;
  published?: WebsiteState;
  
  // Keep legacy properties optional for backward compatibility
  templateId?: string;
  sections?: WebsiteSection[];
}

export interface Event {
  id: string;
  slug: string;
  name: string;
  type: string;
  format: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location?: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  workspace_id: string;
  createdAt: string;
  flyer?: string;
  website: WebsiteConfig;
}

export type EventPersonType = 'attendee' | 'staff' | 'speaker';
export type EventPersonStatus = 'active' | 'inactive';

export interface Person {
  id: string;
  workspace_id: string;
  profile_id?: string | null;
  first_name: string;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  organization?: string | null;
  job_title?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventPerson {
  id: string;
  event_id: string;
  person_id: string;
  person_type: EventPersonType;
  status: EventPersonStatus;
  created_at: string;
  updated_at: string;
  person?: Person; // Joined data
  speaker_profile?: EventSpeakerProfile; // Joined data for speakers
}

export interface EventSpeakerProfile {
  event_person_id: string;
  headline?: string | null;
  bio?: string | null;
  website_url?: string | null;
  twitter_url?: string | null;
  linkedin_url?: string | null;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled' | 'failed';
export type ConfirmationStatus = 'pending' | 'confirmed' | 'failed';

export interface EventRegistrationSettings {
  event_id: string;
  is_enabled: boolean;
  title?: string | null;
  description?: string | null;
  capacity?: number | null;
  confirmation_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  person_id: string;
  event_person_id: string;
  registration_number: string;
  status: RegistrationStatus;
  confirmation_status: ConfirmationStatus;
  registered_at: string;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  distance_category_id?: string | null;
  ticket_type_id?: string | null;
  person?: Person; // Joined data
  event_person?: EventPerson; // Joined data
  distance_category?: WalkathonDistanceCategory; // Joined data
  ticket_type?: EventTicketType; // Joined data
}

export type TicketType = 'free' | 'paid';
export type TicketVisibility = 'public' | 'hidden';
export type TicketDerivedStatus = 'draft' | 'scheduled' | 'on_sale' | 'sold_out' | 'sales_ended' | 'inactive';

export interface EventTicketType {
  id: string;
  event_id: string;
  name: string;
  description?: string | null;
  ticket_type: TicketType;
  price_amount: number; // in integer paise (₹799 = 79900)
  currency: string;
  quantity_total: number;
  sales_start_at?: string | null;
  sales_end_at?: string | null;
  min_per_order: number;
  max_per_order: number;
  visibility: TicketVisibility;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed / joined fields
  quantity_sold?: number;
  quantity_remaining?: number;
  derived_status?: TicketDerivedStatus;
}

export interface PublicTicketAvailability {
  id: string;
  event_id: string;
  name: string;
  description?: string | null;
  ticket_type: TicketType;
  price_amount: number; // in integer paise
  currency: string;
  quantity_total: number;
  quantity_sold: number;
  quantity_remaining: number;
  min_per_order: number;
  max_per_order: number;
  sales_start_at?: string | null;
  sales_end_at?: string | null;
  status: TicketDerivedStatus;
}

export interface WalkathonDistanceCategory {
  id: string;
  event_id: string;
  distance_km: number;
  name: string;
  capacity?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  user_id: string;
  default_event_type?: string | null;
  default_event_format?: string | null;
  default_timezone?: string | null;
  default_location?: string | null;
  notify_registration_updates: boolean;
  notify_event_updates: boolean;
  notify_check_in_updates: boolean;
  notify_integration_alerts: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceDetails {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  email?: string | null;
  logo_url?: string | null;
  is_suspended?: boolean;
  suspended_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}
