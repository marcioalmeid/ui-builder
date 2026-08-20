import { describe, expect, it } from 'vitest';
import { buildAllScenarioPacks, effectiveJobLayout } from './scenario-seeds';

describe('spike scenario seeds', () => {
  const packs = buildAllScenarioPacks();
  const byId = Object.fromEntries(packs.map((pack) => [pack.id, pack]));

  it('creates unique template ids for every scenario pack definition', () => {
    const ids = packs.map((pack) => pack.template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('pack definitions share advertising context (runtime installs one at a time)', () => {
    const contexts = new Set(packs.map((pack) => pack.template.context));
    expect(contexts).toEqual(new Set(['advertising']));
  });

  it('S0 is a publishable draft with no job', () => {
    const pack = byId['s0-draft'];
    expect(pack.template.status).toBe('draft');
    expect(pack.template.version).toBe(0);
    expect(pack.job).toBeNull();
  });

  it('S1 pins a job at v1', () => {
    const pack = byId['s1-baseline'];
    expect(pack.template.status).toBe('published');
    expect(pack.template.version).toBe(1);
    expect(pack.job?.templateVersion).toBe(1);
  });

  it('S2 T18: new title, pin stays, vendor still shown', () => {
    const pack = byId['s2-t18'];
    const layout = effectiveJobLayout(pack)!;
    const titleField = layout.rows
      .flatMap((row) => row.fields)
      .find((field) => field.type === 'text' && field.required);
    expect(titleField?.label).toBe('Campaign title');
    expect(pack.job?.templateVersion).toBe(1);
    const vendorId = pack.job ? Object.keys(pack.job.data).find((key) => pack.job!.data[key] === 'vendor-a') : '';
    const vendorAction = layout.workflowRules
      ?.flatMap((rule) => rule.nodes)
      .find((node) => node.data.targetFieldId === vendorId);
    expect(vendorAction?.type).toBe('action-show');
  });

  it('S3 barrier: published v3, job still pin 1', () => {
    const pack = byId['s3-barrier'];
    expect(pack.template.version).toBe(3);
    expect(pack.job?.templateVersion).toBe(1);
    expect(pack.ledger.ruleEvents.map((event) => event.class)).toEqual(['BREAKING', 'SAFE']);
  });

  it('S4 first migrate lands on v2 breaking, not v3', () => {
    const pack = byId['s4-migrated-v2'];
    expect(pack.job?.templateVersion).toBe(2);
    const layout = effectiveJobLayout(pack)!;
    const vendorId = Object.keys(pack.job!.data).find((key) => pack.job!.data[key] === 'vendor-a');
    const vendorAction = layout.workflowRules
      ?.flatMap((rule) => rule.nodes)
      .find((node) => node.data.targetFieldId === vendorId);
    expect(vendorAction?.type).toBe('action-hide');
    expect(layout.workflowRules?.some((rule) => rule.name.includes('Print Media'))).toBe(false);
  });

  it('S5 second migrate reaches v3 SAFE', () => {
    const pack = byId['s5-migrated-v3'];
    expect(pack.job?.templateVersion).toBe(3);
    const layout = effectiveJobLayout(pack)!;
    expect(layout.workflowRules?.some((rule) => rule.name.includes('Print Media'))).toBe(true);
  });

  it('S6 6a does not apply the new hint', () => {
    const pack = byId['s6-phase-6a'];
    expect(pack.template.riskPolicy).toBe('NONE');
    expect(pack.job?.appliedFieldEventIds).toEqual([]);
    const layout = effectiveJobLayout(pack)!;
    const title = layout.rows.flatMap((row) => row.fields).find((field) => field.required && field.type === 'text');
    expect(title?.hint).not.toBe('Hint from v2 (should not show yet)');
    expect(pack.ledger.fieldEvents.some((event) => event.class === 'COSMETIC')).toBe(true);
  });

  it('S7 6b shows the additive field and keeps pin 1', () => {
    const pack = byId['s7-additive'];
    expect(pack.job?.templateVersion).toBe(1);
    const layout = effectiveJobLayout(pack)!;
    expect(layout.rows.flatMap((row) => row.fields).some((field) => field.label === 'Internal notes')).toBe(
      true
    );
  });

  it('S8 trigger label stays old on the job', () => {
    const pack = byId['s8-trigger'];
    expect(pack.job?.templateVersion).toBe(1);
    expect(pack.ledger.fieldEvents).toHaveLength(0);
    expect(pack.ledger.ruleEvents[0]?.class).toBe('BREAKING');
    const layout = effectiveJobLayout(pack)!;
    const trigger = layout.rows
      .flatMap((row) => row.fields)
      .find((field) => field.label === 'Task type' || field.label === 'Work type');
    expect(trigger?.label).toBe('Task type');
  });
});
