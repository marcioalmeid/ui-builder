import { describe, expect, it } from 'vitest';
import { FormField } from '../models/field';
import { JobSubmission } from '../models/job-submission';
import { ListViewConfig } from '../models/list-view';
import { TaskTemplateLayout } from '../models/task-template';
import {
  buildSearchIndex,
  ensureListView,
  inferDefaultListView,
  matchesColumnFilters,
  matchesFullTextSearch,
  normalizeListView,
  resolveListColumns,
  taskTitleValue,
} from './layout-contract';

function text(id: string, label: string, required = false): FormField {
  return {
    id,
    type: 'text',
    label,
    icon: 'text_fields',
    required,
  };
}

function layout(fields: FormField[], listView?: ListViewConfig): TaskTemplateLayout {
  return {
    rows: [{ id: 'row-1', templateId: 'tpl-1', fields }],
    dataBindings: [],
    workflowRules: [],
    listView,
  };
}

function job(data: Record<string, unknown>): JobSubmission {
  return {
    id: 'job-1',
    templateId: 'tpl-1',
    friendlyId: 'TSK-001',
    data,
    events: [],
    submittedAt: Date.now(),
    status: 'todo',
  };
}

describe('layout-contract', () => {
  it('infers title field and default columns in layout order', () => {
    const fields = [
      text('title', 'Title', true),
      text('client', 'Client'),
      text('budget', 'Budget'),
      text('owner', 'Owner'),
      text('notes', 'Notes'),
      text('extra', 'Extra'),
    ];

    const listView = inferDefaultListView(fields);

    expect(listView.titleFieldId).toBe('title');
    expect(listView.columns.map((column) => column.fieldId)).toEqual([
      'client',
      'budget',
      'owner',
      'notes',
      'extra',
    ]);
    expect(listView.searchableFieldIds).toContain('title');
    expect(listView.searchableFieldIds).toContain('client');
  });

  it('normalizes invalid list view field ids', () => {
    const fields = [text('title', 'Title', true), text('client', 'Client')];
    const listView = normalizeListView(
      {
        titleFieldId: 'missing',
        columns: [{ fieldId: 'client' }, { fieldId: 'gone' }],
        searchableFieldIds: ['gone', 'client'],
      },
      fields
    );

    expect(listView.titleFieldId).toBe('title');
    expect(listView.columns).toEqual([{ fieldId: 'client', width: 'medium', filterable: true }]);
    expect(listView.searchableFieldIds).toEqual(['title', 'client']);
  });

  it('ensures default list view for pristine templates with fields', () => {
    const fields = [text('title', 'Title', true), text('client', 'Client')];
    const listView = ensureListView({ columns: [], searchableFieldIds: [] }, fields);

    expect(listView.titleFieldId).toBe('title');
    expect(listView.columns.map((column) => column.fieldId)).toEqual(['client']);
  });

  it('matches full-text search across indexed fields', () => {
    const fields = [
      text('title', 'Title', true),
      text('client', 'Client'),
      text('owner', 'Owner'),
    ];
    const listView: ListViewConfig = {
      titleFieldId: 'title',
      columns: [{ fieldId: 'client' }, { fieldId: 'owner' }],
      searchableFieldIds: ['title', 'client', 'owner'],
    };
    const context = {
      layout: layout(fields, listView),
      fields,
      listView: normalizeListView(listView, fields),
      workflowRules: [],
    };
    const submission = job({
      title: 'Campaign launch',
      client: 'Acme Corp',
      owner: 'Alice',
    });

    expect(matchesFullTextSearch(submission, 'acme', context)).toBe(true);
    expect(matchesFullTextSearch(submission, 'campaign alice', context)).toBe(true);
    expect(matchesFullTextSearch(submission, 'missing', context)).toBe(false);
    expect(buildSearchIndex(submission, context)).toContain('acme corp');
  });

  it('filters rows by configured column values', () => {
    const fields = [text('title', 'Title', true), text('client', 'Client')];
    const listView: ListViewConfig = {
      titleFieldId: 'title',
      columns: [{ fieldId: 'client', filterable: true }],
      searchableFieldIds: ['title', 'client'],
    };
    const context = {
      layout: layout(fields, listView),
      fields,
      listView: normalizeListView(listView, fields),
      workflowRules: [],
    };
    const submission = job({ title: 'Launch', client: 'Acme Corp' });

    expect(matchesColumnFilters(submission, { client: 'acme' }, context)).toBe(true);
    expect(matchesColumnFilters(submission, { client: 'beta' }, context)).toBe(false);
  });

  it('resolves configured table columns with labels', () => {
    const fields = [text('title', 'Title', true), text('client', 'Client')];
    const listView = inferDefaultListView(fields);
    const columns = resolveListColumns(listView, fields);

    expect(columns.map((column) => column.label)).toEqual(['Client']);
    expect(taskTitleValue(job({ title: 'My task' }), {
      layout: layout(fields, listView),
      fields,
      listView,
      workflowRules: [],
    })).toBe('My task');
  });
});
