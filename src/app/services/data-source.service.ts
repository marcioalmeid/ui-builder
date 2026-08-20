import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiDataSource, RadioOption } from '../models/field';

export interface FetchOptionsResult {
  options: RadioOption[];
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DataSourceService {
  private http = inject(HttpClient);
  private cache = new Map<string, RadioOption[]>();

  /** Serves the same catalog JSON the mock API would, so `ng serve` works without :3001 */
  private static readonly API_STATIC_FALLBACK: Record<string, string> = {
    '/api/users': '/catalog/users.json',
    '/api/task-types': '/catalog/task-types.json',
    '/api/platforms': '/catalog/platforms.json',
    '/api/request-types': '/catalog/request-types.json',
    '/api/vendors': '/catalog/vendors.json',
    '/api/budget-line-items': '/catalog/budget-line-items.json',
  };

  fetchOptions(source: ApiDataSource, bypassCache = false): Observable<FetchOptionsResult> {
    const cacheKey = this.getCacheKey(source);

    if (!bypassCache && this.cache.has(cacheKey)) {
      return of({ options: this.cache.get(cacheKey)! });
    }

    const catalogUrl = this.getStaticFallbackUrl(source.url);
    const resolved = catalogUrl ? { ...source, url: catalogUrl } : source;

    return this.requestOptions(resolved).pipe(
      catchError((err) =>
        of({
          options: [],
          error: err?.message ?? 'Failed to fetch data from API',
        })
      )
    );
  }

  private requestOptions(source: ApiDataSource): Observable<FetchOptionsResult> {
    const request$ =
      source.method === 'POST'
        ? this.http.post<unknown>(source.url, source.params ?? {})
        : this.http.get<unknown>(source.url, { params: source.params });

    return request$.pipe(
      map((response) => {
        const items = this.extractItems(response, source.responsePath);
        const options = this.mapToOptions(items, source);
        this.cache.set(this.getCacheKey(source), options);
        return { options };
      })
    );
  }

  private getStaticFallbackUrl(url: string): string | undefined {
    const path = url.split('?')[0];
    return this.staticFallback[path];
  }

  private get staticFallback(): Record<string, string> {
    return DataSourceService.API_STATIC_FALLBACK;
  }

  private getCacheKey(source: ApiDataSource): string {
    return `${source.method ?? 'GET'}:${source.url}:${JSON.stringify(source.params ?? {})}`;
  }

  private extractItems(response: unknown, responsePath?: string): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (!responsePath) {
      throw new Error('API response is not an array. Set a response path (e.g. "data").');
    }

    let current: unknown = response;
    for (const segment of responsePath.split('.')) {
      if (current == null || typeof current !== 'object') {
        throw new Error(`Invalid response path: "${responsePath}"`);
      }
      current = (current as Record<string, unknown>)[segment];
    }

    if (!Array.isArray(current)) {
      throw new Error(`Response path "${responsePath}" did not resolve to an array.`);
    }

    return current;
  }

  private mapToOptions(items: unknown[], source: ApiDataSource): RadioOption[] {
    return items.map((item) => {
      if (item === null || item === undefined) {
        return { label: '', value: '' };
      }

      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        const value = String(item);
        return { label: value, value };
      }

      const record = item as Record<string, unknown>;
      return {
        label: String(this.getNestedValue(record, source.labelKey) ?? ''),
        value: String(this.getNestedValue(record, source.valueKey) ?? ''),
      };
    });
  }

  private getNestedValue(record: Record<string, unknown>, path: string): unknown {
    if (!path) {
      return undefined;
    }

    return path.split('.').reduce<unknown>((current, key) => {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      return (current as Record<string, unknown>)[key];
    }, record);
  }
}
