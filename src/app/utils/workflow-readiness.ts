import { FormField } from '../models/field';
import { WorkflowRule } from '../models/workflow-rule';
import { EVENT_CATALOG } from '../catalog/event-catalog.items';
import { operatorNeedsValue } from './workflow-field-profile';

export interface WorkflowRuleIssue {
  ruleId: string;
  ruleName: string;
  /** Node that needs attention; omitted for rule-level issues (e.g. missing action). */
  nodeId?: string;
  message: string;
}

function hasResolvableEvent(node: WorkflowRule['nodes'][number]): boolean {
  const catalogId = node.data.eventCatalogId?.trim();
  if (catalogId && EVENT_CATALOG.some((item) => item.id === catalogId)) {
    return true;
  }
  return Boolean(node.data.eventName?.trim());
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
      nodeId: trigger?.id,
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
          nodeId: node.id,
          message: 'Condition value is missing',
        });
      }
    }

    if (node.type === 'action-show' || node.type === 'action-hide') {
      if (!node.data.targetFieldId || !fieldIds.has(node.data.targetFieldId)) {
        issues.push({
          ruleId: rule.id,
          ruleName: rule.name,
          nodeId: node.id,
          message: 'Select a target field for the show/hide action',
        });
      }
    }

    if (node.type === 'action-event' && !hasResolvableEvent(node)) {
      issues.push({
        ruleId: rule.id,
        ruleName: rule.name,
        nodeId: node.id,
        message: 'Select an event from the catalog',
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

export function getFirstInvalidWorkflowIssue(
  rules: WorkflowRule[],
  fields: FormField[]
): WorkflowRuleIssue | undefined {
  return getInvalidWorkflowRuleIssues(rules, fields)[0];
}

export function areAllWorkflowRulesValid(
  rules: WorkflowRule[],
  fields: FormField[]
): boolean {
  return getInvalidWorkflowRuleIssues(rules, fields).length === 0;
}
