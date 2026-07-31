import { FormField } from '../models/field';
import { WorkflowRule } from '../models/workflow-rule';
import { operatorNeedsValue } from './workflow-field-profile';

export interface WorkflowRuleIssue {
  ruleId: string;
  ruleName: string;
  message: string;
}

export function getWorkflowRuleIssues(
  rule: WorkflowRule,
  fields: FormField[]
): WorkflowRuleIssue[] {
  const issues: WorkflowRuleIssue[] = [];
  const fieldIds = new Set(fields.map((field) => field.id));

  const trigger = rule.nodes.find((node) => node.type === 'trigger');
  if (!trigger?.data.fieldId || !fieldIds.has(trigger.data.fieldId)) {
    issues.push({
      ruleId: rule.id,
      ruleName: rule.name,
      message: 'Select a trigger field',
    });
  }

  const hasAction = rule.nodes.some(
    (node) =>
      node.type === 'action-show' ||
      node.type === 'action-hide' ||
      node.type === 'action-event'
  );
  if (!hasAction) {
    issues.push({
      ruleId: rule.id,
      ruleName: rule.name,
      message: 'Add at least one show, hide, or event action',
    });
  }

  for (const node of rule.nodes) {
    if (node.type === 'condition') {
      const operator = node.data.operator ?? 'equals';
      if (operatorNeedsValue(operator) && !String(node.data.value ?? '').trim()) {
        issues.push({
          ruleId: rule.id,
          ruleName: rule.name,
          message: 'Condition value is missing',
        });
      }
    }

    if (node.type === 'action-show' || node.type === 'action-hide') {
      if (!node.data.targetFieldId || !fieldIds.has(node.data.targetFieldId)) {
        issues.push({
          ruleId: rule.id,
          ruleName: rule.name,
          message: 'Select a target field for the show/hide action',
        });
      }
    }

    if (node.type === 'action-event' && !node.data.eventName?.trim()) {
      issues.push({
        ruleId: rule.id,
        ruleName: rule.name,
        message: 'Event name is required',
      });
    }
  }

  return issues;
}

export function getInvalidWorkflowRuleIssues(
  rules: WorkflowRule[],
  fields: FormField[]
): WorkflowRuleIssue[] {
  return rules
    .filter((rule) => rule.enabled)
    .flatMap((rule) => getWorkflowRuleIssues(rule, fields));
}

export function areAllWorkflowRulesValid(
  rules: WorkflowRule[],
  fields: FormField[]
): boolean {
  return getInvalidWorkflowRuleIssues(rules, fields).length === 0;
}
