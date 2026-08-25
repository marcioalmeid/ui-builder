import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TaskTemplate } from '../models/task-template';
import { FormService } from './form.services';
import { JobRepository } from './job.repository';
import { JobService } from './job.service';

function publishedTemplate(id: string): TaskTemplate {
  const layout = {
    rows: [{ id: 'row-1', templateId: id, fields: [] }],
    dataBindings: [],
    workflowRules: [],
  };
  return {
    id,
    name: 'Test template',
    departments: ['general'],
    version: 1,
    status: 'published',
    layout,
    versions: [{ version: 1, layout: structuredClone(layout) }],
    retiredFieldIds: [],
    riskPolicy: 'ADDITIVE',
    updatedAt: 1,
  };
}

describe('JobService', () => {
  let jobs: JobRepository;
  let service: JobService;
  let formService: FormService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    jobs = TestBed.inject(JobRepository);
    service = TestBed.inject(JobService);
    formService = TestBed.inject(FormService);
    formService.replaceAllTemplates([publishedTemplate('template-a')], 'template-a');
  });

  it('assigns the next ID for a template when no collision exists', () => {
    jobs.save({
      id: 'job-a-1',
      templateId: 'template-a',
      data: {},
      events: [],
      submittedAt: 1,
      status: 'todo',
      friendlyId: 'TASK-001',
      appliedFieldEventIds: [],
      appliedRuleEventIds: [],
    });

    const submission = service.submit('template-a', { title: 'Second' });
    expect(submission.friendlyId).toBe('TASK-002');
  });

  it('bumps past globally taken IDs from other templates (no infinite loop)', () => {
    formService.replaceAllTemplates(
      [publishedTemplate('template-a'), publishedTemplate('template-b')],
      'template-a'
    );

    jobs.save({
      id: 'job-a-1',
      templateId: 'template-a',
      data: {},
      events: [],
      submittedAt: 1,
      status: 'todo',
      friendlyId: 'TASK-001',
      appliedFieldEventIds: [],
      appliedRuleEventIds: [],
    });
    jobs.save({
      id: 'job-b-1',
      templateId: 'template-b',
      data: {},
      events: [],
      submittedAt: 2,
      status: 'todo',
      friendlyId: 'TASK-002',
      appliedFieldEventIds: [],
      appliedRuleEventIds: [],
    });

    const submission = service.submit('template-a', { title: 'New task' });
    expect(submission.friendlyId).toBe('TASK-003');
  });

  it('rejects submit when template is missing', () => {
    expect(() => service.submit('missing-template', {})).toThrow(/not found/);
  });

  it('rejects submit when template was never published', () => {
    formService.replaceAllTemplates(
      [
        {
          ...publishedTemplate('draft-only'),
          status: 'draft',
          version: 0,
          versions: [],
        },
      ],
      'draft-only'
    );

    expect(() => service.submit('draft-only', {})).toThrow(/not published/);
  });
});
