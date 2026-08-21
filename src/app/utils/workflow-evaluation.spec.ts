import { describe, expect, it } from 'vitest';
import { createNewTaskDemoTemplate } from '../catalog/demo-templates';
import { getAllFields, validateTemplateForPublish } from './template-readiness';
import { buildInitialJobData } from './job-validation';
import { getWorkflowEmittedEvents } from './workflow-evaluation';

describe('workflow emitted events', () => {
  const template = createNewTaskDemoTemplate();
  const fields = getAllFields(template.layout.rows);
  const rules = template.layout.workflowRules ?? [];
  const taskType = fields.find((field) => field.label === 'Task type')!;
  const requestType = fields.find((field) => field.label === 'Request type')!;

  it('is ready to publish without extra data mapping', () => {
    const result = validateTemplateForPublish(
      template.layout.rows,
      template.layout.dataBindings,
      rules
    );
    expect(result).toEqual({ valid: true, errors: [] });
  });

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
      kind: 'signal',
      ruleName: 'Show advertising section when Task type is Digital Advertising',
      templateId: template.id,
      templateVersion: 0,
      trigger: {
        fieldId: taskType.id,
        label: 'Task type',
        value: 'digital-advertising',
      },
      condition: {
        operator: 'equals',
        value: 'digital-advertising',
      },
      payload: { kind: 'signal' },
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

  it('builds email intent payload from catalog defaults', () => {
    const emailRule = {
      id: 'email-rule',
      name: 'Notify ops',
      enabled: true,
      nodes: [
        {
          id: 't1',
          type: 'trigger' as const,
          position: { x: 0, y: 0 },
          data: { fieldId: taskType.id },
        },
        {
          id: 'c1',
          type: 'condition' as const,
          position: { x: 220, y: 0 },
          data: { operator: 'equals' as const, value: 'digital-advertising' },
        },
        {
          id: 'e1',
          type: 'action-event' as const,
          position: { x: 440, y: 0 },
          data: {
            eventCatalogId: 'notify.ops.email',
            eventName: 'notify.ops.email',
            eventConfig: {
              email: {
                to: 'ops@example.com',
                subject: 'Workflow match: {{ruleName}}',
                body: 'Rule matched on field {{triggerLabel}} = {{triggerValue}}',
              },
            },
          },
        },
      ],
      edges: [
        { id: 'edge1', source: 't1', target: 'c1' },
        { id: 'edge2', source: 'c1', target: 'e1' },
      ],
    };

    const events = getWorkflowEmittedEvents(
      [emailRule],
      { ...buildInitialJobData(fields), [taskType.id]: 'digital-advertising' },
      { fields }
    );

    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('email');
    expect(events[0].payload).toMatchObject({
      kind: 'email',
      email: {
        to: 'ops@example.com',
        subject: 'Workflow match: Notify ops',
        body: 'Rule matched on field Task type = digital-advertising',
      },
    });
  });
});
