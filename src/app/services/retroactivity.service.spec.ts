import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FormField } from '../models/field';
import { TaskTemplate } from '../models/task-template';
import { JobRepository } from './job.repository';
import { MigrationLedgerService } from './migration-ledger.service';
import { RetroactivityService } from './retroactivity.service';

function text(id: string, label: string): FormField {
  return { id, type: 'text', label, icon: 'text_fields', required: false };
}

function templateWithLayout(label: string, published = false): TaskTemplate {
  const layout = {
    rows: [{ id: 'row-1', templateId: 'tpl-1', fields: [text('title', label)] }],
    dataBindings: [],
    workflowRules: [],
  };
  return {
    id: 'tpl-1',
    name: 'Spike',
    context: 'advertising',
    version: published ? 1 : 0,
    status: published ? 'published' : 'draft',
    layout,
    versions: published ? [{ version: 1, layout: structuredClone(layout) }] : [],
    retiredFieldIds: [],
    riskPolicy: 'ADDITIVE',
    updatedAt: 1,
  };
}

describe('RetroactivityService dry-run vs commit', () => {
  let service: RetroactivityService;
  let ledger: MigrationLedgerService;
  let jobs: JobRepository;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(RetroactivityService);
    ledger = TestBed.inject(MigrationLedgerService);
    jobs = TestBed.inject(JobRepository);
  });

  it('preview does not write ledger, jobs, or snapshots', () => {
    const published = templateWithLayout('Title', true);
    jobs.save({
      id: 'job-1',
      templateId: published.id,
      templateVersion: 1,
      templateName: published.name,
      data: { title: 'x' },
      events: [],
      submittedAt: 1,
      appliedFieldEventIds: [],
      appliedRuleEventIds: [],
    });

    const draft = {
      ...published,
      status: 'draft' as const,
      layout: {
        ...published.layout,
        rows: [
          {
            id: 'row-1',
            templateId: 'tpl-1',
            fields: [text('title', 'Campaign title')],
          },
        ],
      },
    };

    const preview = service.preview(draft);
    expect(preview.diff.fieldEvents[0]?.class).toBe('COSMETIC');
    expect(ledger.get(published.id).fieldEvents).toHaveLength(0);
    expect(jobs.getById('job-1')?.appliedFieldEventIds).toEqual([]);
    expect(jobs.getById('job-1')?.templateVersion).toBe(1);
  });

  it('commit freezes a snapshot and only then applies per policy', () => {
    const published = templateWithLayout('Title', true);
    jobs.save({
      id: 'job-1',
      templateId: published.id,
      templateVersion: 1,
      templateName: published.name,
      data: { title: 'x' },
      events: [],
      submittedAt: 1,
      appliedFieldEventIds: [],
      appliedRuleEventIds: [],
    });

    const draft = {
      ...published,
      status: 'draft' as const,
      layout: {
        ...published.layout,
        rows: [
          {
            id: 'row-1',
            templateId: 'tpl-1',
            fields: [text('title', 'Campaign title')],
          },
        ],
      },
    };

    const committed = service.commit(draft, 'ADDITIVE');
    expect(committed.error).toBeUndefined();
    expect(committed.template.version).toBe(2);
    expect(committed.template.status).toBe('published');
    expect(committed.template.versions?.map((item) => item.version)).toEqual([1, 2]);
    expect(committed.template.versions?.at(-1)?.layout.rows[0].fields[0].label).toBe(
      'Campaign title'
    );
    expect(ledger.get(published.id).fieldEvents).toHaveLength(1);
    expect(jobs.getById('job-1')?.templateVersion).toBe(1);
    expect(jobs.getById('job-1')?.appliedFieldEventIds).toHaveLength(1);
  });

  it('first publish freezes v1 with no migration events', () => {
    const draft = templateWithLayout('Title', false);
    const committed = service.commit(draft, 'ADDITIVE');
    expect(committed.template.version).toBe(1);
    expect(committed.template.versions).toHaveLength(1);
    expect(ledger.get(draft.id).fieldEvents).toHaveLength(0);
    expect(ledger.get(draft.id).ruleEvents).toHaveLength(0);
  });
});
