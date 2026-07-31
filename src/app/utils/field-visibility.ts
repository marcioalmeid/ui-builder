import { FormField } from '../models/field';
import { WorkflowRule } from '../models/workflow-rule';
import { isFieldVisibleViaWorkflows } from './workflow-evaluation';

function isFieldVisibleByLegacyRule(
  field: FormField,
  data: Record<string, unknown>
): boolean {
  const rule = field.visibilityRule;
  if (!rule) return true;

  const value = data[rule.fieldId];
  if (rule.operator === 'equals') {
    return String(value ?? '') === (rule.value ?? '');
  }
  if (rule.operator === 'notEmpty') {
    return value !== '' && value !== null && value !== undefined;
  }
  return true;
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

  return isFieldVisibleByLegacyRule(field, data);
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
