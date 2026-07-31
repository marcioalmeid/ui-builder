import { FormField, CostBreakdownValue } from '../models/field';
import { WorkflowRule } from '../models/workflow-rule';
import { isFieldVisible } from './field-visibility';

export function validateJobData(
  fields: FormField[],
  data: Record<string, unknown>,
  workflowRules: WorkflowRule[] = []
): string[] {
  const errors: string[] = [];
  const visibleFields = fields.filter((field) =>
    isFieldVisible(field, data, workflowRules)
  );

  for (const field of visibleFields.filter((f) => f.required)) {
    if (field.type === 'section-header') continue;

    if (field.type === 'cost-breakdown') {
      const value = data[field.id] as CostBreakdownValue | undefined;
      const gross = value?.grossBudget;
      if (gross === '' || gross === null || gross === undefined) {
        errors.push(`${field.label}: gross budget is required`);
      }
      continue;
    }

    const value = data[field.id];
    const isEmpty =
      value === '' ||
      value === null ||
      value === undefined ||
      (field.type === 'checkbox' && value === false);

    if (isEmpty) {
      errors.push(`${field.label} is required`);
    }
  }

  return errors;
}

export function buildInitialJobData(fields: FormField[]): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === 'section-header') continue;
    if (field.type === 'checkbox') {
      data[field.id] = false;
    } else if (field.type === 'cost-breakdown') {
      data[field.id] = {
        grossBudget: '',
        managementFeePercent: field.managementFeePercent ?? 15,
        additionalFees: [],
      };
    } else {
      data[field.id] = '';
    }
  }
  return data;
}
