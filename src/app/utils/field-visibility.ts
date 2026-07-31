import { FormField } from '../models/field';
import { WorkflowRule } from '../models/workflow-rule';
import { isFieldVisibleViaWorkflows } from './workflow-evaluation';

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

export function getFieldVisibilityHint(
  field: FormField,
  data: Record<string, unknown>,
  allFields: FormField[],
  workflowRules: WorkflowRule[] = []
): string {
  for (const rule of workflowRules.filter((item) => item.enabled)) {
    const showOrHide = rule.nodes.find(
      (node) =>
        (node.type === 'action-show' || node.type === 'action-hide') &&
        node.data.targetFieldId === field.id
    );
    if (!showOrHide) continue;

    const trigger = rule.nodes.find((node) => node.type === 'trigger');
    const condition = rule.nodes.find((node) => node.type === 'condition');
    const triggerField = allFields.find((item) => item.id === trigger?.data.fieldId);

    if (showOrHide.type === 'action-show' && triggerField && condition) {
      const operator = condition.data.operator ?? 'equals';
      const expected = condition.data.value ?? '';
      if (operator === 'equals') {
        return `Select "${triggerField.label}" = "${expected}"`;
      }
      return `Rule "${rule.name}" not met yet`;
    }

    if (showOrHide.type === 'action-hide') {
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
