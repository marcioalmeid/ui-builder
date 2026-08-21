import { FormField } from '../models/field';
import { WorkflowEmittedEvent } from '../models/workflow-event';
import {
  WorkflowConditionOperator,
  WorkflowNode,
  WorkflowRule,
} from '../models/workflow-rule';
import {
  EVENT_CATALOG,
  EventCatalogItem,
  EventCatalogKind,
  resolveEventKind,
  resolveEventName,
} from '../catalog/event-catalog.items';

export interface WorkflowEvaluationContext {
  fields?: FormField[];
  templateId?: string;
  templateVersion?: number;
  emittedAt?: number;
}

export interface WorkflowEvaluationResult {
  shownFieldIds: Set<string>;
  hiddenFieldIds: Set<string>;
  events: WorkflowEmittedEvent[];
}

function resolveCatalogItem(node: WorkflowNode): EventCatalogItem | undefined {
  const catalogId = node.data.eventCatalogId?.trim();
  if (catalogId) {
    return EVENT_CATALOG.find((entry) => entry.id === catalogId);
  }
  const eventName = node.data.eventName?.trim();
  if (!eventName) return undefined;
  return EVENT_CATALOG.find(
    (entry) => resolveEventName(entry) === eventName || entry.id === eventName
  );
}

function resolveNodeEventName(node: WorkflowNode): string {
  const item = resolveCatalogItem(node);
  if (item) return resolveEventName(item);
  return node.data.eventName?.trim() ?? '';
}

function resolveNodeEventKind(node: WorkflowNode): EventCatalogKind {
  const item = resolveCatalogItem(node);
  return item ? resolveEventKind(item) : 'signal';
}

/** Replace `{{token}}` placeholders with values from the template map. */
function applyTemplate(input: string, vars: Record<string, string>): string {
  return input.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => vars[key] ?? '');
}

function buildTemplateVars(
  rule: WorkflowRule,
  triggerFieldId: string,
  triggerLabel: string,
  data: Record<string, unknown>
): Record<string, string> {
  const vars: Record<string, string> = {
    ruleName: rule.name,
    ruleId: rule.id,
    triggerFieldId,
    triggerLabel,
    triggerValue: String(data[triggerFieldId] ?? ''),
  };
  for (const [fieldId, value] of Object.entries(data)) {
    vars[fieldId] = String(value ?? '');
  }
  return vars;
}

function buildEventPayload(
  node: WorkflowNode,
  rule: WorkflowRule,
  triggerFieldId: string,
  triggerLabel: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  const item = resolveCatalogItem(node);
  const kind = item ? resolveEventKind(item) : 'signal';
  const vars = buildTemplateVars(rule, triggerFieldId, triggerLabel, data);
  const config = node.data.eventConfig;
  const payload: Record<string, unknown> = { kind };

  if (item?.includeFieldIds?.length) {
    const fields: Record<string, unknown> = {};
    for (const fieldId of item.includeFieldIds) {
      fields[fieldId] = data[fieldId];
    }
    payload['fields'] = fields;
  }

  if (kind === 'email') {
    const email = {
      to: config?.email?.to ?? item?.email?.to ?? '',
      subject: config?.email?.subject ?? item?.email?.subject ?? '',
      body: config?.email?.body ?? item?.email?.body ?? '',
    };
    payload['email'] = {
      to: applyTemplate(email.to, vars),
      subject: applyTemplate(email.subject, vars),
      body: applyTemplate(email.body, vars),
    };
  }

  if (kind === 'api') {
    const api = {
      url: config?.api?.url ?? item?.api?.url ?? '',
      method: config?.api?.method ?? item?.api?.method ?? 'POST',
      body: { ...(item?.api?.body ?? {}), ...(config?.api?.body ?? {}) },
    };
    const body: Record<string, string> = {};
    for (const [key, value] of Object.entries(api.body)) {
      body[key] = applyTemplate(value, vars);
    }
    payload['api'] = {
      url: applyTemplate(api.url, vars),
      method: api.method,
      body,
    };
  }

  return payload;
}

function isEmptyValue(value: unknown): boolean {
  return value === '' || value === null || value === undefined || value === false;
}

function evaluateCondition(
  node: WorkflowNode,
  triggerFieldId: string,
  data: Record<string, unknown>
): boolean {
  const operator = (node.data.operator ?? 'equals') as WorkflowConditionOperator;
  const value = data[triggerFieldId];
  const expected = node.data.value ?? '';

  switch (operator) {
    case 'notEmpty':
      return !isEmptyValue(value);
    case 'isEmpty':
      return isEmptyValue(value);
    case 'isTrue':
      return value === true;
    case 'isFalse':
      return value === false || isEmptyValue(value);
    case 'notEquals':
      return String(value ?? '') !== expected;
    case 'contains':
      return String(value ?? '')
        .toLowerCase()
        .includes(expected.toLowerCase());
    case 'greaterThan': {
      const left = Number(value);
      const right = Number(expected);
      if (Number.isNaN(left) || Number.isNaN(right)) return false;
      return left > right;
    }
    case 'lessThan': {
      const left = Number(value);
      const right = Number(expected);
      if (Number.isNaN(left) || Number.isNaN(right)) return false;
      return left < right;
    }
    case 'equals':
    default:
      if (typeof value === 'boolean') {
        return String(value) === expected || (value && expected === 'true') || (!value && expected === 'false');
      }
      return String(value ?? '') === expected;
  }
}

function getOrderedChain(rule: WorkflowRule): WorkflowNode[] {
  const trigger = rule.nodes.find((node) => node.type === 'trigger');
  if (!trigger) return [];

  const chain: WorkflowNode[] = [trigger];
  let currentId = trigger.id;

  while (true) {
    const edge = rule.edges.find((item) => item.source === currentId);
    if (!edge) break;
    const next = rule.nodes.find((node) => node.id === edge.target);
    if (!next) break;
    chain.push(next);
    currentId = next.id;
  }

  return chain;
}

function buildEmittedEvent(
  rule: WorkflowRule,
  triggerFieldId: string,
  chain: WorkflowNode[],
  node: WorkflowNode,
  data: Record<string, unknown>,
  context?: WorkflowEvaluationContext
): WorkflowEmittedEvent {
  const triggerField = context?.fields?.find((field) => field.id === triggerFieldId);
  const conditionNode = chain.find((item) => item.type === 'condition');
  const emittedAt = context?.emittedAt ?? Date.now();
  const triggerLabel = triggerField?.label ?? triggerFieldId;

  return {
    eventName: resolveNodeEventName(node),
    kind: resolveNodeEventKind(node),
    ruleId: rule.id,
    ruleName: rule.name,
    templateId: context?.templateId,
    templateVersion: context?.templateVersion,
    trigger: {
      fieldId: triggerFieldId,
      label: triggerLabel,
      value: data[triggerFieldId],
    },
    condition: conditionNode
      ? {
          operator: (conditionNode.data.operator ?? 'equals') as WorkflowConditionOperator,
          value: conditionNode.data.value ?? '',
        }
      : undefined,
    payload: buildEventPayload(node, rule, triggerFieldId, triggerLabel, data),
    timestamp: new Date(emittedAt).toISOString(),
  };
}

export function evaluateWorkflowRules(
  rules: WorkflowRule[],
  data: Record<string, unknown>,
  context?: WorkflowEvaluationContext
): WorkflowEvaluationResult {
  const shownFieldIds = new Set<string>();
  const hiddenFieldIds = new Set<string>();
  const events: WorkflowEmittedEvent[] = [];

  for (const rule of rules.filter((item) => item.enabled)) {
    const chain = getOrderedChain(rule);
    const trigger = chain.find((node) => node.type === 'trigger');
    if (!trigger?.data?.fieldId) continue;

    const triggerFieldId = trigger.data.fieldId;
    let conditionPassed = true;

    for (const node of chain) {
      if (node.type === 'condition') {
        conditionPassed = evaluateCondition(node, triggerFieldId, data);
        if (!conditionPassed) break;
      }

      if (!conditionPassed) continue;

      if (node.type === 'action-show' && node.data.targetFieldId) {
        shownFieldIds.add(node.data.targetFieldId);
        hiddenFieldIds.delete(node.data.targetFieldId);
      }

      if (node.type === 'action-hide' && node.data.targetFieldId) {
        hiddenFieldIds.add(node.data.targetFieldId);
        shownFieldIds.delete(node.data.targetFieldId);
      }

      if (node.type === 'action-event' && resolveNodeEventName(node)) {
        events.push(
          buildEmittedEvent(rule, triggerFieldId, chain, node, data, context)
        );
      }
    }
  }

  return { shownFieldIds, hiddenFieldIds, events };
}

export function getWorkflowEmittedEvents(
  rules: WorkflowRule[],
  data: Record<string, unknown>,
  context: WorkflowEvaluationContext
): WorkflowEmittedEvent[] {
  return evaluateWorkflowRules(
    rules.filter((rule) => rule.enabled),
    data,
    context
  ).events;
}

export function formatWorkflowEventSummary(event: WorkflowEmittedEvent): string {
  const triggerValue =
    event.trigger.value === '' || event.trigger.value == null
      ? '(empty)'
      : String(event.trigger.value);
  const trigger = `${event.trigger.label} = ${triggerValue}`;

  if (event.kind === 'email') {
    const to = (event.payload['email'] as { to?: string } | undefined)?.to;
    return to ? `email → ${to} · ${trigger}` : `email · ${trigger}`;
  }
  if (event.kind === 'api') {
    const api = event.payload['api'] as { method?: string; url?: string } | undefined;
    if (api?.method && api?.url) {
      return `${api.method} ${api.url} · ${trigger}`;
    }
    return `api · ${trigger}`;
  }

  return trigger;
}

export function isShowTargetField(
  fieldId: string,
  rules: WorkflowRule[]
): boolean {
  return rules.some((rule) =>
    rule.enabled &&
    rule.nodes.some(
      (node) => node.type === 'action-show' && node.data.targetFieldId === fieldId
    )
  );
}

export function isHideTargetField(
  fieldId: string,
  rules: WorkflowRule[]
): boolean {
  return rules.some((rule) =>
    rule.enabled &&
    rule.nodes.some(
      (node) => node.type === 'action-hide' && node.data.targetFieldId === fieldId
    )
  );
}

export function isFieldVisibleViaWorkflows(
  fieldId: string,
  rules: WorkflowRule[],
  data: Record<string, unknown>
): boolean | undefined {
  const enabledRules = rules.filter((rule) => rule.enabled);
  const result = evaluateWorkflowRules(enabledRules, data);

  if (result.hiddenFieldIds.has(fieldId)) return false;
  if (result.shownFieldIds.has(fieldId)) return true;

  // Show targets start hidden until their rule condition passes.
  if (isShowTargetField(fieldId, enabledRules)) return false;

  // Hide targets stay visible until a hide action actually runs.
  return undefined;
}

export function countWorkflowRulesForField(
  fieldId: string,
  rules: WorkflowRule[]
): number {
  return rules.filter((rule) =>
    rule.nodes.some(
      (node) =>
        node.data.fieldId === fieldId ||
        node.data.targetFieldId === fieldId
    )
  ).length;
}

export function getWorkflowSummary(rules: WorkflowRule[], fields: FormField[]): string {
  if (rules.length === 0) return 'No automation rules yet';

  const enabled = rules.filter((rule) => rule.enabled).length;
  const actionCount = rules.reduce(
    (count, rule) =>
      count +
      rule.nodes.filter(
        (node) =>
          node.type === 'action-show' ||
          node.type === 'action-hide' ||
          node.type === 'action-event'
      ).length,
    0
  );

  return `${enabled} rule(s) · ${actionCount} action(s) · ${fields.length} field(s)`;
}
