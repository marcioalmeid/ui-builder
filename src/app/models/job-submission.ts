import { WorkflowEmittedEvent } from './workflow-event';

export interface JobSubmission {
  id: string;
  templateId: string;
  templateVersion?: number;
  templateName?: string;
  data: Record<string, unknown>;
  events: WorkflowEmittedEvent[];
  submittedAt: number;
  appliedFieldEventIds?: string[];
  appliedRuleEventIds?: string[];
}
