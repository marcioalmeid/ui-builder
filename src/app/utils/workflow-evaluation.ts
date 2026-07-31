import { FormField } from '../models/field';
import {
  WorkflowConditionOperator,
  WorkflowNode,
  WorkflowRule,
} from '../models/workflow-rule';

export interface WorkflowEvaluationResult {
  shownFieldIds: Set<string>;
  hiddenFieldIds: Set<string>;
  events: Array<{ ruleId: string; ruleName: string; eventName: string }>;
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

export function evaluateWorkflowRules(
  rules: WorkflowRule[],
  data: Record<string, unknown>
): WorkflowEvaluationResult {
  const shownFieldIds = new Set<string>();
  const hiddenFieldIds = new Set<string>();
  const events: WorkflowEvaluationResult['events'] = [];

  for (const rule of rules.filter((item) => item.enabled)) {
    const chain = getOrderedChain(rule);
    const trigger = chain.find((node) => node.type === 'trigger');
    if (!trigger?.data.fieldId) continue;

    let conditionPassed = true;

    for (const node of chain) {
      if (node.type === 'condition') {
        conditionPassed = evaluateCondition(node, trigger.data.fieldId, data);
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

      if (node.type === 'action-event' && node.data.eventName?.trim()) {
        events.push({
          ruleId: rule.id,
          ruleName: rule.name,
          eventName: node.data.eventName.trim(),
        });
      }
    }
  }

  return { shownFieldIds, hiddenFieldIds, events };
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
