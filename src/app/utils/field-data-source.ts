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

function clearCatalogSource(field: FormField): FormField {
  return {
    ...field,
    optionsSource: 'static',
    dataCatalogId: undefined,
    dataSource: undefined,
    dataBindingId: undefined,
  };
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

  if (data.dataBindingId) {
    updated.optionsSource = 'api';
    updated.entityMapping = undefined;
    // Keep catalog metadata when the shared list provides it.
    if (!('dataCatalogId' in data)) {
      updated.dataCatalogId = undefined;
    }
    return updated;
  }

  if (data.dataCatalogId || (data.optionsSource === 'api' && data.dataSource)) {
    updated.optionsSource = 'api';
    updated.dataBindingId = undefined;
    updated.entityMapping = undefined;
    return updated;
  }

  return updated;
}

export function mergeFieldUpdate(
  field: FormField,
  data: Partial<FormField>
): FormField {
  if ('entityMapping' in data) {
    if (!data.entityMapping?.catalogId) {
      return { ...field, entityMapping: undefined };
    }

    return clearCatalogSource({
      ...field,
      entityMapping: {
        catalogId: data.entityMapping.catalogId,
        entityFieldKey: data.entityMapping.entityFieldKey ?? '',
      },
    });
  }

  return mergeFieldDataSourceUpdate(field, data);
}
