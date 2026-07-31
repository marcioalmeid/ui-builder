import { FormRow } from '../models/form';
import { FormField } from '../models/field';
import { DataBinding } from '../models/data-binding';
import { WorkflowRule } from '../models/workflow-rule';
import { getAllFields, isFieldDataConfigured, isOptionField } from './template-readiness';
import {
  getDataBindingMode,
  hasEntityMapping,
  supportsDataBinding,
  usesApiDataSource,
} from './field-data-binding';
import { getFieldIssues } from './field-issues';
import { DataCatalogService } from '../services/data-catalog.service';
import { formatEntityMappingPath } from './entity-field-compat';

export interface DataChecklistItem {
  field: FormField;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

export function buildDataChecklist(
  rows: FormRow[],
  catalogService: Pick<DataCatalogService, 'getById' | 'getDisplayName'>
): DataChecklistItem[] {
  const items: DataChecklistItem[] = [];

  for (const field of getAllFields(rows)) {
    if (!supportsDataBinding(field)) continue;

    if (hasEntityMapping(field)) {
      const catalogId = field.entityMapping!.catalogId;
      const catalog = catalogService.getById(catalogId);
      const entityField = catalog?.entityFields.find(
        (item) => item.key === field.entityMapping!.entityFieldKey
      );

      if (isFieldDataConfigured(field)) {
        items.push({
          field,
          status: 'ok',
          message: `Entity · ${formatEntityMappingPath(catalog?.name ?? catalogId, entityField)}`,
        });
      } else {
        items.push({
          field,
          status: 'error',
          message: 'Select an entity field',
        });
      }
      continue;
    }

    if (usesApiDataSource(field)) {
      if (isFieldDataConfigured(field)) {
        const via = field.dataBindingId
          ? `Shared list · ${catalogService.getDisplayName(field.dataCatalogId, 'Catalog')}`
          : catalogService.getDisplayName(field.dataCatalogId, 'Catalog');
        const mode = getDataBindingMode(field.type);
        const modeLabel =
          mode === 'options'
            ? 'Options list'
            : mode === 'line-items'
              ? 'Line items'
              : 'Catalog';
        items.push({ field, status: 'ok', message: `${modeLabel} · ${via}` });
      } else {
        items.push({ field, status: 'error', message: 'Pick a catalog source' });
      }
      continue;
    }

    if (isOptionField(field)) {
      items.push({
        field,
        status: (field.options?.length ?? 0) > 0 ? 'ok' : 'warning',
        message:
          (field.options?.length ?? 0) > 0
            ? `${field.options!.length} static option(s)`
            : 'No static options',
      });
      continue;
    }

    if (getDataBindingMode(field.type) === 'entity-map') {
      items.push({
        field,
        status: 'error',
        message: 'Not connected',
      });
      continue;
    }

    if (usesApiDataSource(field)) {
      items.push({
        field,
        status: 'error',
        message: 'Pick a catalog source',
      });
      continue;
    }

    items.push({
      field,
      status: 'warning',
      message: 'Not connected',
    });
  }

  return items;
}

export interface PublishSummary {
  fieldCount: number;
  apiFieldCount: number;
  configuredApiCount: number;
  issueCount: number;
  hasConditionalFields: boolean;
  previewVisited: boolean;
}

export function buildPublishSummary(
  rows: FormRow[],
  dataBindings: DataBinding[],
  previewVisited: boolean,
  workflowRules: WorkflowRule[] = []
): PublishSummary {
  const fields = getAllFields(rows);
  const apiFields = fields.filter(usesApiDataSource);

  return {
    fieldCount: fields.filter((f) => f.type !== 'section-header' && f.type !== 'button').length,
    apiFieldCount: apiFields.length,
    configuredApiCount: apiFields.filter(isFieldDataConfigured).length,
    issueCount: fields.reduce(
      (n, f) => n + getFieldIssues(f).filter((i) => i.severity === 'error').length,
      0
    ),
    hasConditionalFields: workflowRules.some((rule) => rule.enabled),
    previewVisited,
  };
}
