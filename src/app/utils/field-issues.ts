import { FormField } from '../models/field';
import {
  hasEntityMapping,
  isFieldBindingConfigured,
  isOptionField,
  usesApiDataSource,
} from './field-data-binding';

export interface FieldIssue {
  severity: 'error' | 'warning';
  message: string;
}

export function getFieldIssues(field: FormField): FieldIssue[] {
  const issues: FieldIssue[] = [];

  if (field.type === 'section-header') {
    if (!field.label?.trim()) {
      issues.push({ severity: 'error', message: 'Missing label' });
    }
    return issues;
  }

  if (!field.label?.trim()) {
    issues.push({ severity: 'error', message: 'Missing label' });
  }

  if (hasEntityMapping(field) && !isFieldBindingConfigured(field)) {
    issues.push({ severity: 'error', message: 'Entity field not selected' });
  }

  if (usesApiDataSource(field) && !isFieldBindingConfigured(field)) {
    issues.push({ severity: 'error', message: 'Catalog source not configured' });
  }

  if (isOptionField(field)) {
    if (!usesApiDataSource(field) && !(field.options?.length ?? 0)) {
      issues.push({ severity: 'warning', message: 'No options defined' });
    }
  }

  if (field.visibilityRule && !field.visibilityRule.fieldId) {
    issues.push({ severity: 'warning', message: 'Incomplete visibility rule' });
  }

  return issues;
}

export function hasFieldErrors(field: FormField): boolean {
  return getFieldIssues(field).some((i) => i.severity === 'error');
}
