import { DataBinding } from '../models/data-binding';
import { FormRow } from '../models/form';
import { ApiDataSource, FormField, RadioOption } from '../models/field';
import { TaskTemplate } from '../models/task-template';
import { WorkflowRule } from '../models/workflow-rule';
import { DataCatalogItem } from '../catalog/data-catalog.items';
import {
  getDataBindingMode,
  hasEntityMapping,
  isOptionField,
  usesApiDataSource,
} from './field-data-binding';
import { isFieldVisible } from './field-visibility';

export interface ApiPayloadDataSourceRef {
  url: string;
  method?: string;
  labelKey: string;
  valueKey: string;
  responsePath?: string;
}

export interface ApiFieldDataConnection {
  kind: 'none' | 'entity-map' | 'catalog' | 'shared-list';
  bindingMode: ReturnType<typeof getDataBindingMode>;
  optionsSource?: 'static' | 'api';
  catalogId?: string;
  catalogName?: string;
  entityFieldKey?: string;
  entityFieldLabel?: string;
  entityPath?: string;
  dataBindingId?: string;
  dataBindingName?: string;
  dataSource?: ApiPayloadDataSourceRef;
}

export interface ApiPayloadFieldRuntime {
  visible: boolean;
  value: unknown;
  displayValue?: string;
}

export interface ApiPayloadField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  hint?: string;
  inputType?: string;
  optionsSource?: 'static' | 'api';
  options?: RadioOption[];
  visibilityRule?: FormField['visibilityRule'];
  entityMapping?: FormField['entityMapping'];
  dataCatalogId?: string;
  dataBindingId?: string;
  managementFeePercent?: number;
  dataConnection: ApiFieldDataConnection;
  runtime: ApiPayloadFieldRuntime;
}

export interface ApiPayloadRow {
  id: string;
  fields: ApiPayloadField[];
}

export interface ApiPayloadDataBinding {
  id: string;
  name: string;
  catalogId?: string;
  catalogName?: string;
  dataSource: ApiPayloadDataSourceRef;
  targetFields: Array<{ id: string; label: string; type: string }>;
}

export interface ApiSubmissionPayload {
  template: {
    id: string;
    name: string;
    version: number;
    context: string;
    status: TaskTemplate['status'];
  };
  dataBindings: ApiPayloadDataBinding[];
  workflowRules: WorkflowRule[];
  layout: ApiPayloadRow[];
  resolved: {
    entities: Record<string, Record<string, unknown>>;
  };
  meta: {
    rowCount: number;
    fieldCount: number;
    dataBindingCount: number;
    connectedFieldCount: number;
    visibleFieldCount: number;
    workflowRuleCount: number;
  };
}

type CatalogLookup = (catalogId: string) => DataCatalogItem | undefined;

function summarizeDataSource(source: ApiDataSource): ApiPayloadDataSourceRef {
  return {
    url: source.url,
    method: source.method,
    labelKey: source.labelKey,
    valueKey: source.valueKey,
    responsePath: source.responsePath,
  };
}

function setNestedValue(
  target: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const segments = path.split('.');
  let current: Record<string, unknown> = target;

  for (let index = 0; index < segments.length - 1; index++) {
    const segment = segments[index];
    const next = current[segment];
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
}

function resolveDisplayValue(field: FormField, value: unknown): string | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (field.options?.length) {
    const match = field.options.find((option) => option.value === String(value));
    if (match) return match.label;
  }

  return String(value);
}

function buildFieldDataConnection(
  field: FormField,
  dataBindings: DataBinding[],
  getCatalogItem: CatalogLookup
): ApiFieldDataConnection {
  const bindingMode = getDataBindingMode(field.type);

  if (field.entityMapping?.catalogId) {
    const catalog = getCatalogItem(field.entityMapping.catalogId);
    const entityField = catalog?.entityFields.find(
      (item) => item.key === field.entityMapping!.entityFieldKey
    );

    return {
      kind: 'entity-map',
      bindingMode,
      catalogId: field.entityMapping.catalogId,
      catalogName: catalog?.name,
      entityFieldKey: field.entityMapping.entityFieldKey,
      entityFieldLabel: entityField?.label,
      entityPath: field.entityMapping.entityFieldKey
        ? `${field.entityMapping.catalogId}.${field.entityMapping.entityFieldKey}`
        : undefined,
    };
  }

  if (field.dataBindingId) {
    const binding = dataBindings.find((item) => item.id === field.dataBindingId);
    const catalog = binding?.dataCatalogId
      ? getCatalogItem(binding.dataCatalogId)
      : undefined;

    return {
      kind: 'shared-list',
      bindingMode,
      optionsSource: 'api',
      dataBindingId: field.dataBindingId,
      dataBindingName: binding?.name,
      catalogId: binding?.dataCatalogId,
      catalogName: catalog?.name ?? binding?.name,
      dataSource: binding?.dataSource ? summarizeDataSource(binding.dataSource) : undefined,
      entityPath:
        binding?.dataCatalogId && binding.dataSource.valueKey
          ? `${binding.dataCatalogId}.${binding.dataSource.valueKey}`
          : undefined,
    };
  }

  if (usesApiDataSource(field)) {
    const catalog = field.dataCatalogId ? getCatalogItem(field.dataCatalogId) : undefined;

    return {
      kind: 'catalog',
      bindingMode,
      optionsSource: 'api',
      catalogId: field.dataCatalogId,
      catalogName: catalog?.name,
      dataSource: field.dataSource ? summarizeDataSource(field.dataSource) : undefined,
      entityPath:
        field.dataCatalogId && field.dataSource?.valueKey
          ? `${field.dataCatalogId}.${field.dataSource.valueKey}`
          : undefined,
    };
  }

  return {
    kind: 'none',
    bindingMode,
    optionsSource: field.optionsSource ?? 'static',
  };
}

function serializeFieldDefinition(field: FormField): Omit<ApiPayloadField, 'dataConnection' | 'runtime'> {
  const bindingMode = getDataBindingMode(field.type);
  const payload: Omit<ApiPayloadField, 'dataConnection' | 'runtime'> = {
    id: field.id,
    type: field.type,
    label: field.label,
    required: field.required,
  };

  if (field.placeholder) payload.placeholder = field.placeholder;
  if (field.hint) payload.hint = field.hint;
  if (field.inputType) payload.inputType = field.inputType;
  if (field.visibilityRule) payload.visibilityRule = field.visibilityRule;
  if (field.managementFeePercent != null) {
    payload.managementFeePercent = field.managementFeePercent;
  }

  if (bindingMode === 'entity-map' && field.entityMapping) {
    payload.entityMapping = field.entityMapping;
  }

  if (isOptionField(field)) {
    if (field.optionsSource) payload.optionsSource = field.optionsSource;
    if (field.options?.length) payload.options = field.options;
    if (field.dataCatalogId) payload.dataCatalogId = field.dataCatalogId;
    if (field.dataBindingId) payload.dataBindingId = field.dataBindingId;
  }

  if ((bindingMode === 'line-items' || bindingMode === 'label') && usesApiDataSource(field)) {
    if (field.optionsSource) payload.optionsSource = field.optionsSource;
    if (field.dataCatalogId) payload.dataCatalogId = field.dataCatalogId;
    if (field.dataBindingId) payload.dataBindingId = field.dataBindingId;
  }

  return payload;
}

function applyResolvedEntityValue(
  field: FormField,
  value: unknown,
  dataConnection: ApiFieldDataConnection,
  entities: Record<string, Record<string, unknown>>
): void {
  if (value === '' || value === null || value === undefined) return;
  if (value === false) return;

  if (hasEntityMapping(field) && field.entityMapping?.entityFieldKey) {
    const { catalogId, entityFieldKey } = field.entityMapping;
    if (!entities[catalogId]) entities[catalogId] = {};
    setNestedValue(entities[catalogId], entityFieldKey, value);
    return;
  }

  if (dataConnection.kind === 'catalog' || dataConnection.kind === 'shared-list') {
    const catalogId = dataConnection.catalogId;
    const entityKey = dataConnection.dataSource?.valueKey ?? 'id';
    if (!catalogId) return;
    if (!entities[catalogId]) entities[catalogId] = {};
    setNestedValue(entities[catalogId], entityKey, value);
  }
}

function buildPayloadField(
  field: FormField,
  jobData: Record<string, unknown>,
  dataBindings: DataBinding[],
  workflowRules: WorkflowRule[],
  getCatalogItem: CatalogLookup,
  entities: Record<string, Record<string, unknown>>
): ApiPayloadField {
  const value = jobData[field.id];
  const visible = isFieldVisible(field, jobData, workflowRules);
  const dataConnection = buildFieldDataConnection(field, dataBindings, getCatalogItem);

  if (visible && field.type !== 'section-header') {
    applyResolvedEntityValue(field, value, dataConnection, entities);
  }

  return {
    ...serializeFieldDefinition(field),
    dataConnection,
    runtime: {
      visible,
      value,
      displayValue: resolveDisplayValue(field, value),
    },
  };
}

function buildPayloadDataBindings(
  dataBindings: DataBinding[],
  fields: FormField[],
  getCatalogItem: CatalogLookup
): ApiPayloadDataBinding[] {
  const fieldIds = new Set(fields.map((field) => field.id));
  const activeBindingIds = new Set(
    fields
      .map((field) => field.dataBindingId)
      .filter((bindingId): bindingId is string => Boolean(bindingId))
  );

  return dataBindings
    .filter((binding) => activeBindingIds.has(binding.id))
    .map((binding) => ({
      id: binding.id,
      name: binding.name,
      catalogId: binding.dataCatalogId,
      catalogName: binding.dataCatalogId
        ? getCatalogItem(binding.dataCatalogId)?.name
        : binding.name,
      dataSource: summarizeDataSource(binding.dataSource),
      targetFields: binding.targetFieldIds
        .filter((fieldId) => fieldIds.has(fieldId))
        .map((fieldId) => {
          const field = fields.find((item) => item.id === fieldId);
          return {
            id: fieldId,
            label: field?.label ?? fieldId,
            type: field?.type ?? 'unknown',
          };
        }),
    }))
    .filter((binding) => binding.targetFields.length > 0);
}

function filterJobDataForFields(
  fields: FormField[],
  jobData: Record<string, unknown>
): Record<string, unknown> {
  const fieldIds = new Set(fields.map((field) => field.id));
  return Object.fromEntries(
    Object.entries(jobData).filter(([fieldId]) => fieldIds.has(fieldId))
  );
}

export function buildApiSubmissionPayload(
  template: TaskTemplate,
  rows: FormRow[],
  dataBindings: DataBinding[],
  workflowRules: WorkflowRule[],
  jobData: Record<string, unknown>,
  getCatalogItem: CatalogLookup
): ApiSubmissionPayload {
  const entities: Record<string, Record<string, unknown>> = {};
  const allFields = rows.flatMap((row) => row.fields);
  const scopedJobData = filterJobDataForFields(allFields, jobData);

  const layout = rows.map((row) => ({
    id: row.id,
    fields: row.fields.map((field) =>
      buildPayloadField(
        field,
        scopedJobData,
        dataBindings,
        workflowRules,
        getCatalogItem,
        entities
      )
    ),
  }));

  const payloadBindings = buildPayloadDataBindings(dataBindings, allFields, getCatalogItem);

  const connectedFieldCount = layout
    .flatMap((row) => row.fields)
    .filter((field) => field.dataConnection.kind !== 'none').length;

  const visibleFieldCount = layout
    .flatMap((row) => row.fields)
    .filter((field) => field.runtime.visible && field.type !== 'section-header').length;

  return {
    template: {
      id: template.id,
      name: template.name,
      version: template.version,
      context: template.context,
      status: template.status,
    },
    dataBindings: payloadBindings,
    workflowRules,
    layout,
    resolved: { entities },
    meta: {
      rowCount: layout.length,
      fieldCount: allFields.length,
      dataBindingCount: payloadBindings.length,
      connectedFieldCount,
      visibleFieldCount,
      workflowRuleCount: workflowRules.length,
    },
  };
}

export function formatApiPayloadJson(payload: ApiSubmissionPayload): string {
  return JSON.stringify(payload, null, 2);
}
