import { computed, effect, inject, Signal, signal } from '@angular/core';
import { FormField, RadioOption } from '../models/field';
import { DataSourceService } from '../services/data-source.service';

export interface DataBoundOptionsState {
  options: Signal<RadioOption[]>;
  loading: Signal<boolean>;
  error: Signal<string | null>;
}

function buildOptionsConfigKey(field: FormField): string {
  if (field.optionsSource !== 'api' || !field.dataSource?.url?.trim()) {
    return `static:${JSON.stringify(field.options ?? [])}`;
  }

  const ds = field.dataSource;
  return [
    'api',
    ds.url,
    ds.method ?? 'GET',
    ds.labelKey,
    ds.valueKey,
    ds.responsePath ?? '',
    JSON.stringify(ds.params ?? {}),
  ].join('|');
}

export function bindFieldOptions(field: Signal<FormField>): DataBoundOptionsState {
  const dataSourceService = inject(DataSourceService);
  const options = signal<RadioOption[]>([]);
  const loading = signal(false);
  const error = signal<string | null>(null);

  const configKey = computed(() => buildOptionsConfigKey(field()));

  effect((onCleanup) => {
    const currentField = field();
    const key = configKey();

    if (key.startsWith('static:')) {
      options.set(currentField.options ?? []);
      loading.set(false);
      error.set(null);
      return;
    }

    const source = currentField.dataSource;
    if (!source) {
      options.set(currentField.options ?? []);
      return;
    }

    loading.set(true);
    error.set(null);

    const subscription = dataSourceService.fetchOptions(source).subscribe({
      next: ({ options: fetchedOptions, error: fetchError }) => {
        loading.set(false);
        if (fetchError) {
          error.set(fetchError);
          options.set(currentField.options ?? []);
          return;
        }
        options.set(fetchedOptions);
      },
    });

    onCleanup(() => subscription.unsubscribe());
  });

  return {
    options: options.asReadonly(),
    loading: loading.asReadonly(),
    error: error.asReadonly(),
  };
}
