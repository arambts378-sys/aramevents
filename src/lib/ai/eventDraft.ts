import { z } from 'zod';

/** Event types and formats the event creation form accepts (src/app/app/events/new/page.tsx). */
export const EVENT_TYPES = [
  'Conference',
  'Corporate Event',
  'Workshop',
  'Exhibition',
  'Summit',
  'Networking',
  'Training',
  'Walkathon',
  'Other',
] as const;

export const EVENT_FORMATS = ['In-person', 'Virtual', 'Hybrid'] as const;

/**
 * What the model returns on every turn: a short reply plus the full current draft.
 * Every field is nullable because structured outputs require all keys to be present.
 */
export const AgentTurnSchema = z.object({
  reply: z.string(),
  details: z.object({
    name: z.string().nullable(),
    description: z.string().nullable(),
    eventType: z.enum(EVENT_TYPES).nullable(),
    format: z.enum(EVENT_FORMATS).nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    startTime: z.string().nullable(),
    endTime: z.string().nullable(),
    timezone: z.string().nullable(),
    venue: z.string().nullable(),
    city: z.string().nullable(),
    capacity: z.number().int().nullable(),
    contactEmail: z.string().nullable(),
    ticketTypes: z.array(
      z.object({
        name: z.string(),
        price: z.number(),
        currency: z.string(),
        capacity: z.number().int().nullable(),
        description: z.string().nullable(),
      })
    ),
    uncertainFields: z.array(z.string()),
    confidence: z.number(),
  }),
});

export type AgentTurn = z.infer<typeof AgentTurnSchema>;
