import { FormField } from '../models/field';
import {
  getDataBindingMode,
  hasEntityMapping,
  isFieldBindingConfigured,
  isOptionField,
  requiresDataConnection,
  usesApiDataSource,
} from './field-data-binding';

export interface FieldIssue {
  severity: 'error' | 'warning';
  message: string;
}

export function getFieldIssues(field: FormField): FieldIssue[] {
  const issues: FieldIssue[] = [];

  if (field.type === 'section-header' || field.type === 'button') {
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
  } else if (
    getDataBindingMode(field.type) === 'entity-map' &&
    !isFieldBindingConfigured(field)
  ) {
    issues.push({ severity: 'error', message: 'Not connected to data' });
  }

  if (usesApiDataSource(field) && !isFieldBindingConfigured(field)) {
    issues.push({ severity: 'error', message: 'Catalog source not configured' });
  }

  if (getDataBindingMode(field.type) === 'line-items' && !isFieldBindingConfigured(field)) {
    issues.push({ severity: 'error', message: 'Catalog source not configured' });
  }

  if (isOptionField(field)) {
    if (!isFieldBindingConfigured(field)) {
      issues.push({
        severity: 'error',
        message: usesApiDataSource(field)
          ? 'Catalog source not configured'
          : 'No options defined',
      });
    }
  }

  return issues;
}

export function hasFieldErrors(field: FormField): boolean {
  return getFieldIssues(field).some((i) => i.severity === 'error');
}
