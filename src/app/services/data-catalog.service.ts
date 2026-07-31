import { Injectable } from '@angular/core';
import { DATA_CATALOG, DataCatalogItem } from '../catalog/data-catalog.items';
import { EntityFieldDefinition } from '../models/entity-field';

@Injectable({
  providedIn: 'root',
})
export class DataCatalogService {
  private readonly items = DATA_CATALOG;

  getAll(context?: string): DataCatalogItem[] {
    return this.getForContext(context);
  }

  getById(id: string): DataCatalogItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  getForContext(context?: string): DataCatalogItem[] {
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

  getByCategory(category: string, context?: string): DataCatalogItem[] {
    return this.getForContext(context).filter((item) => item.category === category);
  }

  getDisplayName(catalogId?: string, fallback?: string): string {
    if (!catalogId) {
      return fallback ?? 'Custom API';
    }
    return this.getById(catalogId)?.name ?? fallback ?? catalogId;
  }

  getEntityFields(catalogId: string): EntityFieldDefinition[] {
    return this.getById(catalogId)?.entityFields ?? [];
  }
}
