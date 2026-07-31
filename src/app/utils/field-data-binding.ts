import { FormField } from '../models/field';
import { EntityFieldDefinition } from '../models/entity-field';
import { formatEntityMappingPath } from './entity-field-compat';

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

export function requiresDataConnection(field: FormField): boolean {
  return getDataBindingMode(field.type) !== 'label';
}

export function supportsDataBinding(field: FormField): boolean {
  return requiresDataConnection(field);
}

export function usesApiDataSource(field: FormField): boolean {
  return field.optionsSource === 'api';
}

export function hasEntityMapping(field: FormField): boolean {
  return Boolean(field.entityMapping?.catalogId);
}

export function isEntityMappingConfigured(field: FormField): boolean {
  const mapping = field.entityMapping;
  return Boolean(mapping?.catalogId && mapping.entityFieldKey);
}

export function isOptionField(field: FormField): boolean {
  return getDataBindingMode(field.type) === 'options';
}

export function isFieldBindingConfigured(field: FormField): boolean {
  const mode = getDataBindingMode(field.type);
  if (mode === 'label') {
    return true;
  }
  if (mode === 'entity-map') {
    return isEntityMappingConfigured(field);
  }
  if (mode === 'options') {
    if (usesApiDataSource(field)) {
      if (field.dataBindingId) return true;
      return Boolean(field.dataSource?.url?.trim());
    }
    return (field.options?.length ?? 0) > 0;
  }
  if (mode === 'line-items') {
    if (field.dataBindingId) return true;
    return Boolean(field.dataCatalogId && field.dataSource?.url?.trim());
  }
  return true;
}

export function getFieldDataConnectionError(field: FormField): string | null {
  if (!requiresDataConnection(field) || isFieldBindingConfigured(field)) {
    return null;
  }

  const mode = getDataBindingMode(field.type);
  if (mode === 'entity-map') {
    if (hasEntityMapping(field)) {
      return `"${field.label}" entity mapping is incomplete. Select an entity field.`;
    }
    return `"${field.label}" is not connected. Map it to an entity field in the Data step.`;
  }
  if (mode === 'options') {
    if (usesApiDataSource(field)) {
      return `"${field.label}" is set to Catalog but has no data source. Pick a catalog item or use Shared data bindings.`;
    }
    return `"${field.label}" has no options. Add static options or connect a catalog source.`;
  }
  if (mode === 'line-items') {
    return `"${field.label}" is not connected. Pick a catalog source for line items.`;
  }
  return `"${field.label}" has an incomplete data connection.`;
}

export interface FieldConnectionBadge {
  complete: boolean;
  icon: string;
  label: string;
}

export function getFieldConnectionBadge(
  field: FormField,
  catalogName?: string,
  entityField?: EntityFieldDefinition
): FieldConnectionBadge | null {
  if (hasEntityMapping(field)) {
    const mapping = field.entityMapping!;
    const complete = isEntityMappingConfigured(field);
    const label = complete
      ? `Entity · ${formatEntityMappingPath(
          catalogName ?? mapping.catalogId,
          entityField ?? {
            key: mapping.entityFieldKey,
            label: mapping.entityFieldKey,
            type: 'text',
          }
        )}`
      : `Entity mapping incomplete · ${catalogName ?? mapping.catalogId}`;
    return {
      complete,
      icon: complete ? 'link' : 'link_off',
      label,
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
