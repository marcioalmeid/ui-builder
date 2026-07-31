import { describe, expect, it } from 'vitest';
import { createNewTaskDemoTemplate } from '../catalog/demo-templates';
import { getAllFields } from './template-readiness';
import { buildInitialJobData } from './job-validation';
import { getWorkflowEmittedEvents } from './workflow-evaluation';

describe('workflow emitted events', () => {
  const template = createNewTaskDemoTemplate();
  const fields = getAllFields(template.layout.rows);
  const rules = template.layout.workflowRules ?? [];
  const taskType = fields.find((field) => field.label === 'Task type')!;
  const requestType = fields.find((field) => field.label === 'Request type')!;

  it('returns no events on empty job data', () => {
    const data = buildInitialJobData(fields);
    const events = getWorkflowEmittedEvents(rules, data, {
      fields,
      templateId: template.id,
      templateVersion: template.version,
    });
    expect(events).toHaveLength(0);
  });

  it('emits campaign event with automatic trigger context', () => {
    const data = {
      ...buildInitialJobData(fields),
      [taskType.id]: 'digital-advertising',
    };
    const events = getWorkflowEmittedEvents(rules, data, {
      fields,
      templateId: template.id,
      templateVersion: template.version,
      emittedAt: 1_700_000_000_000,
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventName: 'campaign.type.selected',
      ruleName: 'Show advertising section when Task type is Digital Advertising',
      templateId: template.id,
      templateVersion: 1,
      trigger: {
        fieldId: taskType.id,
        label: 'Task type',
        value: 'digital-advertising',
      },
      condition: {
        operator: 'equals',
        value: 'digital-advertising',
      },
      payload: {},
    });
    expect(events[0].timestamp).toBe(new Date(1_700_000_000_000).toISOString());
  });

  it('emits budget event when request type matches', () => {
    const data = {
      ...buildInitialJobData(fields),
      [taskType.id]: 'digital-advertising',
      [requestType.id]: 'budget-change',
    };
    const events = getWorkflowEmittedEvents(rules, data, {
      fields,
      templateId: template.id,
      templateVersion: template.version,
    });

    expect(events.map((event) => event.eventName)).toEqual([
      'campaign.type.selected',
      'budget.change.requested',
    ]);
    expect(events[1].trigger).toMatchObject({
      fieldId: requestType.id,
      label: 'Request type',
      value: 'budget-change',
    });
  });
});
