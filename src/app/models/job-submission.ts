import { WorkflowEmittedEvent } from './workflow-event';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];

export function normalizeTaskStatus(value: unknown): TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus) ? (value as TaskStatus) : 'todo';
}

export interface JobSubmission {
  id: string;
  templateId: string;
  templateVersion?: number;
  templateName?: string;
  data: Record<string, unknown>;
  events: WorkflowEmittedEvent[];
  submittedAt: number;
  status: TaskStatus;
  appliedFieldEventIds?: string[];
  appliedRuleEventIds?: string[];
}
