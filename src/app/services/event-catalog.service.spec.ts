import { describe, expect, it } from 'vitest';
import { EventCatalogService } from './event-catalog.service';

describe('EventCatalogService', () => {
  const service = new EventCatalogService();

  it('filters by Digital Ads department', () => {
    const ids = service.getForContext('Digital Ads').map((item) => item.id);
    expect(ids).toContain('campaign.type.selected');
    expect(ids).toContain('budget.change.requested');
    expect(ids).toContain('field.updated');
  });

  it('resolves wire name from catalog id', () => {
    expect(service.resolveWireName('campaign.type.selected')).toBe('campaign.type.selected');
    expect(service.getByEventName('budget.change.requested')?.name).toBe(
      'Budget change requested'
    );
  });

  it('exposes email and api integration kinds', () => {
    expect(service.getById('notify.ops.email')?.kind).toBe('email');
    expect(service.getById('webhook.task.sync')?.kind).toBe('api');
    expect(service.getById('webhook.task.sync')?.api?.method).toBe('POST');
  });

  it('lists categories for a department', () => {
    const categories = service.getCategories('Digital Ads');
    expect(categories).toContain('Campaign');
    expect(categories).toContain('Budget');
    expect(categories).toContain('Integrations');
  });
});
