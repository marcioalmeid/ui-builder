import { Injectable } from '@angular/core';
import {
  EVENT_CATALOG,
  EventCatalogItem,
  resolveEventName,
} from '../catalog/event-catalog.items';

@Injectable({
  providedIn: 'root',
})
export class EventCatalogService {
  private readonly items = EVENT_CATALOG;

  getAll(context?: string): EventCatalogItem[] {
    return this.getForContext(context);
  }

  getById(id: string): EventCatalogItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  getByEventName(eventName: string): EventCatalogItem | undefined {
    const needle = eventName.trim();
    if (!needle) return undefined;
    return this.items.find((item) => resolveEventName(item) === needle || item.id === needle);
  }

  getForContext(context?: string): EventCatalogItem[] {
    if (!context) {
      return this.items;
    }
    return this.items.filter(
      (item) => !item.contexts?.length || item.contexts.includes(context)
    );
  }

  getCategories(context?: string): string[] {
    return [...new Set(this.getForContext(context).map((item) => item.category))];
  }

  getByCategory(category: string, context?: string): EventCatalogItem[] {
    return this.getForContext(context).filter((item) => item.category === category);
  }

  getDisplayName(catalogId?: string, fallback?: string): string {
    if (!catalogId) {
      return fallback ?? 'Custom event';
    }
    const item = this.getById(catalogId);
    return item?.name ?? fallback ?? catalogId;
  }

  resolveWireName(catalogId?: string, fallbackEventName?: string): string {
    if (catalogId) {
      const item = this.getById(catalogId);
      if (item) return resolveEventName(item);
    }
    return fallbackEventName?.trim() ?? '';
  }
}
