/** What a catalog event asks a downstream consumer to do. */
export type EventCatalogKind = 'signal' | 'email' | 'api';

export const EVENT_KIND_META: Record<
  EventCatalogKind,
  { label: string; icon: string; description: string }
> = {
  signal: {
    label: 'Signal',
    icon: 'sensors',
    description: 'Notify listeners; no side effect by itself',
  },
  email: {
    label: 'Email',
    icon: 'mail',
    description: 'Ask a consumer to send an email',
  },
  api: {
    label: 'API call',
    icon: 'api',
    description: 'Ask a consumer to invoke an HTTP endpoint',
  },
};

/** Default email intent shipped with the catalog item. */
export interface EventEmailDefaults {
  /** Static address or {{fieldId}} placeholder. */
  to?: string;
  subject?: string;
  /** Optional body template; may include {{fieldId}} placeholders. */
  body?: string;
}

/** Default HTTP intent shipped with the catalog item. */
export interface EventApiDefaults {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON body template keys; values may use {{fieldId}}. */
  body?: Record<string, string>;
}

export interface EventCatalogItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  contexts?: string[];
  /** Wire name emitted at runtime (defaults to `id` when omitted). */
  eventName?: string;
  /** Downstream action kind. Defaults to `signal`. */
  kind?: EventCatalogKind;
  email?: EventEmailDefaults;
  api?: EventApiDefaults;
  /**
   * Field ids whose current values are copied into the emitted payload
   * (in addition to the automatic trigger context).
   */
  includeFieldIds?: string[];
}

/** Catalog events available in the rules emit picker. */
export const EVENT_CATALOG: EventCatalogItem[] = [
  {
    id: 'field.updated',
    name: 'Field updated',
    description: 'Generic signal that a watched field changed and matched a rule',
    icon: 'edit_note',
    category: 'General',
    contexts: ['general', 'advertising', 'print', 'social'],
    kind: 'signal',
  },
  {
    id: 'task.ready',
    name: 'Task ready',
    description: 'Task met the conditions to move forward in the workflow',
    icon: 'task_alt',
    category: 'Tasks',
    contexts: ['general', 'advertising', 'print', 'social'],
    kind: 'signal',
  },
  {
    id: 'campaign.type.selected',
    name: 'Campaign type selected',
    description: 'Operator chose a digital advertising / campaign task type',
    icon: 'campaign',
    category: 'Campaign',
    contexts: ['advertising'],
    kind: 'signal',
  },
  {
    id: 'budget.change.requested',
    name: 'Budget change requested',
    description: 'Operator requested a budget change on the campaign',
    icon: 'payments',
    category: 'Budget',
    contexts: ['advertising'],
    kind: 'signal',
  },
  {
    id: 'vendor.assigned',
    name: 'Vendor assigned',
    description: 'An external vendor was selected for the media buy',
    icon: 'store',
    category: 'Vendors',
    contexts: ['advertising'],
    kind: 'signal',
  },
  {
    id: 'platform.selected',
    name: 'Platform selected',
    description: 'Campaign platform(s) were chosen',
    icon: 'devices',
    category: 'Campaign',
    contexts: ['advertising'],
    kind: 'signal',
  },
  {
    id: 'notify.ops.email',
    name: 'Email operations',
    description: 'Ask the backend to email the ops team about this match',
    icon: 'mail',
    category: 'Integrations',
    contexts: ['general', 'advertising', 'print', 'social'],
    kind: 'email',
    email: {
      to: 'ops@example.com',
      subject: 'Workflow match: {{ruleName}}',
      body: 'Rule matched on field {{triggerLabel}} = {{triggerValue}}',
    },
  },
  {
    id: 'webhook.task.sync',
    name: 'Sync task via API',
    description: 'Ask the backend to POST this match to an integration webhook',
    icon: 'api',
    category: 'Integrations',
    contexts: ['general', 'advertising', 'print', 'social'],
    kind: 'api',
    api: {
      url: '/api/integrations/task-sync',
      method: 'POST',
      body: {
        event: 'task.sync',
        ruleName: '{{ruleName}}',
      },
    },
  },
];

export function resolveEventName(item: EventCatalogItem): string {
  return item.eventName?.trim() || item.id;
}

export function resolveEventKind(item: EventCatalogItem): EventCatalogKind {
  return item.kind ?? 'signal';
}
