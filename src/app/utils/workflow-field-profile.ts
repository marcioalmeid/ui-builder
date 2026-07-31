import { RadioOption, FormField } from '../models/field';
import { EntityFieldDefinition } from '../models/entity-field';
import { DataCatalogItem } from '../catalog/data-catalog.items';
import { WorkflowConditionOperator } from '../models/workflow-rule';
import { hasEntityMapping, isOptionField, usesApiDataSource } from './field-data-binding';

export type WorkflowValueKind = 'options' | 'boolean' | 'text' | 'number' | 'date';

export interface WorkflowOperatorOption {
  id: WorkflowConditionOperator;
  label: string;
}

export interface WorkflowFieldProfile {
  fieldId: string;
  fieldLabel: string;
  valueKind: WorkflowValueKind;
  operators: WorkflowOperatorOption[];
  valueOptions: RadioOption[];
  valueInputType: 'select' | 'text' | 'number' | 'date' | 'none';
  dataHint: string;
}

type CatalogLookup = (catalogId: string) => DataCatalogItem | undefined;

const OPERATOR_LABELS: Record<WorkflowConditionOperator, string> = {
  equals: 'Equals',
  notEquals: 'Does not equal',
  notEmpty: 'Is not empty',
  isEmpty: 'Is empty',
  isTrue: 'Is checked',
  isFalse: 'Is unchecked',
  contains: 'Contains',
  greaterThan: 'Greater than',
  lessThan: 'Less than',
};

function operatorsForKind(kind: WorkflowValueKind): WorkflowOperatorOption[] {
  switch (kind) {
    case 'options':
      return ['equals', 'notEquals', 'notEmpty', 'isEmpty'].map((id) => ({
        id: id as WorkflowConditionOperator,
        label: OPERATOR_LABELS[id as WorkflowConditionOperator],
      }));
    case 'boolean':
      return ['isTrue', 'isFalse'].map((id) => ({
        id: id as WorkflowConditionOperator,
        label: OPERATOR_LABELS[id as WorkflowConditionOperator],
      }));
    case 'number':
      return ['equals', 'notEquals', 'greaterThan', 'lessThan', 'notEmpty', 'isEmpty'].map(
        (id) => ({
          id: id as WorkflowConditionOperator,
          label: OPERATOR_LABELS[id as WorkflowConditionOperator],
        })
      );
    case 'date':
      return ['equals', 'notEmpty', 'isEmpty'].map((id) => ({
        id: id as WorkflowConditionOperator,
        label: OPERATOR_LABELS[id as WorkflowConditionOperator],
      }));
    case 'text':
    default:
      return ['equals', 'notEquals', 'contains', 'notEmpty', 'isEmpty'].map((id) => ({
        id: id as WorkflowConditionOperator,
        label: OPERATOR_LABELS[id as WorkflowConditionOperator],
      }));
  }
}

function entityFieldToKind(entityField?: EntityFieldDefinition): WorkflowValueKind {
  switch (entityField?.type) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    default:
      return 'text';
  }
}

function resolveEntityField(
  field: FormField,
  getCatalogItem?: CatalogLookup
): EntityFieldDefinition | undefined {
  if (!field.entityMapping?.catalogId || !field.entityMapping.entityFieldKey) {
    return undefined;
  }

  return getCatalogItem?.(field.entityMapping.catalogId)?.entityFields.find(
    (item) => item.key === field.entityMapping!.entityFieldKey
  );
}

function buildDataHint(field: FormField, getCatalogItem?: CatalogLookup): string {
  if (isOptionField(field)) {
    if (usesApiDataSource(field) && field.dataCatalogId) {
      const catalogName = getCatalogItem?.(field.dataCatalogId)?.name ?? field.dataCatalogId;
      return `Options from catalog · ${catalogName}`;
    }
    return field.options?.length
      ? `${field.options.length} static option(s)`
      : 'Static options';
  }

  if (hasEntityMapping(field) && field.entityMapping) {
    const catalog = getCatalogItem?.(field.entityMapping.catalogId);
    const entityField = resolveEntityField(field, getCatalogItem);
    if (catalog && entityField) {
      return `Entity · ${catalog.name}.${entityField.label} (${entityField.type})`;
    }
    return 'Entity mapping';
  }

  if (field.type === 'checkbox') return 'Boolean value';
  if (field.type === 'datepicker') return 'Date value';
  if (field.inputType === 'number' || field.inputType === 'currency') return 'Number value';

  return 'Text value';
}

export function getWorkflowFieldProfile(
  field: FormField | undefined,
  getCatalogItem?: CatalogLookup
): WorkflowFieldProfile | null {
  if (!field) return null;

  if (isOptionField(field)) {
    return {
      fieldId: field.id,
      fieldLabel: field.label,
      valueKind: 'options',
      operators: operatorsForKind('options'),
      valueOptions: field.options ?? [],
      valueInputType: (field.options?.length ?? 0) > 0 ? 'select' : 'text',
      dataHint: buildDataHint(field, getCatalogItem),
    };
  }

  if (field.type === 'checkbox') {
    return {
      fieldId: field.id,
      fieldLabel: field.label,
      valueKind: 'boolean',
      operators: operatorsForKind('boolean'),
      valueOptions: [],
      valueInputType: 'none',
      dataHint: buildDataHint(field, getCatalogItem),
    };
  }

  if (field.type === 'datepicker') {
    return {
      fieldId: field.id,
      fieldLabel: field.label,
      valueKind: 'date',
      operators: operatorsForKind('date'),
      valueOptions: [],
      valueInputType: 'date',
      dataHint: buildDataHint(field, getCatalogItem),
    };
  }

  const entityField = resolveEntityField(field, getCatalogItem);
  if (entityField) {
    const valueKind = entityFieldToKind(entityField);
    return {
      fieldId: field.id,
      fieldLabel: field.label,
      valueKind,
      operators: operatorsForKind(valueKind),
      valueOptions: [],
      valueInputType:
        valueKind === 'boolean' ? 'none' : valueKind === 'date' ? 'date' : valueKind === 'number' ? 'number' : 'text',
      dataHint: buildDataHint(field, getCatalogItem),
    };
  }

  if (field.inputType === 'number' || field.inputType === 'currency') {
    return {
      fieldId: field.id,
      fieldLabel: field.label,
      valueKind: 'number',
      operators: operatorsForKind('number'),
      valueOptions: [],
      valueInputType: 'number',
      dataHint: buildDataHint(field, getCatalogItem),
    };
  }

  return {
    fieldId: field.id,
    fieldLabel: field.label,
    valueKind: 'text',
    operators: operatorsForKind('text'),
    valueOptions: [],
    valueInputType: 'text',
    dataHint: buildDataHint(field, getCatalogItem),
  };
}

export function operatorNeedsValue(operator?: WorkflowConditionOperator): boolean {
  return !['notEmpty', 'isEmpty', 'isTrue', 'isFalse'].includes(operator ?? '');
}

export function normalizeConditionForProfile(
  operator: WorkflowConditionOperator | undefined,
  value: string | undefined,
  profile: WorkflowFieldProfile | null
): { operator: WorkflowConditionOperator; value?: string } {
  const allowedOperators = profile?.operators.map((item) => item.id) ?? ['equals', 'notEmpty'];
  const nextOperator = allowedOperators.includes(operator as WorkflowConditionOperator)
    ? (operator as WorkflowConditionOperator)
    : allowedOperators[0];

  if (!operatorNeedsValue(nextOperator)) {
    return { operator: nextOperator };
  }

  if (profile?.valueKind === 'options' && profile.valueOptions.length) {
    const validValues = profile.valueOptions.map((option) => option.value);
    const nextValue = validValues.includes(value ?? '') ? value : validValues[0] ?? '';
    return { operator: nextOperator, value: nextValue };
  }

  return { operator: nextOperator, value: value ?? '' };
}

export function getTriggerFieldProfile(
  ruleNodes: { type: string; data: { fieldId?: string } }[],
  fields: FormField[],
  getCatalogItem?: CatalogLookup
): WorkflowFieldProfile | null {
  const trigger = ruleNodes.find((node) => node.type === 'trigger');
  if (!trigger?.data.fieldId) return null;
  const field = fields.find((item) => item.id === trigger.data.fieldId);
  return getWorkflowFieldProfile(field, getCatalogItem);
}
