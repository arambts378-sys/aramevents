/**
 * Aram Events — AI Event Agent
 * Mock AI adapter — simulates extraction + conversation with realistic delays.
 * Swap this for a real provider adapter (Gemini, GPT-4o, Claude) in a future phase.
 */

import type {
  AIProviderAdapter,
  ConversationContext,
  ExtractedEventDetails,
} from './types';

const MOCK_EXTRACTION: ExtractedEventDetails = {
  confidence: 0.87,
  name: 'TechFest Hyderabad 2026',
  description:
    'A premier technology and innovation festival bringing together developers, designers, and entrepreneurs for two days of talks, workshops, and networking.',
  category: 'Technology',
  date: '2026-12-12',
  endDate: '2026-12-13',
  startTime: '09:00',
  endTime: '18:00',
  timezone: 'Asia/Kolkata',
  venue: 'HICC — Hyderabad International Convention Centre',
  address: 'Near Novotel, Madhapur',
  city: 'Hyderabad',
  country: 'India',
  capacity: 2000,
  registrationOpenDate: '2026-11-01',
  registrationCloseDate: '2026-12-10',
  ticketTypes: [
    { name: 'General Admission', price: 499, currency: 'INR', capacity: 1500 },
    { name: 'VIP Pass', price: 1499, currency: 'INR', capacity: 300, description: 'Priority seating, speaker meet & greet, exclusive swag' },
    { name: 'Student', price: 199, currency: 'INR', capacity: 200, description: 'Valid student ID required at entry' },
  ],
  contactEmail: 'hello@techfesthyd.in',
  websiteUrl: 'https://techfesthyd.in',
  tags: ['tech', 'developer', 'innovation', 'networking'],
  uncertainFields: ['endTime', 'contactPhone'],
};

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const CONVERSATION_RESPONSES: Record<string, string> = {
  capacity:
    "The flyer mentions a venue capacity of 2,000 — I've set that as the max. You can adjust it per ticket tier too. Want me to update a specific tier?",
  ticket:
    "I've detected 3 ticket tiers: General (₹499), VIP (₹1,499), and Student (₹199). You can edit each one in the review card below. Shall I adjust any pricing?",
  date:
    "The event is scheduled for **12–13 December 2026** in the Asia/Kolkata timezone. Should I change the date or timezone?",
  venue:
    "The venue is **HICC — Hyderabad International Convention Centre**, Madhapur. Would you like to update the address or add directions?",
  email:
    "The contact email extracted is **hello@techfesthyd.in**. Would you like to use a different organizer email?",
  default:
    "I can help you refine those details. Could you be more specific about which field you'd like to update — name, date, venue, tickets, or capacity?",
};

function getMockReply(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  for (const [key, reply] of Object.entries(CONVERSATION_RESPONSES)) {
    if (lower.includes(key)) return reply;
  }
  return CONVERSATION_RESPONSES.default;
}

export const mockAIAdapter: AIProviderAdapter = {
  async extractEventDetails(_flyerDataUri, _userPrompt, _ctx) {
    // Simulate OCR + LLM processing time
    await delay(2800);
    return { ...MOCK_EXTRACTION };
  },

  async continueEventConversation(userMessage, _ctx) {
    await delay(900 + Math.random() * 600);
    return {
      reply: getMockReply(userMessage),
    };
  },

  async validateExtractedEvent(details) {
    await delay(400);
    const issues: string[] = [];
    if (!details.name) issues.push('Event name is required.');
    if (!details.date) issues.push('Event date is required.');
    if (!details.venue) issues.push('Venue is required.');
    if (!details.contactEmail) issues.push('Contact email is required.');
    return { valid: issues.length === 0, issues };
  },
};
