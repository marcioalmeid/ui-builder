import { describe, expect, it } from 'vitest';
import {
  buildTaskBundle,
  parseTaskBundle,
  serializeTaskBundle,
  TASK_BUNDLE_FORMAT,
} from './task-bundle';
import { JobSubmission } from '../models/job-submission';

function sampleTask(overrides: Partial<JobSubmission> = {}): JobSubmission {
  return {
    id: 'tpl-1',
    templateId: 'demo',
    templateVersion: 1,
    templateName: 'Demo',
    friendlyId: 'TASK-001',
    data: { title: 'Hello' },
    events: [],
    submittedAt: 1_700_000_000_000,
    status: 'todo',
    appliedFieldEventIds: [],
    appliedRuleEventIds: [],
    ...overrides,
  };
}

describe('task-bundle', () => {
  it('round-trips export format', () => {
    const bundle = buildTaskBundle([sampleTask()]);
    const parsed = parseTaskBundle(serializeTaskBundle(bundle));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.bundle.format).toBe(TASK_BUNDLE_FORMAT);
    expect(parsed.bundle.tasks).toHaveLength(1);
    expect(parsed.bundle.tasks[0].friendlyId).toBe('TASK-001');
  });

  it('accepts a bare task array', () => {
    const parsed = parseTaskBundle(JSON.stringify([sampleTask({ id: 'a' })]));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.bundle.tasks[0].id).toBe('a');
  });

  it('rejects unknown format', () => {
    const parsed = parseTaskBundle(
      JSON.stringify({ format: 'other', tasks: [sampleTask()] })
    );
    expect(parsed.success).toBe(false);
  });

  it('rejects empty payload', () => {
    expect(parseTaskBundle('[]').success).toBe(false);
    expect(parseTaskBundle(JSON.stringify({ tasks: [] })).success).toBe(false);
  });
});
