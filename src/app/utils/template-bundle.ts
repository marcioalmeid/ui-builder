import { TaskTemplate } from '../models/task-template';
import { normalizeTemplate } from './retroactivity';

export const TEMPLATE_BUNDLE_FORMAT = 'ui-builder-templates';
export const TEMPLATE_BUNDLE_VERSION = 1;

export interface TemplateBundle {
  format: typeof TEMPLATE_BUNDLE_FORMAT;
  version: number;
  exportedAt: number;
  activeTemplateId: string;
  templates: TaskTemplate[];
}

export type ParseTemplateBundleResult =
  | { success: true; bundle: TemplateBundle }
  | { success: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function looksLikeTemplate(value: unknown): value is TaskTemplate {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    isRecord(value['layout']) &&
    Array.isArray(value['layout']['rows'])
  );
}

/**
 * Build a portable JSON bundle of all templates for download/backup.
 */
export function buildTemplateBundle(
  templates: TaskTemplate[],
  activeTemplateId: string
): TemplateBundle {
  return {
    format: TEMPLATE_BUNDLE_FORMAT,
    version: TEMPLATE_BUNDLE_VERSION,
    exportedAt: Date.now(),
    activeTemplateId,
    templates: structuredClone(templates),
  };
}

export function serializeTemplateBundle(bundle: TemplateBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/**
 * Accepts our export format or a legacy PersistedState-shaped payload
 * (`{ templates, activeTemplateId }`).
 */
export function parseTemplateBundle(raw: unknown): ParseTemplateBundleResult {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return { success: false, error: 'Invalid JSON file.' };
    }
  }

  if (!isRecord(data)) {
    return { success: false, error: 'Expected a JSON object.' };
  }

  const format = data['format'];
  if (format !== undefined && format !== TEMPLATE_BUNDLE_FORMAT) {
    return {
      success: false,
      error: `Unknown export format "${typeof format === 'string' ? format : 'invalid'}".`,
    };
  }

  const templatesRaw = data['templates'];
  if (!Array.isArray(templatesRaw) || templatesRaw.length === 0) {
    return { success: false, error: 'File must contain at least one template.' };
  }

  if (!templatesRaw.every(looksLikeTemplate)) {
    return { success: false, error: 'One or more templates are invalid.' };
  }

  const templates = templatesRaw.map((t) => normalizeTemplate(t));
  const ids = new Set(templates.map((t) => t.id));
  if (ids.size !== templates.length) {
    return { success: false, error: 'Duplicate template ids in file.' };
  }

  let activeTemplateId =
    typeof data['activeTemplateId'] === 'string' ? data['activeTemplateId'] : '';
  if (!activeTemplateId || !ids.has(activeTemplateId)) {
    activeTemplateId = templates[0].id;
  }

  return {
    success: true,
    bundle: {
      format: TEMPLATE_BUNDLE_FORMAT,
      version:
        typeof data['version'] === 'number'
          ? data['version']
          : TEMPLATE_BUNDLE_VERSION,
      exportedAt:
        typeof data['exportedAt'] === 'number' ? data['exportedAt'] : Date.now(),
      activeTemplateId,
      templates,
    },
  };
}
