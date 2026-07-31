import { describe, expect, it } from 'vitest';
import { createNewTaskDemoTemplate } from '../catalog/demo-templates';
import { getAllFields } from './template-readiness';
import {
  getFieldVisibilityHint,
  getHiddenFieldHints,
  isFieldVisible,
} from './field-visibility';
import { buildInitialJobData } from './job-validation';
import { evaluateWorkflowRules } from './workflow-evaluation';

describe('field visibility with demo template', () => {
  const template = createNewTaskDemoTemplate();
  const fields = getAllFields(template.layout.rows);
  const rules = template.layout.workflowRules ?? [];
  const data = buildInitialJobData(fields);

  it('Title stays visible on first simulation', () => {
    const title = fields.find((field) => field.label === 'Title');
    expect(title).toBeDefined();
    expect(isFieldVisible(title!, data, rules)).toBe(true);
  });

  it('Title is not listed in hidden hints on first simulation', () => {
    const hints = getHiddenFieldHints(fields, data, rules);
    const titleHint = hints.find((item) => item.label === 'Title');
    expect(titleHint).toBeUndefined();
  });

  it('Budget is hidden until request type matches', () => {
    const budget = fields.find((field) => field.label === 'Budget');
    expect(budget).toBeDefined();
    expect(isFieldVisible(budget!, data, rules)).toBe(false);
    expect(getFieldVisibilityHint(budget!, data, fields, rules)).toBe(
      'Select "Request type" = "budget-change"'
    );
  });

  it('does not mark hide targets as hidden before their condition passes', () => {
    const title = fields.find((field) => field.label === 'Title')!;
    const requestType = fields.find((field) => field.label === 'Request type')!;
    const budgetRule = rules.find((rule) => rule.name.includes('Budget'))!;
    const corruptedRules = structuredClone(rules);
    const budgetRuleCopy = corruptedRules.find((rule) => rule.id === budgetRule.id)!;
    const hideNode = budgetRuleCopy.nodes.find((node) => node.type === 'action-show')!;
    hideNode.type = 'action-hide';
    hideNode.data.targetFieldId = title.id;

    expect(isFieldVisible(title, data, corruptedRules)).toBe(true);
    expect(getHiddenFieldHints(fields, data, corruptedRules)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Title' })])
    );

    const activeData = {
      ...data,
      [requestType.id]: 'budget-change',
    };
    expect(isFieldVisible(title, activeData, corruptedRules)).toBe(false);
    expect(getFieldVisibilityHint(title, activeData, fields, corruptedRules)).toContain(
      'Hidden because'
    );
    expect(
      evaluateWorkflowRules(corruptedRules, activeData).hiddenFieldIds.has(title.id)
    ).toBe(true);
  });

  it('does not claim a show rule hid an unrelated field', () => {
    const title = fields.find((field) => field.label === 'Title')!;
    const budgetRule = rules.find((rule) => rule.name.includes('Budget'))!;
    const corruptedRules = structuredClone(rules);
    const budgetRuleCopy = corruptedRules.find((rule) => rule.id === budgetRule.id)!;
    const showNode = budgetRuleCopy.nodes.find((node) => node.type === 'action-show')!;
    showNode.data.targetFieldId = title.id;

    expect(isFieldVisible(title, data, corruptedRules)).toBe(false);
    expect(getFieldVisibilityHint(title, data, fields, corruptedRules)).toBe(
      'Select "Request type" = "budget-change"'
    );
  });
});
