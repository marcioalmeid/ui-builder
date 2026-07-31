import { FormField } from '../models/field';

export type FieldDataSourceKind = 'static' | 'catalog' | 'binding';

export function resolveFieldDataSourceKind(field: FormField): FieldDataSourceKind {
  if (field.dataBindingId) {
    return 'binding';
  }
  if (field.optionsSource === 'api' && field.dataCatalogId) {
    return 'catalog';
  }
  if (field.optionsSource === 'api' && field.dataSource?.url) {
    return 'catalog';
  }
  return 'static';
}

export function mergeFieldDataSourceUpdate(
  field: FormField,
  data: Partial<FormField>
): FormField {
  const updated: FormField = { ...field, ...data };

  if (data.optionsSource === 'static') {
    updated.optionsSource = 'static';
    updated.dataCatalogId = undefined;
    updated.dataSource = undefined;
    updated.dataBindingId = undefined;
    return updated;
  }

  if (data.dataCatalogId || (data.optionsSource === 'api' && data.dataSource && !data.dataBindingId)) {
    updated.optionsSource = 'api';
    updated.dataBindingId = undefined;
    return updated;
  }

  if (data.dataBindingId) {
    updated.optionsSource = 'api';
    updated.dataCatalogId = undefined;
    return updated;
  }

  return updated;
}
