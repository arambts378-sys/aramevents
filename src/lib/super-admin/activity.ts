export const ACTIVITY_CATEGORIES = [
  'platform',
  'auth',
  'event',
  'website',
  'registration',
  'ticket',
  'check_in',
  'integration',
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
export type ActivityOutcome = 'success' | 'failure' | 'warning';
export type ActivitySeverity = 'info' | 'warning' | 'error';

export const ACTIVITY_ACTIONS = [
  'event.created',
  'event.published',
  'website.saved',
  'website.published',
  'registration.created',
  'registration.failed',
  'ticket.generated',
  'ticket.generation_failed',
  'check_in.allowed',
  'check_in.denied',
  'check_in.failed',
  'integration.delivery_succeeded',
  'integration.delivery_failed',
  'auth.registration_succeeded',
  'auth.registration_failed',
  'auth.verification_succeeded',
  'auth.verification_failed',
  'event.create_failed',
  'event.publish_failed',
  'website.save_failed',
  'website.publish_failed',
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const ACTIVITY_ERROR_CODES = [
  'EVENT_PUBLISH_FAILED',
  'WEBSITE_SAVE_FAILED',
  'WEBSITE_PUBLISH_FAILED',
  'REGISTRATION_FAILED',
  'TICKET_GENERATION_FAILED',
  'CHECK_IN_FAILED',
  'EMAIL_DELIVERY_FAILED',
  'INTEGRATION_DELIVERY_FAILED',
  'AUTH_REGISTRATION_FAILED',
  'AUTH_VERIFICATION_FAILED',
  'AUTH_EMAIL_DELIVERY_FAILED',
  'EVENT_CREATE_FAILED',
] as const;

export type ActivityErrorCode = (typeof ACTIVITY_ERROR_CODES)[number];

export interface ActivityEventInput {
  workspaceId?: string | null;
  actorUserId?: string | null;
  action: ActivityAction;
  resourceType?: string | null;
  resourceId?: string | null;
  outcome: ActivityOutcome;
  errorCode?: ActivityErrorCode | null;
  correlationId: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityEventInsert {
  workspace_id: string | null;
  actor_user_id: string | null;
  category: ActivityCategory;
  action: ActivityAction;
  resource_type: string | null;
  resource_id: string | null;
  outcome: ActivityOutcome;
  severity: ActivitySeverity;
  error_code: ActivityErrorCode | null;
  message: string;
  correlation_id: string;
  metadata: Record<string, string>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOURCE_TYPES = ['event', 'registration', 'qr_credential', 'check_in', 'integration_job'] as const;
const CATEGORY_BY_ACTION: Record<ActivityAction, ActivityCategory> = {
  'event.created': 'event',
  'event.published': 'event',
  'website.saved': 'website',
  'website.published': 'website',
  'registration.created': 'registration',
  'registration.failed': 'registration',
  'ticket.generated': 'ticket',
  'ticket.generation_failed': 'ticket',
  'check_in.allowed': 'check_in',
  'check_in.denied': 'check_in',
  'check_in.failed': 'check_in',
  'integration.delivery_succeeded': 'integration',
  'integration.delivery_failed': 'integration',
  'auth.registration_succeeded': 'auth',
  'auth.registration_failed': 'auth',
  'auth.verification_succeeded': 'auth',
  'auth.verification_failed': 'auth',
  'event.create_failed': 'event',
  'event.publish_failed': 'event',
  'website.save_failed': 'website',
  'website.publish_failed': 'website',
};

const SAFE_MESSAGES: Record<ActivityAction, string> = {
  'event.created': 'Event created.',
  'event.published': 'Event published.',
  'website.saved': 'Event website saved.',
  'website.published': 'Event website published.',
  'registration.created': 'Registration created.',
  'registration.failed': 'Registration failed.',
  'ticket.generated': 'Ticket credential generated.',
  'ticket.generation_failed': 'Ticket credential generation failed.',
  'check_in.allowed': 'Check-in allowed.',
  'check_in.denied': 'Check-in denied.',
  'check_in.failed': 'Check-in operation failed.',
  'integration.delivery_succeeded': 'Integration job completed.',
  'integration.delivery_failed': 'Integration delivery failed.',
  'auth.registration_succeeded': 'Organizer registration completed.',
  'auth.registration_failed': 'Organizer registration failed.',
  'auth.verification_succeeded': 'Organizer verification completed.',
  'auth.verification_failed': 'Organizer verification failed.',
  'event.create_failed': 'Event creation failed.',
  'event.publish_failed': 'Event publishing failed.',
  'website.save_failed': 'Website save failed.',
  'website.publish_failed': 'Website publishing failed.',
};

function validOptionalUuid(value: string | null | undefined): string | null {
  return value && UUID_PATTERN.test(value) ? value : null;
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, string> {
  if (!metadata) return {};
  const result: Record<string, string> = {};
  const allowedValues: Record<string, readonly string[]> = {
    provider: ['email', 'google_sheets', 'whatsapp', 'qr', 'crm', 'webhook', 'other'],
    eventType: ['qr_delivery', 'certificate_delivery', 'registration_confirmed', 'qr_generation', 'other'],
    source: ['organizer_api', 'workspace_action'],
    reasonCode: ['CHECK_IN_UNAUTHORIZED', 'CHECK_IN_INVALID_TOKEN', 'CHECK_IN_ZONE_NOT_FOUND', 'CHECK_IN_REGISTRATION_NOT_FOUND', 'CHECK_IN_DUPLICATE', 'CHECK_IN_DENIED'],
  };

  for (const key of Object.keys(allowedValues)) {
    const value = metadata[key];
    if (typeof value === 'string' && allowedValues[key].includes(value)) {
      result[key] = value;
    }
  }
  return result;
}

export function isActivityUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function resolveActivityCorrelationId(
  requestId: string | null | undefined,
  generateId: () => string,
): string {
  return requestId && isActivityUuid(requestId) ? requestId : generateId();
}

export function sanitizeActivityEvent(input: ActivityEventInput): ActivityEventInsert | null {
  if (
    !ACTIVITY_ACTIONS.includes(input.action) ||
    !['success', 'failure', 'warning'].includes(input.outcome) ||
    !UUID_PATTERN.test(input.correlationId)
  ) {
    return null;
  }

  const severity: ActivitySeverity =
    input.outcome === 'failure' ? 'error' : input.outcome === 'warning' ? 'warning' : 'info';

  return {
    workspace_id: validOptionalUuid(input.workspaceId),
    actor_user_id: validOptionalUuid(input.actorUserId),
    category: CATEGORY_BY_ACTION[input.action],
    action: input.action,
    resource_type:
      input.resourceType && RESOURCE_TYPES.some((type) => type === input.resourceType)
        ? input.resourceType
        : null,
    resource_id: validOptionalUuid(input.resourceId),
    outcome: input.outcome,
    severity,
    error_code:
      input.errorCode && ACTIVITY_ERROR_CODES.includes(input.errorCode) ? input.errorCode : null,
    message: SAFE_MESSAGES[input.action],
    correlation_id: input.correlationId,
    metadata: sanitizeMetadata(input.metadata),
  };
}

export async function insertActivityBestEffort(
  input: ActivityEventInsert,
  insert: (event: ActivityEventInsert) => Promise<{ error: unknown | null }>,
  warn: (message: string) => void = console.warn,
): Promise<boolean> {
  try {
    const { error } = await insert(input);
    if (error) {
      warn('Activity event could not be persisted.');
      return false;
    }
    return true;
  } catch {
    warn('Activity event could not be persisted.');
    return false;
  }
}

export const ACTIVITY_PAGE_SIZE = 25;
export const ACTIVITY_OUTCOMES = ['success', 'failure', 'warning'] as const;
export const ACTIVITY_SEVERITIES = ['info', 'warning', 'error'] as const;

export interface ActivityDirectoryQuery {
  workspaceId: string | null;
  category: ActivityCategory | null;
  action: string | null;
  outcome: ActivityOutcome | null;
  severity: ActivitySeverity | null;
  from: string | null;
  to: string | null;
  correlationId: string | null;
  search: string | null;
  page: number;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function validDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

export function parseActivityDirectoryQuery(params: SearchParams): ActivityDirectoryQuery {
  const categoryValue = first(params.category);
  const outcomeValue = first(params.outcome);
  const severityValue = first(params.severity);
  const rawPage = first(params.page);
  const parsedPage = rawPage && /^\d{1,6}$/.test(rawPage) ? Number(rawPage) : 1;
  let from = validDate(first(params.from));
  let to = validDate(first(params.to));
  if (from && to && from > to) {
    from = null;
    to = null;
  }
  const correlation = first(params.correlation)?.trim() ?? '';
  const workspace = first(params.workspace)?.trim() ?? '';
  const rawSearch = first(params.q)?.trim() ?? '';
  const action = first(params.action)?.trim() ?? '';

  return {
    workspaceId: isActivityUuid(workspace) ? workspace : null,
    category: ACTIVITY_CATEGORIES.find((item) => item === categoryValue) ?? null,
    action: ACTIVITY_ACTIONS.find((item) => item === action) ?? null,
    outcome: ACTIVITY_OUTCOMES.find((item) => item === outcomeValue) ?? null,
    severity: ACTIVITY_SEVERITIES.find((item) => item === severityValue) ?? null,
    from,
    to,
    correlationId: isActivityUuid(correlation) ? correlation : null,
    search: rawSearch ? rawSearch.slice(0, 100) : null,
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 10000) : 1,
  };
}
