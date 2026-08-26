import {
  CostBreakdownValue,
  FormField,
} from '../models/field';
import { JobSubmission } from '../models/job-submission';
import {
  ListViewColumn,
  ListViewConfig,
  MAX_LIST_COLUMNS,
  createEmptyListView,
} from '../models/list-view';
import { TaskTemplateLayout } from '../models/task-template';
import { isFieldVisible } from './field-visibility';
import { getAllLayoutFields } from './retroactivity';

const NON_LISTABLE_TYPES = new Set(['section-header', 'button']);

export interface ResolvedListColumn {
  fieldId: string;
  label: string;
  width: ListViewColumn['width'];
  filterable: boolean;
  field: FormField;
}

export interface TaskListContext {
  layout: TaskTemplateLayout;
  fields: FormField[];
  listView: ListViewConfig;
  workflowRules: NonNullable<TaskTemplateLayout['workflowRules']>;
}

const SEARCH_TOKEN_SPLIT = /[\s,.;:/\\|]+/;

export function isListableField(field: FormField): boolean {
  return !NON_LISTABLE_TYPES.has(field.type);
}

export function resolveTitleField(
  fields: FormField[],
  listView: ListViewConfig
): FormField | undefined {
  if (listView.titleFieldId) {
    const explicit = fields.find((field) => field.id === listView.titleFieldId);
    if (explicit) return explicit;
  }

  return (
    fields.find((field) => field.required && field.type === 'text') ??
    fields.find((field) => field.type === 'text')
  );
}

export function resolveTitleFieldId(
  fields: FormField[],
  listView: ListViewConfig
): string | undefined {
  return resolveTitleField(fields, listView)?.id;
}

export function ensureListView(
  listView: ListViewConfig | undefined,
  fields: FormField[]
): ListViewConfig {
  const pristine =
    !listView ||
    (listView.columns.length === 0 &&
      listView.searchableFieldIds.length === 0 &&
      !listView.titleFieldId);

  if (pristine && fields.some(isListableField)) {
    return inferDefaultListView(fields);
  }

  return normalizeListView(listView, fields);
}

export function inferDefaultListView(fields: FormField[]): ListViewConfig {
  const listable = fields.filter(isListableField);
  const titleField = resolveTitleField(fields, createEmptyListView());
  const titleFieldId = titleField?.id;

  const columns: ListViewColumn[] = [];
  for (const field of listable) {
    if (field.id === titleFieldId) continue;
    columns.push({ fieldId: field.id, width: defaultWidthForField(field), filterable: true });
    if (columns.length >= 5) break;
  }

  const searchableFieldIds = uniqueIds([
    ...(titleFieldId ? [titleFieldId] : []),
    ...columns.map((column) => column.fieldId),
  ]);

  return normalizeListView(
    {
      titleFieldId,
      columns,
      searchableFieldIds,
    },
    fields
  );
}

export function normalizeListView(
  listView: ListViewConfig | undefined,
  fields: FormField[]
): ListViewConfig {
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  const listableIds = new Set(fields.filter(isListableField).map((field) => field.id));

  const titleFieldId =
    listView?.titleFieldId && listableIds.has(listView.titleFieldId)
      ? listView.titleFieldId
      : resolveTitleFieldId(fields, createEmptyListView());

  const seenColumnIds = new Set<string>();
  const columns: ListViewColumn[] = [];
  for (const column of listView?.columns ?? []) {
    if (!listableIds.has(column.fieldId)) continue;
    if (column.fieldId === titleFieldId) continue;
    if (seenColumnIds.has(column.fieldId)) continue;
    seenColumnIds.add(column.fieldId);
    const field = fieldById.get(column.fieldId)!;
    columns.push({
      fieldId: column.fieldId,
      width: column.width ?? defaultWidthForField(field),
      filterable: column.filterable ?? true,
    });
    if (columns.length >= MAX_LIST_COLUMNS) break;
  }

  const searchableFieldIds = uniqueIds(
    (listView?.searchableFieldIds ?? [])
      .filter((fieldId) => listableIds.has(fieldId))
      .slice(0, 20)
  );

  if (titleFieldId && !searchableFieldIds.includes(titleFieldId)) {
    searchableFieldIds.unshift(titleFieldId);
  }

  for (const column of columns) {
    if (!searchableFieldIds.includes(column.fieldId)) {
      searchableFieldIds.push(column.fieldId);
    }
  }

  return {
    titleFieldId,
    columns,
    searchableFieldIds: uniqueIds(searchableFieldIds),
  };
}

export function resolveListColumns(
  listView: ListViewConfig,
  fields: FormField[]
): ResolvedListColumn[] {
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  const normalized = normalizeListView(listView, fields);

  return normalized.columns
    .map((column) => {
      const field = fieldById.get(column.fieldId);
      if (!field) return null;
      return {
        fieldId: column.fieldId,
        label: field.label,
        width: column.width ?? defaultWidthForField(field),
        filterable: column.filterable ?? true,
        field,
      };
    })
    .filter((column): column is ResolvedListColumn => column !== null);
}

export function buildTaskListContext(layout: TaskTemplateLayout): TaskListContext {
  const fields = getAllLayoutFields(layout);
  const listView = normalizeListView(layout.listView, fields);

  return {
    layout,
    fields,
    listView,
    workflowRules: layout.workflowRules ?? [],
  };
}

export function formatFieldValueForDisplay(
  field: FormField | undefined,
  raw: unknown
): string {
  if (raw === null || raw === undefined || raw === '') return '';

  if (!field) {
    return formatPrimitive(raw);
  }

  switch (field.type) {
    case 'date':
      if (typeof raw === 'string') {
        const date = new Date(raw);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
        }
      }
      return formatPrimitive(raw);

    case 'checkbox':
      return raw === true || raw === 'true' ? 'Yes' : raw === false || raw === 'false' ? 'No' : formatPrimitive(raw);

    case 'radio':
    case 'dropdown':
      return resolveOptionLabel(field, String(raw)) ?? formatPrimitive(raw);

    case 'cost-breakdown':
      return formatCostBreakdown(raw as CostBreakdownValue);

    default:
      if (Array.isArray(raw)) {
        return raw.map((item) => formatPrimitive(item)).join(', ');
      }
      return formatPrimitive(raw);
  }
}

export function buildSearchIndex(
  task: JobSubmission,
  context: TaskListContext
): string {
  const tokens: string[] = [
    task.friendlyId ?? '',
    task.templateName ?? '',
  ];

  for (const fieldId of context.listView.searchableFieldIds) {
    const field = context.fields.find((item) => item.id === fieldId);
    if (!field) continue;
    if (!isFieldVisible(field, task.data, context.workflowRules)) continue;
    const formatted = formatFieldValueForDisplay(field, task.data[fieldId]);
    if (formatted) {
      tokens.push(field.label, formatted);
    }
  }

  return normalizeSearchText(tokens.join(' '));
}

export function tokenizeSearchQuery(query: string): string[] {
  return normalizeSearchText(query)
    .split(SEARCH_TOKEN_SPLIT)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function matchesFullTextSearch(
  task: JobSubmission,
  query: string,
  context: TaskListContext
): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return true;

  const haystack = buildSearchIndex(task, context);
  return tokens.every((token) => haystack.includes(token));
}

export function matchesColumnFilters(
  task: JobSubmission,
  filters: Record<string, string>,
  context: TaskListContext
): boolean {
  for (const [fieldId, rawFilter] of Object.entries(filters)) {
    const filter = rawFilter.trim().toLowerCase();
    if (!filter) continue;

    const field = context.fields.find((item) => item.id === fieldId);
    if (!field) continue;
    if (!isFieldVisible(field, task.data, context.workflowRules)) {
      return false;
    }

    const value = formatFieldValueForDisplay(field, task.data[fieldId]).toLowerCase();
    if (!value.includes(filter)) {
      return false;
    }
  }

  return true;
}

export function taskFieldValue(
  task: JobSubmission,
  fieldId: string,
  context: TaskListContext
): string {
  const field = context.fields.find((item) => item.id === fieldId);
  if (!field) return '';
  if (!isFieldVisible(field, task.data, context.workflowRules)) return '';
  return formatFieldValueForDisplay(field, task.data[fieldId]);
}

export function taskTitleValue(task: JobSubmission, context: TaskListContext): string {
  const titleField = resolveTitleField(context.fields, context.listView);
  if (!titleField) return '';
  return formatFieldValueForDisplay(titleField, task.data[titleField.id]);
}

function defaultWidthForField(field: FormField): ListViewColumn['width'] {
  switch (field.type) {
    case 'date':
    case 'checkbox':
    case 'radio':
      return 'small';
    case 'textarea':
    case 'cost-breakdown':
      return 'large';
    default:
      return 'medium';
  }
}

function resolveOptionLabel(field: FormField, value: string): string | undefined {
  return field.options?.find((option) => option.value === value)?.label;
}

function formatCostBreakdown(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return '';
  const value = raw as CostBreakdownValue;
  const parts: string[] = [];
  if (value.grossBudget !== '' && value.grossBudget != null) {
    parts.push(`Budget ${value.grossBudget}`);
  }
  if (value.managementFeePercent != null) {
    parts.push(`Fee ${value.managementFeePercent}%`);
  }
  if (value.additionalFees?.length) {
    parts.push(
      value.additionalFees
        .map((fee) => `${fee.label} ${fee.amount}`)
        .join(', ')
    );
  }
  return parts.join(' · ');
}

function formatPrimitive(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'object') return JSON.stringify(raw);
  return String(raw);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
