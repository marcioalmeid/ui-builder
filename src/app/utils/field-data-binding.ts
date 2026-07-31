import { FormField } from '../models/field';

export type DataBindingMode = 'options' | 'entity-map' | 'line-items' | 'label';

export function getDataBindingMode(fieldType: string): DataBindingMode {
  switch (fieldType) {
    case 'dropdown':
    case 'radio':
      return 'options';
    case 'text':
    case 'textarea':
    case 'datepicker':
    case 'checkbox':
      return 'entity-map';
    case 'cost-breakdown':
      return 'line-items';
    case 'section-header':
      return 'label';
    default:
      return 'entity-map';
  }
}

export function supportsDataBinding(field: FormField): boolean {
  return Boolean(getDataBindingMode(field.type));
}

export function usesApiDataSource(field: FormField): boolean {
  return field.optionsSource === 'api';
}

export function hasEntityMapping(field: FormField): boolean {
  return Boolean(field.entityMapping?.catalogId);
}

export function isEntityMappingConfigured(field: FormField): boolean {
  const mapping = field.entityMapping;
  if (!mapping?.catalogId) return true;
  return Boolean(mapping.entityFieldKey);
}

export function isOptionField(field: FormField): boolean {
  return getDataBindingMode(field.type) === 'options';
}

export function isFieldBindingConfigured(field: FormField): boolean {
  const mode = getDataBindingMode(field.type);
  if (mode === 'entity-map') {
    return isEntityMappingConfigured(field);
  }
  if (mode === 'options' || mode === 'line-items' || mode === 'label') {
    if (!usesApiDataSource(field)) return true;
    if (field.dataBindingId) return true;
    return Boolean(field.dataSource?.url?.trim());
  }
  return true;
}

export interface FieldConnectionBadge {
  complete: boolean;
  icon: string;
  label: string;
}

export function getFieldConnectionBadge(
  field: FormField,
  catalogName?: string
): FieldConnectionBadge | null {
  if (hasEntityMapping(field)) {
    const mapping = field.entityMapping!;
    const complete = isEntityMappingConfigured(field);
    const entityLabel = catalogName ?? mapping.catalogId;
    return {
      complete,
      icon: complete ? 'link' : 'link_off',
      label: complete
        ? `Entity · ${entityLabel}.${mapping.entityFieldKey}`
        : `Entity mapping incomplete · ${entityLabel}`,
    };
  }

  if (field.dataBindingId) {
    return {
      complete: isFieldBindingConfigured(field),
      icon: 'hub',
      label: catalogName
        ? `Shared list · ${catalogName}`
        : 'Shared option list',
    };
  }

  if (usesApiDataSource(field)) {
    const complete = isFieldBindingConfigured(field);
    return {
      complete,
      icon: complete ? 'cloud_done' : 'cloud_off',
      label: catalogName
        ? `Catalog · ${catalogName}`
        : complete
          ? 'Catalog connected'
          : 'Catalog source missing',
    };
  }

  return null;
}

export function isFieldConnected(field: FormField): boolean {
  return getFieldConnectionBadge(field) !== null;
}
