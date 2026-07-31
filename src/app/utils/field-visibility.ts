import { FormField } from '../models/field';
import { WorkflowRule } from '../models/workflow-rule';
import {
  evaluateWorkflowRules,
  isFieldVisibleViaWorkflows,
} from './workflow-evaluation';

export interface HiddenFieldHint {
  fieldId: string;
  label: string;
  reason: string;
}

export function isFieldVisible(
  field: FormField,
  data: Record<string, unknown>,
  workflowRules: WorkflowRule[] = []
): boolean {
  const workflowVisible = isFieldVisibleViaWorkflows(field.id, workflowRules, data);
  if (workflowVisible !== undefined) {
    return workflowVisible;
  }
  return true;
}

function describeRuleCondition(
  rule: WorkflowRule,
  allFields: FormField[]
): string | null {
  const trigger = rule.nodes.find((node) => node.type === 'trigger');
  const condition = rule.nodes.find((node) => node.type === 'condition');
  const triggerField = allFields.find((item) => item.id === trigger?.data.fieldId);

  if (!triggerField || !condition) {
    return null;
  }

  const operator = condition.data.operator ?? 'equals';
  const expected = condition.data.value ?? '';
  if (operator === 'equals') {
    return `"${triggerField.label}" = "${expected}"`;
  }

  return `rule "${rule.name}" condition`;
}

export function getFieldVisibilityHint(
  field: FormField,
  data: Record<string, unknown>,
  allFields: FormField[],
  workflowRules: WorkflowRule[] = []
): string {
  const enabledRules = workflowRules.filter((item) => item.enabled);
  const evaluation = evaluateWorkflowRules(enabledRules, data);

  for (const rule of enabledRules) {
    const action = rule.nodes.find(
      (node) =>
        (node.type === 'action-show' || node.type === 'action-hide') &&
        node.data.targetFieldId === field.id
    );
    if (!action) continue;

    const conditionHint = describeRuleCondition(rule, allFields);

    if (action.type === 'action-show') {
      if (conditionHint) {
        return `Select ${conditionHint}`;
      }
      return `Shown by rule "${rule.name}" when its condition is met`;
    }

    if (
      action.type === 'action-hide' &&
      evaluation.hiddenFieldIds.has(field.id)
    ) {
      if (conditionHint) {
        return `Hidden because ${conditionHint} (rule "${rule.name}")`;
      }
      return `Hidden by rule "${rule.name}"`;
    }
  }

  return 'Hidden until a rule condition is met';
}

export function getHiddenFieldHints(
  fields: FormField[],
  data: Record<string, unknown>,
  workflowRules: WorkflowRule[] = []
): HiddenFieldHint[] {
  return fields
    .filter((field) => !isFieldVisible(field, data, workflowRules))
    .map((field) => ({
      fieldId: field.id,
      label: field.label,
      reason: getFieldVisibilityHint(field, data, fields, workflowRules),
    }));
}

export function isInputField(field: FormField): boolean {
  return field.type !== 'section-header';
}

export function isLayoutField(field: FormField): boolean {
  return field.type === 'section-header';
}

export function isCompositeField(field: FormField): boolean {
  return field.type === 'cost-breakdown';
}
