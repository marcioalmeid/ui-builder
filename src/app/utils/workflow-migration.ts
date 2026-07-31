import { FormRow } from '../models/form';
import { FieldVisibilityRule, FormField } from '../models/field';
import {
  WorkflowConditionOperator,
  WorkflowEdge,
  WorkflowNode,
  WorkflowRule,
} from '../models/workflow-rule';
import { getAllFields } from './template-readiness';

export interface VisibilityMigrationResult {
  rows: FormRow[];
  rules: WorkflowRule[];
  changed: boolean;
}

function visibilityRuleKey(rule: FieldVisibilityRule): string {
  return `${rule.fieldId}|${rule.operator}|${rule.value ?? ''}`;
}

function triggerLabel(fields: FormField[], fieldId: string): string {
  return fields.find((field) => field.id === fieldId)?.label ?? 'field';
}

export function createShowFieldsWorkflowRule(
  name: string,
  triggerFieldId: string,
  operator: WorkflowConditionOperator,
  value: string,
  targetFieldIds: string[]
): WorkflowRule {
  const triggerId = crypto.randomUUID();
  const conditionId = crypto.randomUUID();

  const nodes: WorkflowNode[] = [
    {
      id: triggerId,
      type: 'trigger',
      position: { x: 0, y: 0 },
      data: { fieldId: triggerFieldId },
    },
    {
      id: conditionId,
      type: 'condition',
      position: { x: 220, y: 0 },
      data: { operator, value },
    },
  ];

  const edges: WorkflowEdge[] = [
    { id: crypto.randomUUID(), source: triggerId, target: conditionId },
  ];

  let previousNodeId = conditionId;
  let x = 440;

  for (const targetFieldId of targetFieldIds) {
    const actionId = crypto.randomUUID();
    nodes.push({
      id: actionId,
      type: 'action-show',
      position: { x, y: 0 },
      data: { targetFieldId },
    });
    edges.push({ id: crypto.randomUUID(), source: previousNodeId, target: actionId });
    previousNodeId = actionId;
    x += 220;
  }

  return {
    id: crypto.randomUUID(),
    name,
    enabled: true,
    nodes,
    edges,
  };
}

function buildRuleName(
  visibility: FieldVisibilityRule,
  targetFieldIds: string[],
  fields: FormField[]
): string {
  const trigger = triggerLabel(fields, visibility.fieldId);
  if (targetFieldIds.length === 1) {
    const target = triggerLabel(fields, targetFieldIds[0]);
    return `Show ${target} when ${trigger} matches`;
  }
  return `Show ${targetFieldIds.length} fields when ${trigger} matches`;
}

export function migrateLegacyVisibilityRules(
  rows: FormRow[],
  workflowRules: WorkflowRule[]
): VisibilityMigrationResult {
  const fields = getAllFields(rows);
  const grouped = new Map<string, { rule: FieldVisibilityRule; targetFieldIds: string[] }>();

  for (const field of fields) {
    if (!field.visibilityRule?.fieldId) continue;

    const key = visibilityRuleKey(field.visibilityRule);
    const entry = grouped.get(key) ?? {
      rule: field.visibilityRule,
      targetFieldIds: [],
    };
    entry.targetFieldIds.push(field.id);
    grouped.set(key, entry);
  }

  if (grouped.size === 0) {
    return { rows, rules: workflowRules, changed: false };
  }

  const nextRows = structuredClone(rows);
  const nextRules = [...workflowRules];

  for (const { rule, targetFieldIds } of grouped.values()) {
    nextRules.push(
      createShowFieldsWorkflowRule(
        buildRuleName(rule, targetFieldIds, fields),
        rule.fieldId,
        rule.operator,
        rule.value ?? '',
        targetFieldIds
      )
    );
  }

  for (const row of nextRows) {
    for (const field of row.fields) {
      delete field.visibilityRule;
    }
  }

  return { rows: nextRows, rules: nextRules, changed: true };
}
