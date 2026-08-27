import {
  JobSubmission,
  normalizeTaskStatus,
} from '../models/job-submission';

export const TASK_BUNDLE_FORMAT = 'ui-builder-tasks';
export const TASK_BUNDLE_VERSION = 1;

export interface TaskBundle {
  format: typeof TASK_BUNDLE_FORMAT;
  version: number;
  exportedAt: number;
  tasks: JobSubmission[];
}

export type ParseTaskBundleResult =
  | { success: true; bundle: TaskBundle }
  | { success: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeTask(value: unknown): JobSubmission | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value['id'] !== 'string' || !value['id']) return undefined;
  if (typeof value['templateId'] !== 'string' || !value['templateId']) return undefined;

  const data = isRecord(value['data']) ? (value['data'] as Record<string, unknown>) : {};
  const events = Array.isArray(value['events']) ? value['events'] : [];

  return {
    id: value['id'],
    templateId: value['templateId'],
    templateVersion:
      typeof value['templateVersion'] === 'number' ? value['templateVersion'] : undefined,
    templateName:
      typeof value['templateName'] === 'string' ? value['templateName'] : undefined,
    friendlyId: typeof value['friendlyId'] === 'string' ? value['friendlyId'] : undefined,
    data,
    events: events as JobSubmission['events'],
    submittedAt: typeof value['submittedAt'] === 'number' ? value['submittedAt'] : Date.now(),
    status: normalizeTaskStatus(value['status']),
    appliedFieldEventIds: Array.isArray(value['appliedFieldEventIds'])
      ? (value['appliedFieldEventIds'] as string[])
      : [],
    appliedRuleEventIds: Array.isArray(value['appliedRuleEventIds'])
      ? (value['appliedRuleEventIds'] as string[])
      : [],
  };
}

/** Build a portable JSON bundle of all tasks for download/backup. */
export function buildTaskBundle(tasks: JobSubmission[]): TaskBundle {
  return {
    format: TASK_BUNDLE_FORMAT,
    version: TASK_BUNDLE_VERSION,
    exportedAt: Date.now(),
    tasks: structuredClone(tasks),
  };
}

export function serializeTaskBundle(bundle: TaskBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/**
 * Accepts our export format or a bare array of task objects.
 */
export function parseTaskBundle(raw: unknown): ParseTaskBundleResult {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return { success: false, error: 'Invalid JSON file.' };
    }
  }

  if (Array.isArray(data)) {
    const tasks = data
      .map((item) => normalizeTask(item))
      .filter((task): task is JobSubmission => Boolean(task));
    if (tasks.length === 0) {
      return { success: false, error: 'No valid tasks found in the file.' };
    }
    return {
      success: true,
      bundle: {
        format: TASK_BUNDLE_FORMAT,
        version: TASK_BUNDLE_VERSION,
        exportedAt: Date.now(),
        tasks,
      },
    };
  }

  if (!isRecord(data)) {
    return { success: false, error: 'Expected a JSON object or array.' };
  }

  const format = data['format'];
  if (format !== undefined && format !== TASK_BUNDLE_FORMAT) {
    return {
      success: false,
      error: `Unknown export format "${typeof format === 'string' ? format : 'invalid'}".`,
    };
  }

  const tasksRaw = data['tasks'];
  if (!Array.isArray(tasksRaw)) {
    return { success: false, error: 'Missing "tasks" array.' };
  }

  const tasks = tasksRaw
    .map((item) => normalizeTask(item))
    .filter((task): task is JobSubmission => Boolean(task));

  if (tasks.length === 0) {
    return { success: false, error: 'No valid tasks found in the file.' };
  }

  return {
    success: true,
    bundle: {
      format: TASK_BUNDLE_FORMAT,
      version:
        typeof data['version'] === 'number' ? data['version'] : TASK_BUNDLE_VERSION,
      exportedAt:
        typeof data['exportedAt'] === 'number' ? data['exportedAt'] : Date.now(),
      tasks,
    },
  };
}
