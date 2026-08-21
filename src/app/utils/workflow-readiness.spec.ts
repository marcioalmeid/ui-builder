import { FormField } from '../models/field';
import { createDefaultWorkflowRule, WorkflowRule } from '../models/workflow-rule';
import {
  getFirstInvalidWorkflowIssue,
  getWorkflowRuleIssues,
} from './workflow-readiness';

function textField(id: string, label = 'Field'): FormField {
  return {
    id,
    type: 'text',
    label,
    icon: 'text_fields',
    required: false,
  } as FormField;
}

describe('workflow-readiness', () => {
  it('attaches nodeId to show/hide target issues', () => {
    const rule = createDefaultWorkflowRule('Incomplete show');
    const fields = [textField('f1')];
    const showNode = rule.nodes.find((node) => node.type === 'action-show')!;

    const issues = getWorkflowRuleIssues(rule, fields);
    const targetIssue = issues.find(
      (issue) => issue.message === 'Select a target field for the show/hide action'
    );

    expect(targetIssue?.nodeId).toBe(showNode.id);
    expect(targetIssue?.ruleId).toBe(rule.id);
  });

  it('returns the first invalid issue across enabled rules', () => {
    const good: WorkflowRule = {
      ...createDefaultWorkflowRule('Good'),
      nodes: [
        {
          id: 't1',
          type: 'trigger',
          position: { x: 0, y: 0 },
          data: { fieldId: 'f1' },
        },
        {
          id: 'c1',
          type: 'condition',
          position: { x: 220, y: 0 },
          data: { operator: 'equals', value: 'x' },
        },
        {
          id: 'a1',
          type: 'action-show',
          position: { x: 440, y: 0 },
          data: { targetFieldId: 'f1' },
        },
      ],
    };
    const bad = createDefaultWorkflowRule('Bad');
    const fields = [textField('f1')];

    const first = getFirstInvalidWorkflowIssue([good, bad], fields);
    expect(first?.ruleName).toBe('Bad');
    expect(first?.nodeId).toBeTruthy();
  });

  it('requires a catalog event on emit actions', () => {
    const rule: WorkflowRule = {
      ...createDefaultWorkflowRule('Emit'),
      nodes: [
        {
          id: 't1',
          type: 'trigger',
          position: { x: 0, y: 0 },
          data: { fieldId: 'f1' },
        },
        {
          id: 'e1',
          type: 'action-event',
          position: { x: 220, y: 0 },
          data: {},
        },
      ],
    };

    const issues = getWorkflowRuleIssues(rule, [textField('f1')]);
    expect(issues.some((issue) => issue.message === 'Select an event from the catalog')).toBe(
      true
    );
  });
});
