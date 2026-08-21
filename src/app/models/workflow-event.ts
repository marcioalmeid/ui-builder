import {
  EventApiDefaults,
  EventCatalogKind,
  EventEmailDefaults,
} from '../catalog/event-catalog.items';
import { WorkflowConditionOperator } from './workflow-rule';

/** Per-rule overrides for catalog email/api defaults. */
export interface WorkflowEventConfig {
  email?: EventEmailDefaults;
  api?: EventApiDefaults;
}

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
  /** Downstream intent — signal, email, or api. */
  kind: EventCatalogKind;
  ruleId: string;
  ruleName: string;
  templateId?: string;
  templateVersion?: number;
  trigger: WorkflowEventTrigger;
  condition?: WorkflowEventCondition;
  /**
   * Intent details for consumers:
   * - signal: optional included field values
   * - email: `{ email: { to, subject, body } }`
   * - api: `{ api: { url, method, body } }`
   */
  payload: Record<string, unknown>;
  timestamp: string;
}
