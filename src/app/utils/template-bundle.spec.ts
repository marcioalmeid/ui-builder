import { describe, expect, it } from 'vitest';
import { createEmptyTemplate } from '../models/task-template';
import {
  TEMPLATE_BUNDLE_FORMAT,
  buildTemplateBundle,
  parseTemplateBundle,
  serializeTemplateBundle,
} from './template-bundle';

describe('template-bundle', () => {
  it('round-trips templates through serialize/parse', () => {
    const a = createEmptyTemplate('Alpha', ['print']);
    const b = createEmptyTemplate('Beta', ['sales']);
    const bundle = buildTemplateBundle([a, b], a.id);
    const parsed = parseTemplateBundle(serializeTemplateBundle(bundle));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.bundle.format).toBe(TEMPLATE_BUNDLE_FORMAT);
    expect(parsed.bundle.templates).toHaveLength(2);
    expect(parsed.bundle.activeTemplateId).toBe(a.id);
    expect(parsed.bundle.templates.map((t) => t.name)).toEqual(['Alpha', 'Beta']);
  });

  it('accepts legacy persisted-state shape without format field', () => {
    const template = createEmptyTemplate('Legacy', ['general']);
    const parsed = parseTemplateBundle({
      templates: [template],
      activeTemplateId: template.id,
      timestamp: Date.now(),
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.bundle.templates[0].name).toBe('Legacy');
  });

  it('falls back to first template when active id is missing', () => {
    const template = createEmptyTemplate('Only', []);
    const parsed = parseTemplateBundle({
      format: TEMPLATE_BUNDLE_FORMAT,
      version: 1,
      templates: [template],
      activeTemplateId: 'missing-id',
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.bundle.activeTemplateId).toBe(template.id);
  });

  it('rejects empty or invalid payloads', () => {
    expect(parseTemplateBundle('not-json').success).toBe(false);
    expect(parseTemplateBundle({ templates: [] }).success).toBe(false);
    expect(
      parseTemplateBundle({ format: 'other', templates: [{}] }).success
    ).toBe(false);
  });
});
