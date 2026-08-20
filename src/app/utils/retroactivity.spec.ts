import { describe, expect, it } from 'vitest';
import { FormField } from '../models/field';
import { TaskTemplateLayout } from '../models/task-template';
import { WorkflowRule } from '../models/workflow-rule';
import {
  applyBehaviorEvent,
  applyLayoutEvents,
  autoApplyOnPublish,
  canMigrateJob,
  diffPublish,
  layoutEventAutoApplies,
  migrateJob,
  migrateJobFully,
  resolveLayout,
  unapplyLayoutEvent,
} from './retroactivity';

type RestrictedField = FormField & { restricted?: boolean };

function text(
  id: string,
  label: string,
  extra: Partial<RestrictedField> = {}
): RestrictedField {
  return { id, type: 'text', label, icon: 'text_fields', required: false, ...extra };
}

function showRule(
  id: string,
  triggerId: string,
  targetId: string,
  value = 'ads'
): WorkflowRule {
  return {
    id,
    name: `show ${targetId}`,
    enabled: true,
    nodes: [
      { id: `${id}-t`, type: 'trigger', position: { x: 0, y: 0 }, data: { fieldId: triggerId } },
      {
        id: `${id}-c`,
        type: 'condition',
        position: { x: 220, y: 0 },
        data: { operator: 'equals', value },
      },
      {
        id: `${id}-a`,
        type: 'action-show',
        position: { x: 440, y: 0 },
        data: { targetFieldId: targetId },
      },
    ],
    edges: [
      { id: `${id}-e1`, source: `${id}-t`, target: `${id}-c` },
      { id: `${id}-e2`, source: `${id}-c`, target: `${id}-a` },
    ],
  };
}

function hideRule(id: string, triggerId: string, targetId: string): WorkflowRule {
  const rule = showRule(id, triggerId, targetId);
  rule.nodes[2] = { ...rule.nodes[2], type: 'action-hide' };
  return rule;
}

function layout(fields: FormField[], rules: WorkflowRule[] = []): TaskTemplateLayout {
  return {
    rows: [{ id: 'row-1', templateId: 'tpl', fields }],
    dataBindings: [],
    workflowRules: rules,
  };
}

function ids() {
  let n = 0;
  return () => `e${++n}`;
}

describe('diffPublish classifier', () => {
  it('classifies label/hint/placeholder as COSMETIC', () => {
    const prev = layout([text('title', 'Title', { hint: 'old', placeholder: 'p1' })]);
    const next = layout([text('title', 'Campaign title', { hint: 'new', placeholder: 'p2' })]);
    const result = diffPublish(prev, next, {
      fromVersion: 1,
      toVersion: 2,
      idFactory: ids(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diff.fieldEvents).toHaveLength(1);
    expect(result.diff.fieldEvents[0]).toMatchObject({
      fieldId: 'title',
      class: 'COSMETIC',
    });
    expect(result.diff.ruleEvent).toBeNull();
  });

  it('sends trigger-field label changes to behavior, not cosmetic auto', () => {
    const rules = [showRule('r1', 'taskType', 'vendor')];
    const prev = layout(
      [text('taskType', 'Task type'), text('vendor', 'Vendor')],
      rules
    );
    const next = layout(
      [text('taskType', 'Work type'), text('vendor', 'Vendor')],
      rules
    );
    const result = diffPublish(prev, next, {
      fromVersion: 1,
      toVersion: 2,
      idFactory: ids(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diff.fieldEvents).toHaveLength(0);
    expect(result.diff.ruleEvent?.class).toBe('BREAKING');
    expect(
      result.diff.fieldEvents.every((event) => !layoutEventAutoApplies(event, 'ADDITIVE'))
    ).toBe(true);
  });

  it('classifies new fields as ADDITIVE and removals as BREAKING', () => {
    const prev = layout([text('title', 'Title')]);
    const next = layout([text('notes', 'Notes')]);
    const result = diffPublish(prev, next, {
      fromVersion: 1,
      toVersion: 2,
      idFactory: ids(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diff.fieldEvents.map((event) => [event.fieldId, event.class])).toEqual([
      ['notes', 'ADDITIVE'],
      ['title', 'BREAKING'],
    ]);
    expect(result.retiredFieldIds).toContain('title');
  });

  it('T16 refuses reused field_id after retirement', () => {
    const prev = layout([text('keep', 'Keep')]);
    const next = layout([text('keep', 'Keep'), text('title', 'Title again')]);
    const result = diffPublish(prev, next, {
      fromVersion: 2,
      toVersion: 3,
      retiredFieldIds: ['title'],
      idFactory: ids(),
    });
    expect(result).toEqual({ ok: false, error: 'FIELD_ID_REUSED', fieldId: 'title' });
  });

  it('classifies type remap as STRUCTURAL and does not auto-apply', () => {
    const prev = layout([text('title', 'Title')]);
    const next = layout([{ ...text('title', 'Title'), type: 'textarea' }]);
    const result = diffPublish(prev, next, {
      fromVersion: 1,
      toVersion: 2,
      idFactory: ids(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diff.fieldEvents[0].class).toBe('STRUCTURAL');
    expect(layoutEventAutoApplies(result.diff.fieldEvents[0], 'ADDITIVE')).toBe(false);
  });

  it('treats restricted as BREAKING (T17 stand-in)', () => {
    const prev = layout([text('secret', 'Secret', { restricted: false })]);
    const next = layout([text('secret', 'Secret', { restricted: true })]);
    const result = diffPublish(prev, next, {
      fromVersion: 1,
      toVersion: 2,
      idFactory: ids(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diff.fieldEvents[0].class).toBe('BREAKING');
    expect(layoutEventAutoApplies(result.diff.fieldEvents[0], 'ADDITIVE')).toBe(false);
  });

  it('classifies only-new rules as SAFE and mutated rules as BREAKING', () => {
    const vendorShow = showRule('r1', 'taskType', 'vendor');
    const prev = layout([text('taskType', 'Task type'), text('vendor', 'Vendor')], [vendorShow]);
    const mutated = hideRule('r1', 'taskType', 'vendor');
    const breaking = diffPublish(prev, { ...prev, workflowRules: [mutated] }, {
      fromVersion: 1,
      toVersion: 2,
      idFactory: ids(),
    });
    expect(breaking.ok && breaking.diff.ruleEvent?.class).toBe('BREAKING');

    const extra = showRule('r2', 'taskType', 'platform', 'print');
    const safe = diffPublish(prev, { ...prev, workflowRules: [vendorShow, extra] }, {
      fromVersion: 2,
      toVersion: 3,
      idFactory: ids(),
    });
    expect(safe.ok && safe.diff.ruleEvent?.class).toBe('SAFE');
  });
});

describe('T18 split channels', () => {
  const v1 = layout(
    [text('title', 'Title'), text('taskType', 'Task type'), text('vendor', 'Vendor')],
    [showRule('r1', 'taskType', 'vendor')]
  );
  const v2Layout = layout(
    [text('title', 'Campaign title'), text('taskType', 'Task type'), text('vendor', 'Vendor')],
    [hideRule('r1', 'taskType', 'vendor')]
  );

  it('applies cosmetic layout and keeps the pin on breaking rules', () => {
    const result = diffPublish(v1, v2Layout, {
      fromVersion: 1,
      toVersion: 2,
      idFactory: ids(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.diff.fieldEvents[0].class).toBe('COSMETIC');
    expect(result.diff.ruleEvent?.class).toBe('BREAKING');

    const job = autoApplyOnPublish(
      { templateVersion: 1, appliedFieldEventIds: [], appliedRuleEventIds: [] },
      result.diff,
      'ADDITIVE'
    );

    expect(job.templateVersion).toBe(1);
    expect(job.appliedFieldEventIds).toEqual([result.diff.fieldEvents[0].id]);
    expect(job.appliedRuleEventIds).toEqual([]);

    const resolved = resolveLayout(
      [
        { version: 1, layout: v1 },
        { version: 2, layout: v2Layout },
      ],
      job.templateVersion!,
      result.diff.fieldEvents,
      job.appliedFieldEventIds
    );
    expect(resolved.rows[0].fields.find((field) => field.id === 'title')?.label).toBe(
      'Campaign title'
    );
    expect(resolved.workflowRules?.[0].nodes[2].type).toBe('action-show');
  });
});

describe('T14 barrier', () => {
  it('migrate applies v2 breaking before v3 SAFE and never skips', () => {
    const v1 = layout(
      [text('title', 'Title'), text('taskType', 'Task type'), text('vendor', 'Vendor')],
      [showRule('r1', 'taskType', 'vendor')]
    );
    const v2 = layout(
      [text('title', 'Campaign title'), text('taskType', 'Task type'), text('vendor', 'Vendor')],
      [hideRule('r1', 'taskType', 'vendor')]
    );
    const extra = showRule('r2', 'taskType', 'vendor', 'print');
    const v3 = layout(
      [text('title', 'Campaign title'), text('taskType', 'Task type'), text('vendor', 'Vendor')],
      [hideRule('r1', 'taskType', 'vendor'), extra]
    );

    const d12 = diffPublish(v1, v2, { fromVersion: 1, toVersion: 2, idFactory: ids() });
    const d23 = diffPublish(v2, v3, { fromVersion: 2, toVersion: 3, idFactory: ids() });
    expect(d12.ok && d23.ok).toBe(true);
    if (!d12.ok || !d23.ok) return;

    const fieldEvents = [...d12.diff.fieldEvents, ...d23.diff.fieldEvents];
    const ruleEvents = [d12.diff.ruleEvent!, d23.diff.ruleEvent!];
    expect(d23.diff.ruleEvent?.class).toBe('SAFE');

    let job = autoApplyOnPublish(
      { templateVersion: 1, appliedFieldEventIds: [], appliedRuleEventIds: [] },
      d12.diff,
      'ADDITIVE'
    );
    job = autoApplyOnPublish(job, d23.diff, 'ADDITIVE');
    expect(job.templateVersion).toBe(1);

    job = migrateJob(job, fieldEvents, ruleEvents);
    expect(job.templateVersion).toBe(2);

    const afterFirst = resolveLayout(
      [
        { version: 1, layout: v1 },
        { version: 2, layout: v2 },
        { version: 3, layout: v3 },
      ],
      job.templateVersion,
      fieldEvents,
      job.appliedFieldEventIds
    );
    expect(afterFirst.workflowRules?.map((rule) => rule.id)).toEqual(['r1']);
    expect(afterFirst.workflowRules?.[0].nodes[2].type).toBe('action-hide');

    job = migrateJob(job, fieldEvents, ruleEvents);
    expect(job.templateVersion).toBe(3);
    const afterSecond = resolveLayout(
      [
        { version: 1, layout: v1 },
        { version: 2, layout: v2 },
        { version: 3, layout: v3 },
      ],
      job.templateVersion,
      fieldEvents,
      job.appliedFieldEventIds
    );
    expect(afterSecond.workflowRules?.map((rule) => rule.id)).toEqual(['r1', 'r2']);
  });

  it('migrateJobFully catches up through the barrier without skipping', () => {
    const v1 = layout(
      [text('title', 'Title'), text('taskType', 'Task type'), text('vendor', 'Vendor')],
      [showRule('r1', 'taskType', 'vendor')]
    );
    const v2 = layout(
      [text('title', 'Campaign title'), text('taskType', 'Task type'), text('vendor', 'Vendor')],
      [hideRule('r1', 'taskType', 'vendor')]
    );
    const extra = showRule('r2', 'taskType', 'vendor', 'print');
    const v3 = layout(
      [text('title', 'Campaign title'), text('taskType', 'Task type'), text('vendor', 'Vendor')],
      [hideRule('r1', 'taskType', 'vendor'), extra]
    );

    const d12 = diffPublish(v1, v2, { fromVersion: 1, toVersion: 2, idFactory: ids() });
    const d23 = diffPublish(v2, v3, { fromVersion: 2, toVersion: 3, idFactory: ids() });
    expect(d12.ok && d23.ok).toBe(true);
    if (!d12.ok || !d23.ok) return;

    const fieldEvents = [...d12.diff.fieldEvents, ...d23.diff.fieldEvents];
    const ruleEvents = [d12.diff.ruleEvent!, d23.diff.ruleEvent!];

    let job = autoApplyOnPublish(
      { templateVersion: 1, appliedFieldEventIds: [], appliedRuleEventIds: [] },
      d12.diff,
      'ADDITIVE'
    );
    job = autoApplyOnPublish(job, d23.diff, 'ADDITIVE');
    expect(job.templateVersion).toBe(1);

    job = migrateJobFully(job, fieldEvents, ruleEvents);
    expect(job.templateVersion).toBe(3);
    expect(canMigrateJob(job, fieldEvents, ruleEvents)).toBe(false);
  });
});

describe('apply invariants', () => {
  it('T13 is idempotent for the same event id', () => {
    const event = {
      id: 'fe1',
      fieldId: 'title',
      fromVersion: 1,
      toVersion: 2,
      class: 'COSMETIC' as const,
      patch: { kind: 'upsert' as const, changes: { label: 'Campaign title' } },
    };
    const once = applyLayoutEvents({ appliedFieldEventIds: [] }, [event]);
    const twice = applyLayoutEvents(once, [event]);
    expect(twice.appliedFieldEventIds).toEqual(['fe1']);
  });

  it('6a NONE does not auto-apply cosmetic layout', () => {
    const prev = layout([text('title', 'Title')]);
    const next = layout([text('title', 'Campaign title')]);
    const result = diffPublish(prev, next, {
      fromVersion: 1,
      toVersion: 2,
      idFactory: ids(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const job = autoApplyOnPublish(
      { templateVersion: 1, appliedFieldEventIds: [] },
      result.diff,
      'NONE'
    );
    expect(job.appliedFieldEventIds).toEqual([]);
    const resolved = resolveLayout(
      [{ version: 1, layout: prev }],
      1,
      result.diff.fieldEvents,
      job.appliedFieldEventIds
    );
    expect(resolved.rows[0].fields[0].label).toBe('Title');
  });

  it('rolls back a cosmetic event without new data', () => {
    const prev = layout([text('title', 'Title')]);
    const next = layout([text('title', 'Campaign title')]);
    const result = diffPublish(prev, next, {
      fromVersion: 1,
      toVersion: 2,
      idFactory: ids(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const applied = autoApplyOnPublish(
      { templateVersion: 1, appliedFieldEventIds: [] },
      result.diff,
      'ADDITIVE'
    );
    const rolled = unapplyLayoutEvent(applied, result.diff.fieldEvents[0].id);
    const resolved = resolveLayout(
      [{ version: 1, layout: prev }],
      1,
      result.diff.fieldEvents,
      rolled.appliedFieldEventIds
    );
    expect(resolved.rows[0].fields[0].label).toBe('Title');
  });

  it('optimistic lock: applyBehavior is a no-op when the pin does not match', () => {
    const event = {
      id: 're1',
      fromVersion: 2,
      toVersion: 3,
      class: 'SAFE' as const,
    };
    const job = applyBehaviorEvent({ templateVersion: 1, appliedRuleEventIds: [] }, event);
    expect(job.templateVersion).toBe(1);
    expect(job.appliedRuleEventIds).toEqual([]);
  });

  it('SAFE behavior auto-applies only when pin matches fromVersion', () => {
    const event = {
      id: 're1',
      fromVersion: 1,
      toVersion: 2,
      class: 'SAFE' as const,
    };
    const job = autoApplyOnPublish(
      { templateVersion: 1, appliedRuleEventIds: [] },
      { fieldEvents: [], ruleEvent: event },
      'ADDITIVE'
    );
    expect(job.templateVersion).toBe(2);

    const blocked = autoApplyOnPublish(
      { templateVersion: 1, appliedRuleEventIds: [] },
      { fieldEvents: [], ruleEvent: { ...event, class: 'BREAKING' } },
      'ADDITIVE'
    );
    expect(blocked.templateVersion).toBe(1);
  });

  it('COSMETIC policy auto-applies labels but not new fields', () => {
    const prev = layout([text('title', 'Title')]);
    const next = layout([
      text('title', 'Campaign title'),
      text('notes', 'Notes'),
    ]);
    const result = diffPublish(prev, next, {
      fromVersion: 1,
      toVersion: 2,
      idFactory: ids(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const cosmetic = result.diff.fieldEvents.find((event) => event.class === 'COSMETIC')!;
    const additive = result.diff.fieldEvents.find((event) => event.class === 'ADDITIVE')!;
    expect(layoutEventAutoApplies(cosmetic, 'COSMETIC')).toBe(true);
    expect(layoutEventAutoApplies(additive, 'COSMETIC')).toBe(false);

    const job = autoApplyOnPublish(
      { templateVersion: 1, appliedFieldEventIds: [] },
      result.diff,
      'COSMETIC'
    );
    expect(job.appliedFieldEventIds).toEqual([cosmetic.id]);
  });
});
