import { EntityFieldDefinition, EntityFieldType } from '../models/entity-field';
import { FormField } from '../models/field';

export function getCompatibleEntityFieldTypes(field: FormField): EntityFieldType[] {
  switch (field.type) {
    case 'checkbox':
      return ['boolean'];
    case 'datepicker':
      return ['date', 'text'];
    case 'textarea':
      return ['text'];
    case 'text':
      if (field.inputType === 'number' || field.inputType === 'currency') {
        return ['number', 'text'];
      }
      return ['text', 'number'];
    default:
      return ['text'];
  }
}

export function filterCompatibleEntityFields(
  fields: EntityFieldDefinition[],
  formField: FormField
): EntityFieldDefinition[] {
  const allowed = getCompatibleEntityFieldTypes(formField);
  return fields.filter((field) => allowed.includes(field.type));
}

export function formatEntityMappingPath(
  catalogName: string,
  entityField?: EntityFieldDefinition
): string {
  if (!entityField) return catalogName;
  return `${catalogName}.${entityField.label}`;
}

/** True when both sides point at the same catalog property. */
export function isSameEntityMappingPath(
  a: { catalogId?: string; entityFieldKey?: string } | undefined,
  catalogId: string,
  entityFieldKey: string
): boolean {
  return Boolean(
    catalogId &&
      entityFieldKey &&
      a?.catalogId === catalogId &&
      a?.entityFieldKey === entityFieldKey
  );
}

/** First form field already mapped to this entity path, if any. */
export function findFieldUsingEntityPath(
  fields: Iterable<FormField>,
  catalogId: string,
  entityFieldKey: string,
  exceptFieldId?: string
): FormField | undefined {
  if (!catalogId || !entityFieldKey) return undefined;

  for (const field of fields) {
    if (exceptFieldId && field.id === exceptFieldId) continue;
    if (isSameEntityMappingPath(field.entityMapping, catalogId, entityFieldKey)) {
      return field;
    }
  }
  return undefined;
}
