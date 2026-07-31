import { WorkflowConditionOperator } from './workflow-rule';

export interface WorkflowEventTrigger {
  fieldId: string;
  label: string;
  value: unknown;
}

export interface WorkflowEventCondition {
  operator: WorkflowConditionOperator;
  value: string;
}

/** Runtime event emitted when a workflow rule's condition chain succeeds. */
export interface WorkflowEmittedEvent {
  eventName: string;
  ruleId: string;
  ruleName: string;
  templateId?: string;
  templateVersion?: number;
  trigger: WorkflowEventTrigger;
  condition?: WorkflowEventCondition;
  /** Extra payload — phase 2 may add static keys / included fields. */
  payload: Record<string, unknown>;
  timestamp: string;
}
