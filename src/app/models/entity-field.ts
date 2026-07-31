export type EntityFieldType = 'text' | 'number' | 'date' | 'boolean';

export interface EntityFieldDefinition {
  key: string;
  label: string;
  type: EntityFieldType;
  description?: string;
}

export interface EntityFieldMapping {
  catalogId: string;
  entityFieldKey: string;
}
