/**
 * Aram Events — AI Event Agent
 * Provider-independent abstraction types.
 * Keep model-specific code out of UI components.
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  /** Structured extraction payload, only set on assistant messages after flyer analysis */
  extraction?: ExtractedEventDetails;
  /** Whether this message contains a structured review card */
  isReviewCard?: boolean;
}

export interface TicketType {
  name: string;
  price: number;
  currency: string;
  capacity?: number;
  description?: string;
}

export interface ExtractedEventDetails {
  /** Confidence score 0–1 for the overall extraction */
  confidence: number;
  name?: string;
  description?: string;
  category?: string;
  /** One of the event creation form's types, e.g. Conference, Walkathon */
  eventType?: string;
  /** In-person, Virtual or Hybrid */
  format?: string;
  date?: string;          // ISO-8601 date string e.g. "2026-12-15"
  /** Same as `date`; the name the model returns */
  startDate?: string;
  endDate?: string;
  startTime?: string;     // "HH:MM" 24-h
  endTime?: string;
  timezone?: string;      // IANA e.g. "Asia/Kolkata"
  venue?: string;
  address?: string;
  city?: string;
  country?: string;
  capacity?: number;
  registrationOpenDate?: string;
  registrationCloseDate?: string;
  ticketTypes?: TicketType[];
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  tags?: string[];
  /** Fields the AI is uncertain about */
  uncertainFields?: string[];
}

export interface ConversationContext {
  messages: ChatMessage[];
  extractedDetails?: ExtractedEventDetails;
  flyerDataUri?: string;   // base64 data-uri of uploaded flyer
  stage: ConversationStage;
}

export type ConversationStage =
  | 'idle'
  | 'awaiting_flyer'
  | 'extracting'
  | 'reviewing_extraction'
  | 'collecting_details'
  | 'confirming'
  | 'creating_event'
  | 'done';

export interface AIProviderAdapter {
  /** Extract event details from a flyer image + optional prompt */
  extractEventDetails(
    flyerDataUri: string,
    userPrompt: string,
    ctx: ConversationContext,
  ): Promise<ExtractedEventDetails>;

  /** Continue a conversational turn */
  continueEventConversation(
    userMessage: string,
    ctx: ConversationContext,
  ): Promise<{ reply: string; updatedDetails?: Partial<ExtractedEventDetails> }>;

  /** Validate extracted event details and return issues */
  validateExtractedEvent(
    details: ExtractedEventDetails,
  ): Promise<{ valid: boolean; issues: string[] }>;
}
