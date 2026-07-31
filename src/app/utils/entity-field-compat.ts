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
  return `${catalogName}.${entityField.key}`;
}
